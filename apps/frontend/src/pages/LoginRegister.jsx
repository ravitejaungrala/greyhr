import React, { useState } from 'react';
import { API_URL } from '../config';
import './LoginRegister.css';
import {
    Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2
} from 'lucide-react';

const LoginRegister = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLoginData(p => ({ ...p, [name]: value }));
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginData.email, password: loginData.password })
            });
            const data = await response.json();
            if (response.ok && !data.error) onLoginSuccess(data);
            else setMessage({ type: 'error', text: data.error || 'Login failed' });
        } catch (err) { setMessage({ type: 'error', text: 'Server failure' }); }
        setLoading(false);
    };

    return (
        <div className="nz-auth-shell">
            <main className="nz-auth-main">
                <div className="nz-auth-form-wrap">
                    {/* Brand mark above the card */}
                    <div className="nz-form-brand">
                        <div className="nz-brand-logo-icon">
                            <img src="/icon (2).png" alt="NeuzenAI" />
                        </div>
                        <div>
                            <div className="nz-form-brand-name">NeuzenAI</div>
                            <div className="nz-form-brand-sub">HRMS</div>
                        </div>
                    </div>

                    <div className="nz-form-card">
                        <div className="nz-form-header">
                            <h2 className="nz-form-title">Sign in</h2>
                            <p className="nz-form-sub">Use your work email to continue.</p>
                        </div>

                        {message && (
                            <div className={`nz-form-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="nz-form">
                            <div className="nz-input-group">
                                <label>Email Address</label>
                                <div className="nz-input-wrapper">
                                    <Mail className="nz-field-icon" size={17} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={loginData.email}
                                        onChange={handleInputChange}
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="nz-input-group">
                                <div className="nz-label-row">
                                    <label>Password</label>
                                    <button type="button" className="nz-forgot-link">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="nz-input-wrapper has-toggle">
                                    <Lock className="nz-field-icon" size={17} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        value={loginData.password}
                                        onChange={handleInputChange}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="nz-password-toggle"
                                        onClick={() => setShowPassword(s => !s)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <label className="nz-remember">
                                <input type="checkbox" />
                                <span className="nz-remember-mark"><CheckCircle2 size={11} /></span>
                                <span>Keep me signed in for 7 days</span>
                            </label>

                            <button type="submit" className="nz-submit-btn" disabled={loading}>
                                {loading ? (
                                    <span className="nz-loading">
                                        <span className="nz-spinner" /> Signing you in…
                                    </span>
                                ) : (
                                    <>
                                        Sign In <ArrowRight size={17} className="nz-btn-arrow" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="nz-form-footer">
                            <span>New to NeuzenAI?</span>
                            <a href="#contact">Contact HR for account setup →</a>
                        </div>
                    </div>

                    {/* Bottom helper row */}
                    <div className="nz-form-bottom-row">
                        <span>© {new Date().getFullYear()} NeuzenAI IT Solutions Pvt Ltd</span>
                        <span className="nz-form-bottom-links">
                            <a href="#privacy">Privacy</a>
                            <span>·</span>
                            <a href="#terms">Terms</a>
                            <span>·</span>
                            <a href="#help">Help</a>
                        </span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginRegister;
