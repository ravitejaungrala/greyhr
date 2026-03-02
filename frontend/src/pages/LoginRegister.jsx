import React, { useState, useRef } from 'react';

const LoginRegister = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [role, setRole] = useState('employee'); // 'employee' | 'admin'
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
                        password: formData.password,
                        role: role
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
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', overflowY: 'auto', padding: '2rem 0' }}>
            <div className="card glass-panel" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--border-color)', margin: 'auto' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '3rem' }}>🌊</span>
                    <h1 style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>AI Workforce OS</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {mode === 'login' ? 'Sign in to your account' : `Create your employee account`}
                    </p>
                </div>

                {mode === 'login' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface-color)', padding: '0.25rem', borderRadius: '8px' }}>
                        <button className={`btn ${role === 'employee' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: role === 'employee' ? '' : 'transparent' }} onClick={() => setRole('employee')}>Employee</button>
                        <button className={`btn ${role === 'admin' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: role === 'admin' ? '' : 'transparent' }} onClick={() => setRole('admin')}>Admin</button>
                    </div>
                )}

                {message && (
                    <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.type === 'error' ? '#EF4444' : 'var(--secondary)', fontSize: '0.875rem' }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Form fields */}
                    {mode === 'register' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Full Name</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Email Address</label>
                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder={role === 'admin' ? 'admin@dhanadurga.com' : 'employee@dhanadurga.com'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Password</label>
                        <input type="password" name="password" required value={formData.password} onChange={handleInputChange} placeholder="••••••••" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {mode === 'login' ? (
                        <p>New employee? <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('register'); setRole('employee'); }}>Register here</span></p>
                    ) : (
                        <p>Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('login'); setRole('employee'); }}>Log in here</span></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
