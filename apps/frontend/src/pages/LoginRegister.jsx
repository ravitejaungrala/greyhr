import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './LoginRegister.css';
import { Eye, EyeOff } from 'lucide-react';

const LoginRegister = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-slide carousel every 4 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev === 0 ? 1 : 0));
        }, 4000);
        return () => clearInterval(timer);
    }, []);

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
            if (response.ok && !data.error) {
                onLoginSuccess(data);
            } else {
                setMessage({ type: 'error', text: data.error || 'Login failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server failure' });
        }
        setLoading(false);
    };

    return (
        <div className="nz-login-page">
            {/* Top Brand Logo */}
            <header className="nz-login-header">
                <div className="nz-brand-logo">
                    <img className="nz-neuzen-icon" src="/icon (2).png" alt="NEUZENAI Logo" />
                    <span className="nz-neuzen-text">NEUZENAI</span>
                </div>
            </header>

            {/* Split Screen Container */}
            <main className="nz-login-main-container">
                {/* Left Side: Form */}
                <div className="nz-login-left-section">
                    <div className="nz-login-card">
                        {/* greytHR Brand Header */}
                        <div className="nz-greythr-logo">
                            <span className="nz-grey-text">greyt</span>
                            <span className="nz-hr-text">HR</span>
                        </div>

                        <h2 className="nz-login-welcome">Hello there! 👋</h2>

                        {message && (
                            <div className={`nz-login-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="nz-login-form">
                            <div className="nz-login-field">
                                <label className="nz-login-label">Login ID</label>
                                <input
                                    type="text"
                                    name="email"
                                    required
                                    value={loginData.email}
                                    onChange={handleInputChange}
                                    placeholder="Employee No"
                                    className="nz-login-input-field"
                                />
                            </div>

                            <div className="nz-login-field">
                                <label className="nz-login-label">Password</label>
                                <div className="nz-login-password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        value={loginData.password}
                                        onChange={handleInputChange}
                                        placeholder="Password"
                                        className="nz-login-input-field password-input"
                                    />
                                    <button
                                        type="button"
                                        className="nz-password-toggle-eye"
                                        onClick={() => setShowPassword(s => !s)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="nz-forgot-password-wrapper">
                                    <a href="#forgot" className="nz-forgot-link">Forgot password?</a>
                                </div>
                            </div>

                            <button type="submit" className="nz-login-btn" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Side: Carousel Banner */}
                <div className="nz-login-right-section">
                    <div className="nz-carousel-container">
                        <div className="nz-carousel-image-frame">
                            <img
                                src={currentSlide === 0 ? "/login1.png" : "/login2.png"}
                                alt="greytHR NAVOS Banner"
                                className="nz-carousel-image"
                            />
                        </div>

                        <div className="nz-carousel-caption">
                            <h3 className="nz-carousel-title">
                                {currentSlide === 0 ? "greytHR NAVOS!" : "Simplify HR tasks!"}
                            </h3>
                            <p className="nz-carousel-subtitle">
                                {currentSlide === 0 ? "Register Now!" : "Speed up tasks with Agentic AI"}
                            </p>
                        </div>

                        <div className="nz-carousel-indicators">
                            <button
                                type="button"
                                className={`nz-carousel-dot-btn ${currentSlide === 0 ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(0)}
                                aria-label="Slide 1"
                            />
                            <button
                                type="button"
                                className={`nz-carousel-dot-btn ${currentSlide === 1 ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(1)}
                                aria-label="Slide 2"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <footer className="nz-login-footer">
                <p className="nz-footer-text">
                    © Greytip Software Pvt.Ltd | <a href="#privacy">Privacy Policy</a> | <a href="#terms">Terms of Service</a>
                </p>
            </footer>
        </div>
    );
};

export default LoginRegister;
