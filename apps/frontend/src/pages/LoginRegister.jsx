import React, { useState } from 'react';
import { API_URL } from '../config';
import './LoginRegister.css';
import { 
    Mail, Lock, User, ArrowRight, Calendar, Home, CreditCard, 
    Landmark, BookOpen, Briefcase, Upload, CheckCircle, Camera,
    Building, MapPin, Award, GraduationCap, ShieldAlert, FileCheck,
    UserCheck, ShieldCheck
} from 'lucide-react';

const LoginRegister = ({ onLoginSuccess }) => {
    // Core Workflow States
    const [mode, setMode] = useState('login'); 
    const [step, setStep] = useState(0); 
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [employeeId, setEmployeeId] = useState(null);

    // High-Fidelity Data Structure
    const [onboardingData, setOnboardingData] = useState({
        name: '', email: '', password: '', 
        full_name: '', dob: '', father_name: '', mother_name: '', siblings_details: '', 
        bank_name: '', account_number: '', ifsc_code: '', cif_number: '', bank_passbook_base64: '', 
        ug_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        inter_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        ssc_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        has_experience: false, experience_list: [], pf_number: '', uan_number: '', 
        passport_photo_base64: '' 
    });

    const handleFileB64 = (e, field, obj = null) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const b64 = reader.result;
            if (obj) setOnboardingData(p => ({ ...p, [obj]: { ...p[obj], [field]: b64 } }));
            else setOnboardingData(p => ({ ...p, [field]: b64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e, obj = null) => {
        const { name, value } = e.target;
        if (obj) setOnboardingData(p => ({ ...p, [obj]: { ...p[obj], [name]: value } }));
        else setOnboardingData(p => ({ ...p, [name]: value }));
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        if (mode === 'register') {
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: onboardingData.name, email: onboardingData.email, password: onboardingData.password })
                });
                const data = await response.json();
                if (response.ok && !data.error) {
                    setEmployeeId(data.employee_id);
                    setOnboardingData(p => ({ ...p, full_name: onboardingData.name }));
                    setStep(1); // Proceed to Classic Onboarding
                } else setMessage({ type: 'error', text: data.error || 'Registration failed' });
            } catch (err) { setMessage({ type: 'error', text: 'Server failure' }); }
        } else {
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: onboardingData.email, password: onboardingData.password })
                });
                const data = await response.json();
                if (response.ok && !data.error) {
                    if (data.status === 'onboarding_pending') {
                        setEmployeeId(data.employee_id);
                        setOnboardingData(p => ({ ...p, full_name: data.name }));
                        setStep(1); // Force onboarding for pre-created users
                    } else {
                        onLoginSuccess(data);
                    }
                }
                else setMessage({ type: 'error', text: data.error || 'Login failed' });
            } catch (err) { setMessage({ type: 'error', text: 'Server failure' }); }
        }
        setLoading(false);
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/employee/complete-onboarding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...onboardingData, employee_id: employeeId })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Onboarding completed successfully!' });
                setTimeout(() => window.location.reload(), 2500);
            } else setMessage({ type: 'error', text: 'Final submission failed' });
        } catch (err) { setMessage({ type: 'error', text: 'Connection error' }); }
        setLoading(false);
    };

    const ProgressBar = () => (
        <div className="classic-progress-bar">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`classic-segment ${step >= i ? 'active' : ''}`} />
            ))}
        </div>
    );

    return (
        <div className="login-centered-shell">
            {/* Classic Background Layer */}
            <div className="login-bg-media">
                <div className="bg-image-animate" />
                <div className="bg-overlay-gradient" />
            </div>

            <div className={`login-content-box ${step > 0 ? 'expanded' : ''}`}>
                <div className="login-card glass-panel animate-fade-in">
                    
                    {step === 0 ? (
                        <>
                            <div className="login-header">
                                <div className="login-logo-centered">
                                    <img src="/icon (2).png" alt="NeuzenAI Logo" />
                                </div>
                                <h2>{mode === 'login' ? 'Welcome Back' : 'Join NeuzenAI'}</h2>
                                <p>{mode === 'login' ? 'Sign in to access your HRMS dashboard' : 'Create your employee account below'}</p>
                            </div>

                            {message && <div className={`form-message ${message.type}`} style={{marginBottom: '1.5rem'}}>{message.text}</div>}

                            <form onSubmit={handleAuth} className="login-form">
                                {mode === 'register' && (
                                    <div className="input-group">
                                        <label>Full Name</label>
                                        <div className="input-wrapper">
                                            <User className="field-icon" size={18} />
                                            <input name="name" required value={onboardingData.name} onChange={handleInputChange} placeholder="John Doe" />
                                        </div>
                                    </div>
                                )}
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <div className="input-wrapper">
                                        <Mail className="field-icon" size={18} />
                                        <input type="email" name="email" required value={onboardingData.email} onChange={handleInputChange} placeholder="name@company.com" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <div className="label-row">
                                        <label>Password</label>
                                        {mode === 'login' && <button type="button" className="forgot-link" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Forgot?</button>}
                                    </div>
                                    <div className="input-wrapper">
                                        <Lock className="field-icon" size={18} />
                                        <input type="password" name="password" required value={onboardingData.password} onChange={handleInputChange} placeholder="••••••••" />
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
                                <p>{mode === 'login' ? (
                                    <>New to the platform? <button className="link-btn" onClick={() => setMode('register')}>Create account</button></>
                                ) : (
                                    <>Already have an account? <button className="link-btn" onClick={() => setMode('login')}>Sign in here</button></>
                                )}</p>
                            </div>
                        </>
                    ) : ( 
                        // PIXEL-PERFECT CLASSIC ONBOARDING
                        <div className="onboarding-flow">
                            <ProgressBar />
                            <div className="login-header" style={{textAlign: 'left', marginBottom: '2rem'}}>
                                <h3 style={{fontSize: '1.5rem', fontWeight: 800, color: '#000000', marginBottom: '0.25rem'}}>
                                    {step === 1 && 'Identity Check'}
                                    {step === 2 && 'Financial Setup'}
                                    {step === 3 && 'Academic Records'}
                                    {step === 4 && 'Career History'}
                                    {step === 5 && 'Verify Platform ID'}
                                </h3>
                                <p style={{fontSize: '0.85rem', opacity: 0.6}}>Step {step} of 5</p>
                            </div>

                            {step === 1 && (
                                <div className="form-section animate-fade-in">
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}}>
                                        <div className="input-group"><label>Target Name</label><div className="input-wrapper"><User className="field-icon" size={16}/><input name="full_name" value={onboardingData.full_name} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>Birth Date</label><div className="input-wrapper"><Calendar className="field-icon" size={16}/><input type="date" name="dob" value={onboardingData.dob} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>Father Name</label><div className="input-wrapper"><User className="field-icon" size={16}/><input name="father_name" value={onboardingData.father_name} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>Mother Name</label><div className="input-wrapper"><User className="field-icon" size={16}/><input name="mother_name" value={onboardingData.mother_name} onChange={handleInputChange} /></div></div>
                                        <div className="input-group" style={{gridColumn: 'span 2'}}><label>Siblings</label><div className="input-wrapper"><Home className="field-icon" size={16}/><input name="siblings_details" placeholder="e.g. 1 Brother" value={onboardingData.siblings_details} onChange={handleInputChange} /></div></div>
                                    </div>
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}><button className="btn-submit-premium" style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}} onClick={() => setStep(0)}>Cancel</button><button className="btn-submit-premium" style={{flex: 2}} onClick={() => setStep(2)}>Finance <ArrowRight size={18}/></button></div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="form-section">
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}}>
                                        <div className="input-group"><label>Bank Name</label><div className="input-wrapper"><Building className="field-icon" size={16}/><input name="bank_name" value={onboardingData.bank_name} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>Account No</label><div className="input-wrapper"><CreditCard className="field-icon" size={16}/><input name="account_number" value={onboardingData.account_number} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>IFSC</label><div className="input-wrapper"><MapPin className="field-icon" size={16}/><input name="ifsc_code" value={onboardingData.ifsc_code} onChange={handleInputChange} /></div></div>
                                        <div className="input-group"><label>CIF ID</label><div className="input-wrapper"><Landmark className="field-icon" size={16}/><input name="cif_number" value={onboardingData.cif_number} onChange={handleInputChange} /></div></div>
                                        <div style={{gridColumn: 'span 2'}}><div className="upload-classic" onClick={() => document.getElementById('pass-p').click()}><Upload size={20} style={{marginBottom: '0.5rem'}}/><div>{onboardingData.bank_passbook_base64 ? 'Passbook Attached' : 'Attach Bank Passbook'}</div><input id="pass-p" type="file" hidden onChange={e => handleFileB64(e, 'bank_passbook_base64')} /></div></div>
                                    </div>
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}><button className="btn-submit-premium" style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}} onClick={() => setStep(1)}>Back</button><button className="btn-submit-premium" style={{flex: 2}} onClick={() => setStep(3)}>Academic <ArrowRight size={18}/></button></div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="form-section">
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}}>
                                        <div style={{gridColumn: 'span 2', fontSize: '0.7rem', fontWeight: 800, color: '#ff4500', textTransform: 'uppercase'}}>Undergraduate Certification</div>
                                        <div className="input-group"><label>Institution</label><div className="input-wrapper"><GraduationCap className="field-icon" size={16}/><input name="institution_name" value={onboardingData.ug_details.institution_name} onChange={e => handleInputChange(e, 'ug_details')} /></div></div>
                                        <div className="input-group"><label>CGPA</label><input style={{background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', height: '54px', paddingLeft: '1.5rem', color: '#000000'}} name="cgpa" value={onboardingData.ug_details.cgpa} onChange={e => handleInputChange(e, 'ug_details')} /></div>
                                        <div style={{gridColumn: 'span 2'}}><div className="upload-classic" onClick={() => document.getElementById('ug-u').click()}><FileCheck size={18}/> <div>{onboardingData.ug_details.certificate_base64 ? 'Cert Verified' : 'Select Degree Certificate'}</div><input id="ug-u" type="file" hidden onChange={e => handleFileB64(e, 'certificate_base64', 'ug_details')} /></div></div>
                                    </div>
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}><button className="btn-submit-premium" style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}} onClick={() => setStep(2)}>Finance</button><button className="btn-submit-premium" style={{flex: 2}} onClick={() => setStep(4)}>Career <ArrowRight size={18}/></button></div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="form-section">
                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', marginBottom: '2rem', cursor: 'pointer'}} onClick={() => setOnboardingData(p => ({ ...p, has_experience: !p.has_experience }))}>
                                        <div style={{width: '20px', height: '20px', border: '2px solid #ff4500', borderRadius: '4px', background: onboardingData.has_experience ? '#ff4500' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{onboardingData.has_experience && <CheckCircle size={14} color="white"/>}</div>
                                        <span style={{fontWeight: 700}}>I have prior work history</span>
                                    </div>
                                    {onboardingData.has_experience && (
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}} className="animate-fade-in">
                                            <div className="input-group"><label>Prev Company</label><div className="input-wrapper"><Building className="field-icon" size={16}/><input onChange={e => {
                                                const l = [...onboardingData.experience_list]; l[0] = { ...l[0], company_name: e.target.value }; setOnboardingData(p => ({ ...p, experience_list: l }));
                                            }} /></div></div>
                                            <div className="input-group"><label>PF No.</label><div className="input-wrapper"><Award className="field-icon" size={16}/><input name="pf_number" value={onboardingData.pf_number} onChange={handleInputChange} /></div></div>
                                            <div style={{gridColumn: 'span 2'}} className="input-group"><label>UAN Detail</label><div className="input-wrapper"><ShieldAlert className="field-icon" size={18}/><input name="uan_number" value={onboardingData.uan_number} onChange={handleInputChange} /></div></div>
                                        </div>
                                    )}
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}><button className="btn-submit-premium" style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}} onClick={() => setStep(3)}>Academic</button><button className="btn-submit-premium" style={{flex: 2}} onClick={() => setStep(5)}>Finish <ArrowRight size={18}/></button></div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="form-section" style={{textAlign: 'center'}}>
                                    <div style={{width: '100px', height: '120px', margin: '0 auto 1.5rem', borderRadius: '12px', background: 'rgba(0,0,0,0.05)', border: '2px solid #ff4500', overflow: 'hidden'}}>
                                        {onboardingData.passport_photo_base64 ? <img src={onboardingData.passport_photo_base64} alt="Pass" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1}}><Camera size={40}/></div>}
                                    </div>
                                    <div className="upload-classic" onClick={() => document.getElementById('pass-up').click()}>Upload ID Photo<input id="pass-up" type="file" accept="image/*" hidden onChange={e => handleFileB64(e, 'passport_photo_base64')} /></div>
                                    <div style={{marginTop: '3rem', fontSize: '0.8rem', opacity: 0.4}}>Final submission will initiate HR review of all submitted documents.</div>
                                    <div style={{display: 'flex', gap: '1rem', marginTop: '2.5rem'}}><button className="btn-submit-premium" style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}} onClick={() => setStep(4)}>Back</button><button className="btn-submit-premium" style={{flex: 2}} disabled={loading} onClick={handleFinalSubmit}>{loading ? 'Establishing...' : 'Complete Registration'}</button></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginRegister;
