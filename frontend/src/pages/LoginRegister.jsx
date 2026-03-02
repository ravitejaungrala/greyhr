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
        if (mode === 'register' && step < 4) {
            setStep(step + 1);
            return;
        }

        setLoading(true);
        setMessage(null);
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

        if (mode === 'register') {
            if (!referenceFace || !bankPhoto || !eduCert) {
                setMessage({ type: 'error', text: 'Please complete all document & photo uploads.' });
                setLoading(false);
                return;
            }

            try {
                const payload = {
                    ...formData,
                    bank_photo_base64: bankPhoto,
                    education_cert_base64: eduCert,
                    image_base64: referenceFace
                };

                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    setMessage({ type: 'success', text: `Registered successfully. Pending admin approval.` });
                    setTimeout(() => {
                        setMode('login');
                        setStep(1);
                        setMessage(null);
                    }, 3000);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Registration failed' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Server error' });
            }
        } else {
            if (role === 'admin' && formData.email === 'admin@dhanadurga.com' && formData.password === 'Dhanadurga@2003') {
                onLoginSuccess({ role: 'admin', name: 'Admin', email: formData.email });
            } else if (role === 'employee') {
                onLoginSuccess({ role: 'employee', name: formData.email.split('@')[0], email: formData.email, id: "EMP123" });
            } else {
                setMessage({ type: 'error', text: 'Invalid login' });
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
                        {mode === 'login' ? 'Sign in to your account' : `Employee Registration - Step ${step} of 4`}
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

                    {/* LOGIN fields */}
                    {mode === 'login' && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Email</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder={role === 'admin' ? 'admin@dhanadurga.com' : 'employee@company.com'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Password</label>
                                <input type="password" name="password" required value={formData.password} onChange={handleInputChange} placeholder={role === 'admin' ? 'Dhanadurga@2003' : '••••••••'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} />
                            </div>
                        </>
                    )}

                    {/* REGISTER STEP 1: Basic & Employment */}
                    {mode === 'register' && step === 1 && (
                        <>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Full Name</label><input type="text" name="name" required value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Email</label><input type="email" name="email" required value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Password</label><input type="password" name="password" required value={formData.password} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Date of Birth</label><input type="date" name="dob" required value={formData.dob} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input type="checkbox" name="is_experienced" checked={formData.is_experienced} onChange={handleInputChange} />
                                <label style={{ fontSize: '0.875rem' }}>I have previous work experience</label>
                            </div>

                            {formData.is_experienced && (
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous Company</label><input type="text" name="prev_company" value={formData.prev_company} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: 'none', color: 'white' }} /></div>
                                    <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</label><input type="text" name="prev_role" value={formData.prev_role} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: 'none', color: 'white' }} /></div>
                                    <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Years of Experience</label><input type="number" name="experience_years" value={formData.experience_years} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: 'none', color: 'white' }} /></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* REGISTER STEP 2: Education & Bank */}
                    {mode === 'register' && step === 2 && (
                        <>
                            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Education Details</h3>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Highest Degree (e.g., B.Tech, MBA)</label><input type="text" name="education_degree" required value={formData.education_degree} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Upload Degree Certificate (Image)</label><input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setEduCert)} style={{ width: '100%', padding: '0.5rem' }} required={!eduCert} /></div>
                            {eduCert && <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>✓ Certificate attached</div>}

                            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Bank Details</h3>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Account Number</label><input type="text" name="bank_account" required value={formData.bank_account} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>IFSC Code</label><input type="text" name="bank_ifsc" required value={formData.bank_ifsc} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'white' }} /></div>
                            <div><label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Upload Bank Passbook/Cheque Photo</label><input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setBankPhoto)} style={{ width: '100%', padding: '0.5rem' }} required={!bankPhoto} /></div>
                            {bankPhoto && <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>✓ Bank photo attached</div>}
                        </>
                    )}

                    {/* REGISTER STEP 3: Live Photo */}
                    {mode === 'register' && step === 3 && (
                        <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
                            <p style={{ fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>Live Employee Photo (Required for Attendance)</p>
                            {!referenceFace ? (
                                <>
                                    {streamActive ? (
                                        <div style={{ position: 'relative', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                                            <button type="button" onClick={captureFace} className="btn btn-primary" style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)' }}>Capture</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={startCamera} className="btn btn-secondary" style={{ width: '100%' }}>Open Camera</button>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <img src={referenceFace} alt="Ref" style={{ width: '150px', borderRadius: '8px', border: '2px solid var(--secondary)' }} />
                                    <button type="button" onClick={() => setReferenceFace(null)} className="btn btn-secondary" style={{ display: 'block', width: '100%', marginTop: '1rem', fontSize: '0.75rem' }}>Retake Photo</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTIONS */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        {mode === 'register' && step > 1 && (
                            <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.75rem' }} disabled={loading}>
                            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : (step < 3 ? 'Next' : 'Submit Application'))}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {mode === 'login' ? (
                        <p>New employee? <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('register'); setRole('employee'); setStep(1); }}>Register Onboarding Details</span></p>
                    ) : (
                        <p>Already registered? <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setMode('login'); setRole('employee'); }}>Log in here</span></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
