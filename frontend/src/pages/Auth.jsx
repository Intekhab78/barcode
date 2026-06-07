import { useState } from 'react';
import { motion } from 'framer-motion';
import { api, getApiBaseUrl } from '../utils/config';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', phone: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
            const resolvedUrl = await getApiBaseUrl(); // pehle URL resolve karo
            const res = await api.post(endpoint, formData, {
                baseURL: resolvedUrl
            });
            localStorage.setItem('token', res.data.token);
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Auth failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass"
                style={{ width: '90%', maxWidth: '400px', padding: '2.5rem' }}
            >
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                placeholder="Username"
                                required
                                style={inputStyle}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Phone"
                                required
                                style={inputStyle}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        required
                        style={inputStyle}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        required
                        style={inputStyle}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <span
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </span>
                </p>
            </motion.div>
        </div>
    );
};

const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    color: 'white',
    outline: 'none'
};

export default Auth;
