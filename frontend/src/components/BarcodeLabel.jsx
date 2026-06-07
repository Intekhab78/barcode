import React from 'react';
import { API_BASE_URL } from '../utils/config';

const BarcodeLabel = ({ item }) => {
    if (!item) return null;

    const hasOffer = item.offerPrice && item.offerPrice > 0;
    const isComboOrPack = (item.description || '').toLowerCase().includes('pack') || 
                         (item.description || '').toLowerCase().includes('set');

    return (
        <div 
            id={`label-${item._id}`}
            style={{ 
                width: '50mm', 
                height: '25mm', 
                background: 'white',
                color: 'black',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '2mm',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                overflow: 'hidden'
            }}
        >
            <div style={{ fontWeight: 'bold', fontSize: '7px', textAlign: 'center', marginBottom: '1mm' }}>
                {item.description}
            </div>

            <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {item.barcodePath && (
                    <img
                        src={`${API_BASE_URL}/${item.barcodePath}`}
                        alt="barcode"
                        style={{ width: '100%', height: 'auto', maxHeight: '12mm' }}
                    />
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1mm' }}>
                {hasOffer ? (
                    <div>
                        <span style={{ textDecoration: 'line-through', color: '#666', marginRight: '4px' }}>
                            ₹{item.price}
                        </span>
                        <span style={{ fontWeight: 'bold', color: 'black' }}>
                            ₹{item.offerPrice}
                        </span>
                    </div>
                ) : (
                    <div style={{ fontWeight: 'bold' }}>₹{item.price}</div>
                )}
            </div>

            <div style={{ fontSize: '6px', display: 'flex', justifyContent: 'space-between', marginTop: '1mm' }}>
                <span>Size: {item.size || 'N/A'}</span>
                <span>Color: {item.color || 'N/A'}</span>
            </div>
        </div>
    );
};

export default BarcodeLabel;
