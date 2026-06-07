import { useState, useEffect } from 'react';
import { Upload, LogOut, Printer } from 'lucide-react';
import BarcodeLabel from '../components/BarcodeLabel';
import { generatePDF } from '../utils/pdf';
import { api, getApiBaseUrl } from '../utils/config';

const Dashboard = () => {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [baseUrl, setBaseUrl] = useState('http://localhost:5011');

    useEffect(() => {
        getApiBaseUrl().then(url => {
            setBaseUrl(url);
            fetchItems(url); // URL resolve hone ke baad hi fetch karo
        });
    }, []);

    const fetchItems = async (resolvedUrl) => {
        try {
            // URL pass karo ya api instance use karo (interceptor ensure karega)
            const res = await api.get('/api/items', {
                baseURL: resolvedUrl, // explicit URL taake interceptor pe depend na ho
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            // Safety check: ensure response is array
            const data = Array.isArray(res.data) ? res.data : [];
            setItems(data);
            console.log(`DEBUG: Items fetched at ${new Date().toLocaleTimeString()}:`, data);
        } catch (err) {
            console.error('Failed to fetch items', err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('csv', file);

        try {
            const res = await api.post('/api/items/upload', formData, {
                baseURL: baseUrl, // resolved URL use karo
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': localStorage.getItem('token')
                }
            });
            alert('Upload Successful! Refreshing your items...');
            fetchItems(baseUrl); // baseUrl pass karo
        } catch (err) {
            console.error('Upload Error Details:', err.response?.data || err);

            if (err.response?.status === 401) {
                alert('Session expired. Please logout and login again.');
                return;
            }

            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Upload failed - check server connection';
            alert(`Error: ${errorMsg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleSelect = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(item => item._id)));
        }
    };

    const handlePrint = async () => {
        const itemsToPrint = selectedItems.size > 0
            ? items.filter(item => selectedItems.has(item._id))
            : items;

        setIsGenerating(true);
        await generatePDF(itemsToPrint);
        setIsGenerating(false);
    };

    return (
        <div className="dashboard-container" style={{ padding: '2rem' }}>
            <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 className="title-gradient" style={{ fontWeight: 800 }}>LabelPro</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Barcode Generation & Inventory Management</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn-primary"
                        style={{ background: selectedItems.size > 0 ? 'var(--primary)' : 'var(--accent)' }}
                        onClick={handlePrint}
                        disabled={isGenerating || items.length === 0}
                    >
                        <Printer size={18} />
                        <span className="btn-text">{isGenerating ? 'Generating...' : selectedItems.size > 0 ? `Print (${selectedItems.size})` : 'Print All'}</span>
                    </button>
                    <label className="btn-primary" style={{ cursor: 'pointer' }}>
                        <Upload size={18} />
                        <span className="btn-text">{uploading ? 'Uploading...' : 'Upload'}</span>
                        <input type="file" accept=".csv" onChange={handleFileUpload} hidden disabled={uploading} />
                    </label>
                    <button className="btn-primary" style={{ background: 'var(--card-bg)' }} onClick={() => {
                        localStorage.removeItem('token');
                        window.location.reload();
                    }}>
                        <LogOut size={18} />
                        <span className="btn-text">Logout</span>
                    </button>
                </div>
            </header>

            <main>
                {loading ? (
                    <p>Loading items...</p>
                ) : (
                    <>
                        <div className="glass table-responsive" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={items.length > 0 && selectedItems.size === items.length}
                                                onChange={handleSelectAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ padding: '1rem' }}>UPC</th>
                                        <th style={{ padding: '1rem' }}>Description</th>
                                        <th style={{ padding: '1rem' }}>MRP</th>
                                        <th style={{ padding: '1rem' }}>Offer</th>
                                        <th style={{ padding: '1rem' }}>Size/Color</th>
                                        <th style={{ padding: '1rem' }}>Stock</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Preview</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item._id} style={{ borderBottom: '1px solid var(--border)', background: selectedItems.has(item._id) ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item._id)}
                                                    onChange={() => handleToggleSelect(item._id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>{item.upc}</td>
                                            <td style={{ padding: '1rem' }}>{item.description}</td>
                                            <td style={{ padding: '1rem' }}>₹{item.price}</td>
                                            <td style={{ padding: '1rem' }}>{item.offerPrice ? `₹${item.offerPrice}` : '-'}</td>
                                            <td style={{ padding: '1rem' }}>{item.size} / {item.color}</td>
                                            <td style={{ padding: '1rem' }}>{item.stock !== undefined ? item.stock : 'N/A'}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {item.barcodePath && <img src={`${baseUrl}/${item.barcodePath}`} alt="barcode" style={{ height: '30px' }} />}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{
                                                        padding: '0.4rem',
                                                        minWidth: 'auto',
                                                        background: 'var(--accent)',
                                                        borderRadius: '0.4rem'
                                                    }}
                                                    onClick={() => generatePDF([item])}
                                                    title="Print Single Label"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Hidden render for labels used by PDF generator */}
                        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                            {items.map(item => (
                                <BarcodeLabel key={item._id} item={item} baseUrl={baseUrl} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
