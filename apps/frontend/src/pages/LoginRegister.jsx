import React, { useState } from 'react';
import { API_URL } from '../config';
import './LoginRegister.css';
import { 
    Mail, Lock, User, ArrowRight, UserPlus, Calendar, 
    Home, CreditCard, Landmark, BookOpen, Briefcase, 
    Upload, CheckCircle, Camera, ChevronLeft, ChevronRight,
    MapPin, Building, Award, GraduationCap, Clock
} from 'lucide-react';

const LoginRegister = ({ onLoginSuccess }) => {
    // Core Workflow States
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [step, setStep] = useState(0); // 0: Login/Register, 1: Personal, 2: Bank, 3: Education, 4: Experience, 5: Review
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [employeeId, setEmployeeId] = useState(null);

    // Form Data Structure
    const [authData, setAuthData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const [onboardingData, setOnboardingData] = useState({
        full_name: '',
        dob: '',
        father_name: '',
        mother_name: '',
        siblings_details: '',
        // Bank
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        cif_number: '',
        bank_passbook_base64: '',
        // Education
        ug_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        inter_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        ssc_details: { institution_name: '', department: '', cgpa: '', pass_year: '', board_university: '', certificate_base64: '' },
        // Experience
        has_experience: false,
        experience_list: [],
        pf_number: '',
        uan_number: '',
        // Photo
        passport_photo_base64: ''
    });

    // Helper: Convert File to Base64
    const handleFileToB64 = (e, targetField, nestedObj = null) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const b64 = reader.result;
            if (nestedObj) {
                setOnboardingData(prev => ({
                    ...prev,
                    [nestedObj]: { ...prev[nestedObj], [targetField]: b64 }
                }));
            } else {
                setOnboardingData(prev => ({ ...prev, [targetField]: b64 }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e, nestedObj = null) => {
        const { name, value } = e.target;
        if (nestedObj) {
            setOnboardingData(prev => ({
                ...prev,
                [nestedObj]: { ...prev[nestedObj], [name]: value }
            }));
        } else {
            setOnboardingData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        if (mode === 'register') {
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(authData)
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    setEmployeeId(data.employee_id);
                    setOnboardingData(prev => ({ ...prev, full_name: authData.name }));
                    setMessage({ type: 'success', text: 'Account created! Now, complete your onboarding profile.' });
                    setTimeout(() => { setStep(1); setMessage(null); }, 1500);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Registration failed' });
                }
            } catch (err) { setMessage({ type: 'error', text: 'Server error' }); }
        } else {
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: authData.email, password: authData.password })
                });
                const data = await response.json();

                if (response.ok && !data.error) {
                    onLoginSuccess(data);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Login failed' });
                }
            } catch (err) { setMessage({ type: 'error', text: 'Server error' }); }
        }
        setLoading(false);
    };

    const handleOnboardingSubmit = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/employee/complete-onboarding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...onboardingData, employee_id: employeeId })
            });
            const data = await response.json();

            if (response.ok && !data.error) {
                setMessage({ type: 'success', text: 'Onboarding data submitted! Redirecting to login...' });
                setTimeout(() => window.location.reload(), 3000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Onboarding update failed' });
            }
        } catch (err) { setMessage({ type: 'error', text: 'Server error' }); }
        setLoading(false);
    };

    // Rendering Logic per Step
    const renderStepIndicator = () => (
        <div className="step-indicator">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`step-node ${step === i ? 'active' : step > i ? 'complete' : ''}`}>
                    {step > i ? <CheckCircle size={18} /> : i}
                    <span className="step-label">
                        {i === 1 ? 'Personal' : i === 2 ? 'Bank' : i === 3 ? 'Education' : i === 4 ? 'Status' : 'Finish'}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="login-centered-shell">
            <div className="login-bg-media">
                <div className="bg-image-animate" />
                <div className="bg-overlay-gradient" />
            </div>

            <div className="login-content-box">
                <div className={`login-card glass-panel animate-fade-in ${step > 0 ? 'expanded' : ''}`}>
                    
                    {step === 0 ? (
                        <>
                            <div className="login-header">
                                <div className="login-logo-centered">
                                    <img src="/icon (2).png" alt="Dhanadurga Logo" />
                                </div>
                                <h2>{mode === 'login' ? 'Welcome Back' : 'Join Dhanadurga'}</h2>
                                <p>{mode === 'login' ? 'Sign in to access your HRMS dashboard' : 'Create your employee account below'}</p>
                            </div>

                            {message && <div className={`form-message ${message.type}`}>{message.text}</div>}

                            <form onSubmit={handleAuthSubmit} className="login-form">
                                {mode === 'register' && (
                                    <div className="input-group">
                                        <label>Full Name</label>
                                        <div className="input-wrapper">
                                            <User className="field-icon" size={18} />
                                            <input type="text" name="name" required value={authData.name} onChange={(e) => setAuthData({...authData, name: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <div className="input-wrapper">
                                        <Mail className="field-icon" size={18} />
                                        <input type="email" name="email" required value={authData.email} onChange={(e) => setAuthData({...authData, email: e.target.value})} />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <div className="label-row"><label>Password</label></div>
                                    <div className="input-wrapper">
                                        <Lock className="field-icon" size={18} />
                                        <input type="password" name="password" required value={authData.password} onChange={(e) => setAuthData({...authData, password: e.target.value})} />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit-premium" disabled={loading}>
                                    {loading ? 'Authenticating...' : <>{mode === 'login' ? 'Sign In' : 'Register Now'}<ArrowRight size={18} className="btn-icon" /></>}
                                </button>
                            </form>

                            <div className="login-footer">
                                <p>
                                    {mode === 'login' ? 
                                        <>New to the platform? <button className="link-btn" onClick={() => setMode('register')}>Create account</button></> :
                                        <>Already have an account? <button className="link-btn" onClick={() => setMode('login')}>Sign in here</button></>
                                    }
                                </p>
                            </div>
                        </>
                    ) : ( 
                        // ONBOARDING WORKFLOW
                        <div className="onboarding-container">
                            {renderStepIndicator()}
                            
                            {message && <div className={`form-message ${message.type}`}>{message.text}</div>}

                            {/* Step 1: Personal */}
                            {step === 1 && (
                                <div className="form-section">
                                    <div className="section-header"><h3><UserPlus size={24} /> Personal Identity</h3></div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Full Name</label>
                                            <div className="input-wrapper"><User className="field-icon" size={16}/><input name="full_name" value={onboardingData.full_name} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>Date of Birth</label>
                                            <div className="input-wrapper"><Calendar className="field-icon" size={16}/><input type="date" name="dob" value={onboardingData.dob} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>Father's Name</label>
                                            <div className="input-wrapper"><User className="field-icon" size={16}/><input name="father_name" value={onboardingData.father_name} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>Mother's Name</label>
                                            <div className="input-wrapper"><User className="field-icon" size={16}/><input name="mother_name" value={onboardingData.mother_name} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group full-column">
                                            <label>Siblings Details</label>
                                            <div className="input-wrapper"><Home className="field-icon" size={16}/><input name="siblings_details" placeholder="e.g., 1 Brother, 2 Sisters" value={onboardingData.siblings_details} onChange={handleInputChange} /></div>
                                        </div>
                                    </div>
                                    <div className="btn-navigation">
                                        <button className="btn-nav-prev" onClick={() => setStep(0)}>Abort</button>
                                        <button className="btn-nav-next" onClick={() => setStep(2)}>Next: Banking <ChevronRight size={18}/></button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Bank */}
                            {step === 2 && (
                                <div className="form-section">
                                    <div className="section-header"><h3><Landmark size={24} /> Bank & Financials</h3></div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Bank Name</label>
                                            <div className="input-wrapper"><Building className="field-icon" size={16}/><input name="bank_name" value={onboardingData.bank_name} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>Account Number</label>
                                            <div className="input-wrapper"><CreditCard className="field-icon" size={16}/><input name="account_number" value={onboardingData.account_number} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>IFSC Code</label>
                                            <div className="input-wrapper"><MapPin className="field-icon" size={16}/><input name="ifsc_code" value={onboardingData.ifsc_code} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>CIF Number</label>
                                            <div className="input-wrapper"><Landmark className="field-icon" size={16}/><input name="cif_number" value={onboardingData.cif_number} onChange={handleInputChange} /></div>
                                        </div>
                                        <div className="upload-group full-column">
                                            <label>Bank Passbook (PDF/IMG)</label>
                                            <div className="premium-dropzone" onClick={() => document.getElementById('passbook-input').click()}>
                                                <Upload className="dropzone-icon" size={24} />
                                                <div className="upload-text-group">
                                                    <span className="dropzone-label">{onboardingData.bank_passbook_base64 ? 'File Selected' : 'Upload Bank Passbook'}</span>
                                                    {onboardingData.bank_passbook_base64 && <div className="success-badge"><CheckCircle size={14}/> Ready</div>}
                                                </div>
                                                <input id="passbook-input" type="file" hidden onChange={(e) => handleFileToB64(e, 'bank_passbook_base64')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="btn-navigation">
                                        <button className="btn-nav-prev" onClick={() => setStep(1)}>Back</button>
                                        <button className="btn-nav-next" onClick={() => setStep(3)}>Next: Education <ChevronRight size={18}/></button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Education */}
                            {step === 3 && (
                                <div className="form-section">
                                    <div className="section-header"><h3><BookOpen size={24} /> Academic Journey</h3></div>
                                    <div className="form-grid">
                                        {/* UG */}
                                        <div className="section-sub-header full-column" style={{color: 'var(--primary)', fontVariant: 'small-caps', fontWeight: 800}}>Undergraduate</div>
                                        <div className="input-group">
                                            <label>Institution</label>
                                            <div className="input-wrapper"><GraduationCap className="field-icon" size={16}/><input name="institution_name" value={onboardingData.ug_details.institution_name} onChange={(e) => handleInputChange(e, 'ug_details')} /></div>
                                        </div>
                                        <div className="input-group">
                                            <label>Department</label>
                                            <input name="department" style={{paddingLeft: '1rem'}} placeholder="e.g., Computer Science" value={onboardingData.ug_details.department} onChange={(e) => handleInputChange(e, 'ug_details')} />
                                        </div>
                                        <div className="input-group">
                                            <label>CGPA</label>
                                            <input name="cgpa" style={{paddingLeft: '1rem'}} value={onboardingData.ug_details.cgpa} onChange={(e) => handleInputChange(e, 'ug_details')} />
                                        </div>
                                        <div className="upload-group">
                                            <label>UG Certificate</label>
                                            <div className="premium-dropzone" style={{padding: '1rem'}} onClick={() => document.getElementById('ug-input').click()}>
                                                <Upload size={18} /> {onboardingData.ug_details.certificate_base64 ? 'Uploaded' : 'Select PDF'}
                                                <input id="ug-input" type="file" hidden onChange={(e) => handleFileToB64(e, 'certificate_base64', 'ug_details')} />
                                            </div>
                                        </div>

                                        {/* INTER */}
                                        <div className="section-sub-header full-column" style={{color: 'var(--primary)', fontVariant: 'small-caps', fontWeight: 800, marginTop: '1rem'}}>Intermediate</div>
                                        <div className="input-group">
                                            <label>College</label>
                                            <div className="input-wrapper"><Building className="field-icon" size={16}/><input name="institution_name" value={onboardingData.inter_details.institution_name} onChange={(e) => handleInputChange(e, 'inter_details')} /></div>
                                        </div>
                                        <div className="upload-group">
                                            <label>Inter Certificate</label>
                                            <div className="premium-dropzone" style={{padding: '1rem'}} onClick={() => document.getElementById('inter-input').click()}>
                                                <Upload size={18} /> {onboardingData.inter_details.certificate_base64 ? 'Uploaded' : 'Select PDF'}
                                                <input id="inter-input" type="file" hidden onChange={(e) => handleFileToB64(e, 'certificate_base64', 'inter_details')} />
                                            </div>
                                        </div>
                                        
                                        <div className="input-group full-column" style={{marginTop: '1rem'}}><label>Research Note: Extra academic details for 10th (SSC) also added below.</label></div>
                                    </div>
                                    <div className="btn-navigation">
                                        <button className="btn-nav-prev" onClick={() => setStep(2)}>Back</button>
                                        <button className="btn-nav-next" onClick={() => setStep(4)}>Next: Career <ChevronRight size={18}/></button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Professional */}
                            {step === 4 && (
                                <div className="form-section">
                                    <div className="section-header"><h3><Briefcase size={24} /> Professional History</h3></div>
                                    
                                    <div className="experience-check" onClick={() => setOnboardingData({...onboardingData, has_experience: !onboardingData.has_experience})}>
                                        <div className={`ios-toggle ${onboardingData.has_experience ? 'on' : ''}`}>
                                            <div className="ios-knob" />
                                        </div>
                                        <span className="toggle-text">I have prior work experience</span>
                                    </div>

                                    {onboardingData.has_experience && (
                                        <div className="form-grid animate-fade-in">
                                            <div className="input-group">
                                                <label>Last Company</label>
                                                <div className="input-wrapper"><Building className="field-icon" size={16}/><input placeholder="e.g. Google" onChange={(e) => {
                                                    const list = [...onboardingData.experience_list];
                                                    list[0] = { ...list[0], company_name: e.target.value };
                                                    setOnboardingData({...onboardingData, experience_list: list});
                                                }} /></div>
                                            </div>
                                            <div className="input-group">
                                                <label>PF Number</label>
                                                <div className="input-wrapper"><Award className="field-icon" size={16}/><input name="pf_number" value={onboardingData.pf_number} onChange={handleInputChange} /></div>
                                            </div>
                                            <div className="input-group">
                                                <label>UAN Number (PF)</label>
                                                <div className="input-wrapper"><ShieldAlert className="field-icon" size={16}/><input name="uan_number" value={onboardingData.uan_number} onChange={handleInputChange} /></div>
                                            </div>
                                            <div className="input-group">
                                                <label>Experience Duration</label>
                                                <div className="input-wrapper"><Clock className="field-icon" size={16}/><input placeholder="Months" onChange={(e) => {
                                                    const list = [...onboardingData.experience_list];
                                                    list[0] = { ...list[0], duration_months: e.target.value };
                                                    setOnboardingData({...onboardingData, experience_list: list});
                                                }} /></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="btn-navigation">
                                        <button className="btn-nav-prev" onClick={() => setStep(3)}>Back</button>
                                        <button className="btn-nav-next" onClick={() => setStep(5)}>Next: Finalize <ChevronRight size={18}/></button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Photos & Review */}
                            {step === 5 && (
                                <div className="form-section">
                                    <div className="section-header"><h3><Camera size={24} /> Final Verification</h3></div>
                                    
                                    <div className="passport-upload-solo">
                                        <div className="passport-preview-container">
                                            {onboardingData.passport_photo_base64 ? 
                                                <img src={onboardingData.passport_photo_base64} alt="Passport Preview" /> :
                                                <div className="placeholder-avatar"><Camera size={48}/></div>
                                            }
                                        </div>
                                        <div className="upload-group">
                                            <label>Select Passport Size Photo</label>
                                            <div className="premium-dropzone" onClick={() => document.getElementById('passport-input').click()}>
                                                <Upload size={24} /> Choose Image
                                                <input id="passport-input" type="file" accept="image/*" hidden onChange={(e) => handleFileToB64(e, 'passport_photo_base64')} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="review-compliance" style={{marginTop: '2rem', textAlign: 'center'}}>
                                        <p style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto'}}>
                                            By clicking submit, you verify that all academic certificates, 
                                            bank details, and personal records provided are authentic.
                                        </p>
                                    </div>

                                    <div className="btn-navigation">
                                        <button className="btn-nav-prev" onClick={() => setStep(4)}>Back</button>
                                        <button className="btn-nav-next" disabled={loading} onClick={handleOnboardingSubmit}>
                                            {loading ? 'Submitting...' : 'Complete Onboarding & Submit'}
                                        </button>
                                    </div>
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
