import React, { useState } from 'react';
import { API_URL } from '../config';
import './LoginRegister.css';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

const LoginRegister = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        const apiUrl = API_URL;

        if (mode === 'register') {
            try {
                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    setMessage({ type: 'success', text: `Registration successful! Please sign in.` });
                    setTimeout(() => {
                        setMode('login');
                        setFormData({ ...formData, password: '' });
                        setMessage(null);
                    }, 2000);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Registration failed' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Server error' });
            }
        } else {
            try {
                const response = await fetch(`${apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.password })
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
        <div className="login-centered-shell">
            {/* Animated Background Image Layer */}
            <div className="login-bg-media">
                <div className="bg-image-animate" />
                <div className="bg-overlay-gradient" />
            </div>

            {/* Interaction Card */}
            <div className="login-content-box">
                <div className="login-card glass-panel animate-fade-in">
                    <div className="login-header">
                        <div className="login-logo-centered">
                            <img src="/icon (2).png" alt="Dhanadurga Logo" />
                        </div>
                        <h2>{mode === 'login' ? 'Welcome Back' : 'Join Dhanadurga'}</h2>
                        <p>{mode === 'login' ? 'Sign in to access your HRMS dashboard' : 'Create your employee account below'}</p>
                    </div>

                    {message && (
                        <div className={`form-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        {mode === 'register' && (
                            <div className="input-group">
                                <label>Full Name</label>
                                <div className="input-wrapper">
                                    <User className="field-icon" size={18} />
                                    <input 
                                        type="text" 
                                        name="name" 
                                        placeholder="John Doe"
                                        required 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                    />
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label>Email Address</label>
                            <div className="input-wrapper">
                                <Mail className="field-icon" size={18} />
                                <input 
                                    type="email" 
                                    name="email" 
                                    placeholder="name@company.com"
                                    required 
                                    value={formData.email} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="label-row">
                                <label>Password</label>
                                {mode === 'login' && <a href="#forgot" className="forgot-link">Forgot?</a>}
                            </div>
                            <div className="input-wrapper">
                                <Lock className="field-icon" size={18} />
                                <input 
                                    type="password" 
                                    name="password" 
                                    placeholder="••••••••"
                                    required 
                                    value={formData.password} 
                                    onChange={handleInputChange} 
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-submit-premium" disabled={loading}>
                            {loading ? 'Authenticating...' : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Register Now'}
                                    <ArrowRight size={18} className="btn-icon" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            {mode === 'login' ? (
                                <>New to the platform? <button className="link-btn" onClick={() => setMode('register')}>Create account</button></>
                            ) : (
                                <>Already have an account? <button className="link-btn" onClick={() => setMode('login')}>Sign in here</button></>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
