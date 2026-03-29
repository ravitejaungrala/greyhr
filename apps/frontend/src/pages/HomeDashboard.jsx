import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

const HomeDashboard = ({ user, setUser }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        dob: '',
        is_experienced: false,
        prev_company: '',
        prev_role: '',
        experience_years: '',
        bank_account: '',
        bank_ifsc: '',
        bank_name: '',
        cif_number: '',
        pan_no: '',
        education_degree: '',
        pf_number: '',
    });


    const [bankPhoto, setBankPhoto] = useState(null);
    const [eduCert, setEduCert] = useState(null);
    const [payslipPhoto, setPayslipPhoto] = useState(null); // New
    const [referenceFace, setReferenceFace] = useState(null);
    const [capturedFaces, setCapturedFaces] = useState({ front: null, left: null, right: null });


    // Camera State
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [stream, setStream] = useState(null);
    const [livenessStatus, setLivenessStatus] = useState('none'); // none, prompt, left, right, verified
    const faceMeshRef = useRef(null);

    // Dashboard Data
    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    const apiUrl = API_URL;

    useEffect(() => {
        if (user.status === 'approved') {
            fetchDashboardData();
        }
        if (user.status === 'incomplete_profile') {
            loadMediapipe();
        }
    }, [user.status]);

    const loadMediapipe = async () => {
        if (window.FaceMesh) return;
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
        script.async = true;
        script.onload = () => {
            const cameraScript = document.createElement('script');
            cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
            cameraScript.async = true;
            cameraScript.onload = initFaceMesh;
            document.body.appendChild(cameraScript);
        };
        document.body.appendChild(script);
    };

    const initFaceMesh = () => {
        const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;
    };

    const isClosedRef = useRef(false);

    const onResults = (results) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
        const landmarks = results.multiFaceLandmarks[0];

        const leftUpper = landmarks[159];
        const leftLower = landmarks[145];
        const eyeDist = Math.sqrt(Math.pow(leftUpper.x - leftLower.x, 2) + Math.pow(leftUpper.y - leftLower.y, 2));

        const nose = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const checkDist = rightCheek.x - leftCheek.x;
        const headRatio = checkDist > 0 ? (nose.x - leftCheek.x) / checkDist : 0.5;

        setLivenessStatus(prev => {
            if (prev === 'prompt') {
                if (eyeDist < 0.018 && !isClosedRef.current) {
                    isClosedRef.current = true;
                } else if (eyeDist > 0.025 && isClosedRef.current) {
                    isClosedRef.current = false;
                    captureFrame('front');
                    return 'left';
                }
            } else if (prev === 'left') {
                if (headRatio > 0.65) {
                    captureFrame('left');
                    return 'right';
                }
            } else if (prev === 'right') {
                if (headRatio < 0.35) {
                    captureFrame('right');
                    return 'verified';
                }
            }
            return prev;
        });
    };

    const captureFrame = (type) => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedFaces(prev => ({ ...prev, [type]: canvas.toDataURL('image/jpeg') }));
    };

    const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
            const res = await fetch(`${apiUrl}/employee/dashboard-insights?employee_id=${user.employee_id}`);
            const data = await res.json();
            if (res.ok) {
                setDashboardData(data);
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setDashboardLoading(false);
        }
    };

    const cameraRef = useRef(null);

    // Sync stream to video element and initialize MediaPipe Camera
    useEffect(() => {
        if (videoRef.current && stream && streamActive && livenessStatus !== 'none' && livenessStatus !== 'verified') {
            videoRef.current.srcObject = stream;

            // Only initialize MediaPipe Camera if it hasn't been started yet
            if (window.Camera && faceMeshRef.current && !cameraRef.current) {
                const camera = new window.Camera(videoRef.current, {
                    onFrame: async () => {
                        if (faceMeshRef.current && videoRef.current) {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 640,
                    height: 480
                });
                camera.start();
                cameraRef.current = camera;
            }
        }
    }, [stream, streamActive, livenessStatus]);

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
            reader.onloadend = () => setter(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            setStreamActive(true);
            setLivenessStatus('prompt');
            isClosedRef.current = false;
        } catch (err) {
            console.error("Camera access error:", err);
        }
    };

    const captureFace = () => {
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setStreamActive(false);
        setLivenessStatus('none');
        setReferenceFace(capturedFaces.front); // use front face as user's main reference UI
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step < 2) {
            setStep(step + 1);
            return;
        }

        setLoading(true);

        try {
            if (!formData.dob) {
                setMessage({ type: 'error', text: 'Date of Birth is required' });
                setStep(1);
                setLoading(false);
                return;
            }
            if (!referenceFace) {
                setMessage({ type: 'error', text: 'Identity photo capture is required' });
                setStep(1);
                setLoading(false);
                return;
            }
            if (!bankPhoto) {
                setMessage({ type: 'error', text: 'Bank document is required' });
                setStep(1);
                setLoading(false);
                return;
            }
            if (!eduCert) {
                setMessage({ type: 'error', text: 'Education document is required' });
                setStep(2);
                setLoading(false);
                return;
            }
            if (formData.registration_type === 'Full-Time' && formData.is_experienced && !formData.pf_number) {
                setMessage({ type: 'error', text: 'PF Number is required for experienced Full-Time employees' });
                setStep(2);
                setLoading(false);
                return;
            }
            if (formData.registration_type === 'Full-Time' && formData.is_experienced && !payslipPhoto) {
                setMessage({ type: 'error', text: 'Previous company payslip is required for experienced candidates' });
                setStep(2);
                setLoading(false);
                return;
            }

            const payload = {
                employee_id: user.employee_id,
                ...formData,
                employment_type: 'Full-Time', // Defaulted, Admin will fix if needed
                bank_photo_base64: bankPhoto,
                education_cert_base64: eduCert,
                last_company_payslip_base64: payslipPhoto,
                image_base64: capturedFaces.front,
                image_left_base64: capturedFaces.left,
                image_right_base64: capturedFaces.right,
                pf_number: formData.pf_number
            };


            const response = await fetch(`${apiUrl}/auth/complete-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && !data.error) {
                setMessage({ type: 'success', text: 'Profile completed! Awaiting admin approval.' });
                setTimeout(() => {
                    setUser({ ...user, status: 'pending_approval' });
                }, 2000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Submission failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Server error' });
        }
        setLoading(false);
    };

    if (user.status === 'incomplete_profile') {
        const ProgressIndicator = () => (
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {step === 1 ? 'Personal & Identity' : 'Financial & Official Docs'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Step {step} of 2</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                        height: '100%', 
                        width: step === 1 ? '50%' : '100%', 
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transition: 'width 0.4s ease'
                    }} />
                </div>
            </div>
        );

        return (
            <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                <div className="card glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                            Complete Your Profile
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Please verify your identity and documents to activate your workspace.</p>
                    </div>

                    <ProgressIndicator />

                    {message && (
                        <div style={{ 
                            padding: '1rem 1.25rem', 
                            borderRadius: '12px', 
                            marginBottom: '1.5rem', 
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', 
                            border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                            color: message.type === 'error' ? '#f87171' : '#4ade80',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                             <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
                             {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {step === 1 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Personal Section */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                    <div className="input-field-group">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Birth</label>
                                        <input 
                                            type="date" 
                                            name="dob" 
                                            required 
                                            value={formData.dob} 
                                            onChange={handleInputChange} 
                                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff', outline: 'none' }} 
                                        />
                                    </div>
                                </div>

                                {/* Biometric Section */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Biometric Verification</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Verify your identity for attendance using a 3D face scan.</p>
                                    
                                    {!referenceFace ? (
                                        streamActive ? (
                                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '24px', overflow: 'hidden', background: '#000', border: '2px solid var(--primary)', aspectRatio: '4/3', boxShadow: '0 0 30px rgba(10, 102, 194, 0.2)' }}>
                                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                
                                                {/* HUD Overlay */}
                                                <div style={{ position: 'absolute', inset: '0', border: '2px solid rgba(255,255,255,0.1)', margin: '15%', borderRadius: '50%', pointerEvents: 'none', borderStyle: 'dashed' }} />

                                                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', padding: '0.6rem 1.2rem', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', borderRadius: '30px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, whiteSpace: 'nowrap' }}>
                                                    {livenessStatus === 'prompt' && '👁️ Blink once to verify liveness'}
                                                    {livenessStatus === 'left' && '⬅️ Slowly Turn Head Left'}
                                                    {livenessStatus === 'right' && '➡️ Slowly Turn Head Right'}
                                                    {livenessStatus === 'verified' && <span style={{ color: '#4ade80' }}>✅ Liveness Verified</span>}
                                                </div>

                                                <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(239, 68, 68, 0.85)', color: 'white', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', zIndex: 10 }}>
                                                    <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                                                    LIVE FEED
                                                </div>
                                                
                                                <button type="button" onClick={captureFace} disabled={livenessStatus !== 'verified'} className="btn btn-primary" style={{ position: 'absolute', bottom: '4.5rem', left: '50%', transform: 'translateX(-50%)', opacity: livenessStatus === 'verified' ? 1 : 0, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', visibility: livenessStatus === 'verified' ? 'visible' : 'hidden' }}>
                                                    Finalize Identity
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '4rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-color)', transition: 'all 0.3s ease' }}>
                                                <div style={{ width: '64px', height: '64px', background: 'rgba(10, 102, 194, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem' }}>📷</div>
                                                <button type="button" onClick={startCamera} className="btn-submit-premium" style={{ width: 'auto', padding: '0.75rem 2rem' }}>Launch Identity Camera</button>
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ position: 'relative', width: '220px', margin: '0 auto' }}>
                                            <div style={{ position: 'absolute', inset: '-4px', borderRadius: '24px', padding: '2px', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', opacity: 0.5 }} />
                                            <img src={referenceFace} style={{ position: 'relative', width: '220px', borderRadius: '22px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} />
                                            <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: '#22c55e', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '4px solid #1a1a1a', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>✓</div>
                                            <button type="button" onClick={() => setReferenceFace(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }}>Retake Biometric Scan</button>
                                        </div>
                                    )}
                                </div>

                                {/* Financial Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>Financial Information</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Bank Name</label>
                                            <input type="text" name="bank_name" required placeholder="State Bank of India" value={formData.bank_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Account Number</label>
                                            <input type="text" name="bank_account" required placeholder="XXXX XXXX XXXX" value={formData.bank_account} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>IFSC Code</label>
                                            <input type="text" name="bank_ifsc" required placeholder="SBIN000XXXX" value={formData.bank_ifsc} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>CIF Number</label>
                                            <input type="text" name="cif_number" required placeholder="90XXXXXXXX" value={formData.cif_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '1rem', fontWeight: 500 }}>Upload Bank Passbook / Mock Transaction Screenshot</label>
                                        <input type="file" required onChange={e => handleFileUpload(e, setBankPhoto)} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                                        {bankPhoto && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}>✓ Attached</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Education */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>Official Documents</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Degree / Highest Qualification</label>
                                            <input type="text" name="education_degree" required placeholder="B.Tech (Computer Science)" value={formData.education_degree} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>PAN Card Number</label>
                                            <input type="text" name="pan_no" required placeholder="ABCDE1234F" value={formData.pan_no} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: '#fff' }} />
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '1rem', fontWeight: 500 }}>Upload Highest Degree Certificate</label>
                                        <input type="file" required onChange={e => handleFileUpload(e, setEduCert)} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                                        {eduCert && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}>✓ Attached</span>}
                                    </div>
                                </div>

                                {/* Experience Detail */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem', margin: 0 }}>Career History</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input 
                                                type="checkbox" 
                                                name="is_experienced" 
                                                checked={formData.is_experienced} 
                                                onChange={handleInputChange} 
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }} 
                                            />
                                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>I have relevant work experience</label>
                                        </div>
                                    </div>

                                    {formData.is_experienced && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company</label>
                                                <input type="text" name="prev_company" required value={formData.prev_company} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: '#fff' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Role</label>
                                                <input type="text" name="prev_role" required value={formData.prev_role} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: '#fff' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Years of Experience</label>
                                                <input type="number" name="experience_years" required value={formData.experience_years} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: '#fff' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>PF Account Number</label>
                                                <input type="text" name="pf_number" required value={formData.pf_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: '#fff' }} />
                                            </div>
                                            <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#fff', marginBottom: '0.75rem' }}>Previous Company Payslip (Last 3 Months)</label>
                                                <input type="file" required onChange={e => handleFileUpload(e, setPayslipPhoto)} style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} />
                                                {payslipPhoto && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}>✓ Attached</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                            {step > 1 && (
                                <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '12px' }}>
                                    Back
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn-submit-premium"
                                style={{ flex: 2, padding: '1rem', height: 'auto', borderRadius: '12px', opacity: (step === 1 && !referenceFace) ? 0.6 : 1 }}
                                disabled={loading || (step === 1 && !referenceFace)}
                            >
                                {loading ? 'Processing Workspace...' : (step === 2 ? 'Finalize My Membership' : 'Verify & Continue')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (user.status === 'pending_approval') {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <span style={{ fontSize: '4rem' }}>⏳</span>
                <h1 style={{ marginTop: '1.5rem' }}>Awaiting Admin Approval</h1>
                <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Your profile has been submitted. Please check back later once an administrator reviews your details.</p>
            </div>
        );
    }

    // --- Sub-Components ---

    const LeavePage = () => {
        const [leaveHistory, setLeaveHistory] = useState([]);
        const [leaveBalance, setLeaveBalance] = useState(null);
        const [submitting, setSubmitting] = useState(false);
        const [employeeDirectory, setEmployeeDirectory] = useState([]);
        const [leaveForm, setLeaveForm] = useState({ 
            employee_id: user.employee_id, 
            type: 'Annual Leave', 
            start: '', 
            end: '', 
            reason: '' 
        });

        const fetchLeaveData = () => {
            fetch(`${apiUrl}/employee/leaves?employee_id=${user.employee_id}`)
                .then(res => res.ok ? res.json() : { leaves: [] })
                .then(data => setLeaveHistory(Array.isArray(data?.leaves) ? data.leaves : []))
                .catch(() => setLeaveHistory([]));

            fetch(`${apiUrl}/employee/leave-balance?employee_id=${user.employee_id}`)
                .then(res => res.ok ? res.json() : {})
                .then(data => setLeaveBalance(data || {}))
                .catch(() => setLeaveBalance({}));
        };

        const fetchDirectory = async () => {
            try {
                const res = await fetch(`${apiUrl}/employee/directory`);
                const data = await res.json();
                setEmployeeDirectory(data.employees || []);
            } catch (err) {
                console.error("Error fetching directory:", err);
            }
        };

        useEffect(() => {
            fetchLeaveData();
            fetchDirectory();
        }, []);

        const handleApply = async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
                const res = await fetch(`${apiUrl}/leaves/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: leaveForm.employee_id,
                        leave_type: leaveForm.type,
                        start_date: leaveForm.start,
                        end_date: leaveForm.end,
                        reason: leaveForm.reason
                    })
                });
                if (res.ok) {
                    fetchLeaveData();
                    setLeaveForm({ employee_id: user.employee_id, type: 'Annual Leave', start: '', end: '', reason: '' });
                    alert("Leave application submitted!");
                }
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="grid-2" style={{ gap: '2rem' }}>
                <div className="card glass-panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>✈️</span>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Apply for Leave</h2>
                    </div>
                    <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>SELECT EMPLOYEE</label>
                                <select className="btn btn-secondary" style={{ width: '100%', textAlign: 'left', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}>
                                    <option value={user.employee_id}>Current User (You)</option>
                                    {employeeDirectory.filter(emp => emp.employee_id !== user.employee_id).map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>LEAVE TYPE</label>
                                <select className="btn btn-secondary" style={{ width: '100%', textAlign: 'left', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                                    {leaveBalance?.types?.map(t => <option key={t.name}>{t.name}</option>)}
                                    <option>Unpaid Leave</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>START DATE</label>
                                <input type="date" className="btn btn-secondary" style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>END DATE</label>
                                <input type="date" className="btn btn-secondary" style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} required />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>REASON FOR LEAVE</label>
                            <textarea className="btn btn-secondary" style={{ width: '100%', minHeight: '100px', textAlign: 'left', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required placeholder="E.g., Medical checkup, Family event..." />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: 'var(--primary)', fontWeight: 'bold' }}>
                            {submitting ? 'Processing AI Verification...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass-panel">
                        <h2 className="card-title">📊 Leave Balance</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {leaveBalance?.types?.map((t, i) => (
                                <div key={i} style={{ padding: '1rem', background: 'rgba(10, 102, 194, 0.05)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(10, 102, 194, 0.1)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>{t.remaining}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>{t.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="card glass-card" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className="card-title" style={{ marginBottom: 0 }}>📜 History</h2>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status Tracking</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {leaveHistory.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent leave requests found.</p> :
                                leaveHistory.map((l, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                                    <span style={{ 
                                                        padding: '0.15rem 0.4rem', 
                                                        borderRadius: '4px', 
                                                        backgroundColor: 'var(--primary-glow)', 
                                                        color: 'var(--primary)',
                                                        fontSize: '0.7rem',
                                                        marginRight: '0.5rem',
                                                        border: '1px solid var(--primary)'
                                                    }}>{l.leave_type_short || 'L'}</span>
                                                    {l.leave_type}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 800, 
                                                padding: '4px 10px', 
                                                borderRadius: '20px', 
                                                background: (l.status && l.status.toLowerCase().includes('approved')) ? 'rgba(34, 197, 94, 0.15)' : 
                                                           (l.status && l.status.toLowerCase().includes('rejected')) ? 'rgba(239, 68, 68, 0.15)' : 
                                                           'rgba(245, 158, 11, 0.15)',
                                                color: (l.status && l.status.toLowerCase().includes('approved')) ? '#22C55E' : 
                                                       (l.status && l.status.toLowerCase().includes('rejected')) ? '#EF4444' : 
                                                       '#F59E0B',
                                                textTransform: 'uppercase',
                                                border: `1px solid ${(l.status && l.status.toLowerCase().includes('approved')) ? '#22C55E44' : (l.status && l.status.toLowerCase().includes('rejected')) ? '#EF444444' : '#F59E0B44'}`
                                            }}>
                                                {l.status}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            "{l.reason}"
                                        </p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const PayslipPage = () => {
        const [payslips, setPayslips] = useState([]);
        useEffect(() => {
            fetch(`${apiUrl}/employee/payslips?employee_id=${user.employee_id}`)
                .then(res => res.ok ? res.json() : { payslips: [] })
                .then(data => setPayslips(Array.isArray(data?.payslips) ? data.payslips : []))
                .catch(() => setPayslips([]));
        }, []);

        return (
            <div className="card glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 className="card-title">📄 Your Payslips</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {payslips.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{p.month}</div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Disbursed on {p.date}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                <div style={{ fontWeight: 'bold', color: '#0a66c2' }}>{p.amount}</div>
                                <button className="btn btn-secondary" onClick={() => window.open(`${apiUrl}/employee/payslip/download/${p.month}?employee_id=${user.employee_id}`, '_blank')}>Download</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const KudosPage = () => {
        const [kudos, setKudos] = useState([]);
        const [msg, setMsg] = useState('');
        const [to, setTo] = useState('');
        const [sending, setSending] = useState(false);

        useEffect(() => {
            fetch(`${apiUrl}/employee/kudos`)
                .then(res => res.ok ? res.json() : { kudos: [] })
                .then(data => setKudos(Array.isArray(data?.kudos) ? data.kudos : []))
                .catch(() => setKudos([]));
        }, []);

        const handleGive = async (e) => {
            e.preventDefault();
            setSending(true);
            try {
                const res = await fetch(`${apiUrl}/employee/kudos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender_id: user.employee_id,
                        sender_name: user.name,
                        receiver_name: to,
                        message: msg
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setKudos([data.record, ...kudos]);
                    setMsg('');
                    setTo('');
                    alert("Kudos shared!");
                }
            } finally {
                setSending(false);
            }
        };

        return (
            <div className="grid-2" style={{ gap: '2rem' }}>
                <div className="card glass-panel">
                    <h2 className="card-title">🎉 Spread Appreciation</h2>
                    <form onSubmit={handleGive} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div><label>To (Colleague Name)</label><input type="text" className="btn btn-secondary" style={{ width: '100%', textAlign: 'left' }} value={to} onChange={e => setTo(e.target.value)} required /></div>
                        <div><label>What do you appreciate?</label><textarea className="btn btn-secondary" style={{ width: '100%', minHeight: '100px', textAlign: 'left' }} value={msg} onChange={e => setMsg(e.target.value)} required /></div>
                        <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sharing...' : 'Share Kudos'}</button>
                    </form>
                </div>
                <div className="card glass-card">
                    <h2 className="card-title">🌈 Recent Appreciation</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {kudos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Be the first to share appreciation!</p> :
                            kudos.map((k, i) => (
                                <div key={i} style={{ padding: '1.25rem', background: 'rgba(10, 102, 194, 0.04)', borderLeft: '4px solid var(--primary)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                        <strong>{k.sender_name}</strong> recognized <strong>{k.receiver_name}</strong>
                                    </div>
                                    <p style={{ fontStyle: 'italic', margin: '0.5rem 0', fontSize: '0.95rem', color: 'var(--text-light)', lineHeight: '1.5' }}>"{k.message}"</p>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.5rem' }}>{k.timestamp ? new Date(k.timestamp).toLocaleDateString() : 'Just now'}</div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        );
    };

    const HolidayPage = () => {
        const [holidays, setHolidays] = useState([]);
        const [hLoading, setHLoading] = useState(true);

        useEffect(() => {
            fetch(`${apiUrl}/employee/holidays`)
                .then(res => res.ok ? res.json() : { holidays: [] })
                .then(data => {
                    setHolidays(Array.isArray(data?.holidays) ? data.holidays : []);
                    setHLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching holidays:", err);
                    setHolidays([]);
                    setHLoading(false);
                });
        }, []);

        return (
            <div className="card glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 className="card-title">📅 Company Holiday Calendar</h2>
                {hLoading ? <p style={{ color: '#6b7280' }}>Loading holidays...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {holidays.length === 0 ? <p style={{ color: '#6b7280' }}>No holidays scheduled.</p> :
                            holidays.map((h, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#0a66c2' }}>{h.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{h.type}</div>
                                    </div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="home-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="card-title" style={{ fontSize: '1.75rem', margin: 0 }}>
                    {activeTab === 'dashboard' ? `Good Evening, ${user.name}! 👋` :
                        activeTab === 'leave' ? 'Leave Management' :
                            activeTab === 'payslips' ? 'Payroll & Payslips' :
                                activeTab === 'holidays' ? 'Holiday Calendar' : 'Appreciation Wall'}
                </h1>
                {activeTab !== 'dashboard' && <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>← Back to Home</button>}
            </div>

            {activeTab === 'dashboard' ? (
                <div className="grid-3">
                    {/* Daily Assistant Agent */}
                    <div className="card glass-card" style={{ borderTop: '4px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--primary)', opacity: 0.05, borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--accent-blue)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.25rem' }}>🤖</span>
                            </div>
                            <h2 className="card-title" style={{ marginBottom: 0, fontSize: '1.15rem' }}>Smart Daily Assistant</h2>
                        </div>

                        <div style={{ backgroundColor: 'rgba(10, 102, 194, 0.08)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(10, 102, 194, 0.1)' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', lineHeight: '1.6' }}>
                                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Insight</strong>
                                {dashboardLoading ? 'Analyzing your workspace...' : (dashboardData?.insight_message || 'Loading your daily analysis...')}
                            </p>
                        </div>

                        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Upcoming Highlights</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {dashboardLoading ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Synchronizing...</div>
                            ) : (
                                dashboardData?.highlights?.map((h, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.75rem', 
                                        padding: '0.65rem 0.85rem', 
                                        borderRadius: '12px', 
                                        backgroundColor: h.type === 'leave' ? (
                                            h.status === 'success' ? 'rgba(34, 197, 94, 0.08)' : 
                                            h.status === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 
                                            'rgba(239, 68, 68, 0.08)'
                                        ) : 'transparent',
                                        border: h.type === 'leave' ? `1px solid ${
                                            h.status === 'success' ? 'rgba(34, 197, 94, 0.1)' : 
                                            h.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 
                                            'rgba(239, 68, 68, 0.1)'
                                        }` : 'none'
                                    }}>
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            background: h.type === 'holiday' ? 'var(--primary)' : 
                                                       h.status === 'success' ? '#22C55E' :
                                                       h.status === 'warning' ? '#F59E0B' : '#EF4444', 
                                            borderRadius: '50%',
                                            boxShadow: h.type === 'leave' ? `0 0 10px ${
                                                h.status === 'success' ? '#22C55E88' :
                                                h.status === 'warning' ? '#F59E0B88' : '#EF444488'
                                            }` : 'none'
                                        }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)' }}>{h.title}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.time}</span>
                                        </div>
                                    </div>
                                )) || <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No upcoming highlights</div>
                            )}
                        </div>
                    </div>

                    {/* AI Workforce Insights */}
                    <div className="card glass-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.25rem' }}>📊</span>
                            </div>
                            <h2 className="card-title" style={{ marginBottom: 0, fontSize: '1.15rem' }}>Workforce Insights</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '1.25rem', background: 'var(--bg-color)', borderRadius: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                                    {dashboardLoading ? '--' : (dashboardData?.productivity_score || 0)}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.25rem' }}>Productivity</div>
                            </div>
                            <div style={{ padding: '1.25rem', background: 'var(--bg-color)', borderRadius: '20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                                    {dashboardLoading ? '--' : (dashboardData?.attendance_percentage || 0)}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.25rem' }}>Attendance</div>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-light)' }}>Burnout Risk Assessment</span>
                                <span style={{ color: 'var(--primary)' }}>{dashboardLoading ? 'Calculating...' : (dashboardData?.burnout_risk || 'N/A')}</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${dashboardData?.burnout_value || 0}%`, background: 'var(--main-gradient)', borderRadius: '10px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Policy Notice */}
                    <div className="card glass-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(10, 102, 194, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.2rem' }}>📜</span>
                            </div>
                            <h2 className="card-title" style={{ marginBottom: 0, fontSize: '1.15rem' }}>Company Policy</h2>
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.7', color: 'var(--text-light)' }}>
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                                <span><strong>Hours:</strong> 11 AM - 8 PM (Flexible)</span>
                            </div>
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                                <span><strong>Leaves:</strong> 1.5 days/month for FTE.</span>
                            </div>
                            <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                * Strict adherence required to avoid attendance discrepancies.
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <h2 className="card-title">Quick Access</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('payslips')}>
                                📄 View Latest Payslip
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', position: 'relative' }} onClick={() => setActiveTab('leave')}>
                                🌴 Apply for Leave
                                {dashboardData?.highlights?.some(h => h.type === 'leave' && h.status === 'warning') && (
                                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', background: '#F59E0B', borderRadius: '50%', border: '2px solid white', animation: 'pulse 1.5s infinite' }}></span>
                                )}
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('kudos')}>
                                🎉 Give Kudos
                            </button>
                            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('holidays')}>
                                📅 View Holiday Calendar
                            </button>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'leave' ? (
                <LeavePage />
            ) : activeTab === 'payslips' ? (
                <PayslipPage />
            ) : activeTab === 'holidays' ? (
                <HolidayPage />
            ) : (
                <KudosPage />
            )}
        </div>
    );
};

export default HomeDashboard;
