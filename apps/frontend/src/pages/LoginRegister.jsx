import React, { useState, useRef } from 'react';
import './LoginRegister.css';
const LoginRegister = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [step, setStep] = useState(1);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        dob: '',
        is_experienced: false,
        prev_company: '',
        prev_role: '',
        experience_years: '',
        bank_account: '',
        bank_ifsc: '',
        education_degree: '',
    });

    const [bankPhoto, setBankPhoto] = useState(null);
    const [eduCert, setEduCert] = useState(null);
    const [referenceFace, setReferenceFace] = useState(null);

    // Registration Camera State
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileUpload = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStreamActive(true);
        } catch (err) {
            console.error("Camera access error:", err);
        }
    };

    const captureFace = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setReferenceFace(canvas.toDataURL('image/jpeg'));

        // Stop camera after capture
        const tracks = videoRef.current.srcObject?.getTracks();
        tracks?.forEach(track => track.stop());
        setStreamActive(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

        if (mode === 'register') {
            try {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                };

                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    setMessage({ type: 'success', text: `Step 1 complete! Please sign in to finish your profile.` });
                    setTimeout(() => {
                        setMode('login');
                        setFormData({ ...formData, password: '' });
                        setMessage(null);
                    }, 3000);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Registration failed' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Server error' });
            }
        } else {
            // LOGIN logic
            try {
                const response = await fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    })
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    onLoginSuccess(data);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Login failed' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Server error' });
            }
        }
        setLoading(false);
    };

    return (
        <div className="login-page-container">
            <div className="login-hero">
                <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <img src="/icon (2).png" alt="Logo" className="hero-icon-animate" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', backdropFilter: 'blur(10px)' }} />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: 1.2 }}>
                        Welcome to<br />HRMS
                    </h1>
                    <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>
                        Empowering your workforce with modern AI-driven tools. Streamline operations, foster engagement, and unlock potential.
                    </p>
                </div>
            </div>

            <div className="login-form-container">
                <div className="login-card">
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
                            <img src="/icon (2).png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem' }}>HRMS</h2>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {mode === 'login' ? 'Sign in to your account' : 'Create your employee account'}
                        </p>
                    </div>

                    {message && (
                        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 102, 194, 0.1)', color: message.type === 'error' ? '#EF4444' : 'var(--secondary)', fontSize: '0.875rem', fontWeight: 500, border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(10, 102, 194, 0.2)'}` }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <input type="text" name="name" className="input-field" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <input type="email" name="email" className="input-field" required value={formData.email} onChange={handleInputChange} placeholder="name@company.com" />
                        </div>

                        <div className="input-group" style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                                {mode === 'login' && <a href="#" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>}
                            </div>
                            <input type="password" name="password" className="input-field" required value={formData.password} onChange={handleInputChange} placeholder="••••••••" />
                        </div>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {mode === 'login' ? (
                            <p>New employee? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setMode('register')}>Register here</span></p>
                        ) : (
                            <p>Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setMode('login')}>Log in here</span></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
