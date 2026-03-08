import React, { useState, useRef, useEffect } from 'react';

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
        education_degree: '',
    });

    const [bankPhoto, setBankPhoto] = useState(null);
    const [eduCert, setEduCert] = useState(null);
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

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
        if (step < 3) {
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
            if (!eduCert || !bankPhoto) {
                setMessage({ type: 'error', text: 'Education and Bank documents are required' });
                setStep(2);
                setLoading(false);
                return;
            }
            if (!referenceFace) {
                setMessage({ type: 'error', text: 'Identity photo capture is required' });
                setStep(3);
                setLoading(false);
                return;
            }

            const payload = {
                employee_id: user.employee_id,
                ...formData,
                bank_photo_base64: bankPhoto,
                education_cert_base64: eduCert,
                image_base64: capturedFaces.front,
                image_left_base64: capturedFaces.left,
                image_right_base64: capturedFaces.right
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
        return (
            <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <div className="card glass-panel">
                    <h2 className="card-title">🚀 Complete Your Profile (Step {step} of 3)</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Please provide these additional details to activate your account.</p>

                    {message && (
                        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1rem', background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 102, 194, 0.1)', color: message.type === 'error' ? '#EF4444' : '#0a66c2' }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {step === 1 && (
                            <>
                                <div><label>Date of Birth</label><input type="date" name="dob" required value={formData.dob} onChange={handleInputChange} className="btn btn-secondary" style={{ width: '100%', textAlign: 'left' }} /></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="is_experienced" checked={formData.is_experienced} onChange={handleInputChange} />
                                    <label>I have previous work experience</label>
                                </div>
                                {formData.is_experienced && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                                        <div><label style={{ fontSize: '0.75rem' }}>Company</label><input type="text" name="prev_company" required value={formData.prev_company} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: 'transparent', color: '#1f2937' }} /></div>
                                        <div><label style={{ fontSize: '0.75rem' }}>Role</label><input type="text" name="prev_role" required value={formData.prev_role} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: 'transparent', color: '#1f2937' }} /></div>
                                        <div><label style={{ fontSize: '0.75rem' }}>Years</label><input type="number" name="experience_years" required value={formData.experience_years} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: 'transparent', color: '#1f2937' }} /></div>
                                    </div>
                                )}
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <h3 style={{ fontSize: '1rem' }}>Education & Bank</h3>
                                <div><label>Degree</label><input type="text" name="education_degree" required value={formData.education_degree} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem' }} /></div>
                                <div><label>Certificate Photo</label><input type="file" required onChange={e => handleFileUpload(e, setEduCert)} /></div>
                                <div><label>Bank Account</label><input type="text" name="bank_account" required value={formData.bank_account} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem' }} /></div>
                                <div><label>IFSC Code</label><input type="text" name="bank_ifsc" required value={formData.bank_ifsc} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem' }} /></div>
                                <div><label>Bank Photo</label><input type="file" required onChange={e => handleFileUpload(e, setBankPhoto)} /></div>
                            </>
                        )}

                        {step === 3 && (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ marginBottom: '1rem', fontWeight: '500' }}>Live Face Capture (Attendance Identity)</p>
                                {!referenceFace ? (
                                    streamActive ? (
                                        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '2px solid #E5E7EB', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {livenessStatus === 'prompt' && (
                                                <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px', color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid #E5E7EB', zIndex: 10 }}>
                                                    👁️ Blink once to verify liveness
                                                </div>
                                            )}
                                            {livenessStatus === 'left' && (
                                                <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px', color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid #E5E7EB', zIndex: 10 }}>
                                                    ⬅️ Slowly Turn Head Left
                                                </div>
                                            )}
                                            {livenessStatus === 'right' && (
                                                <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px', color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid #E5E7EB', zIndex: 10 }}>
                                                    ➡️ Slowly Turn Head Right
                                                </div>
                                            )}
                                            {livenessStatus === 'verified' && (
                                                <div style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1rem', background: 'rgba(10, 102, 194, 0.9)', borderRadius: '20px', color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 10 }}>
                                                    ✅ Liveness Verified
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(239, 68, 68, 0.8)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.2)', zIndex: 10 }}>
                                                <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                                LIVE
                                                <style>{`
                                                    @keyframes pulse {
                                                        0% { transform: scale(0.95); opacity: 1; }
                                                        50% { transform: scale(1.2); opacity: 0.5; }
                                                        100% { transform: scale(0.95); opacity: 1; }
                                                    }
                                                `}</style>
                                            </div>
                                            <button type="button" onClick={captureFace} disabled={livenessStatus !== 'verified'} className="btn btn-primary" style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 10, opacity: livenessStatus === 'verified' ? 1 : 0.5 }}>Capture Photo</button>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>
                                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>📷</span>
                                            <button type="button" onClick={startCamera} className="btn btn-secondary">Open Camera</button>
                                        </div>
                                    )
                                ) : (
                                    <div style={{ position: 'relative', width: '200px', margin: '0 auto' }}>
                                        <img src={referenceFace} style={{ width: '200px', borderRadius: '12px', border: '2px solid #0a66c2', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                                        <div style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', background: '#0a66c2', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>Success</div>
                                        <button type="button" onClick={() => setReferenceFace(null)} className="btn btn-secondary" style={{ display: 'block', margin: '1rem auto', width: '100%' }}>Retake Photo</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 2, opacity: (step === 3 && !referenceFace) ? 0.5 : 1 }}
                                disabled={loading || (step === 3 && !referenceFace)}
                            >
                                {loading ? 'Processing...' : (step === 3 ? 'Submit Entire Profile' : 'Next Step')}
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
        const [leaveForm, setLeaveForm] = useState({ type: 'Privilege Leave', start: '', end: '', reason: '' });

        useEffect(() => {
            fetch(`${apiUrl}/employee/leaves?employee_id=${user.employee_id}`)
                .then(res => res.ok ? res.json() : { leaves: [] })
                .then(data => setLeaveHistory(Array.isArray(data?.leaves) ? data.leaves : []))
                .catch(() => setLeaveHistory([]));

            fetch(`${apiUrl}/employee/leave-balance?employee_id=${user.employee_id}`)
                .then(res => res.ok ? res.json() : {})
                .then(data => setLeaveBalance(data || {}))
                .catch(() => setLeaveBalance({}));
        }, []);

        const handleApply = async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
                const res = await fetch(`${apiUrl}/leaves/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: user.employee_id,
                        leave_type: leaveForm.type,
                        start_date: leaveForm.start,
                        end_date: leaveForm.end,
                        reason: leaveForm.reason
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setLeaveHistory([data.record, ...leaveHistory]);
                    setLeaveForm({ type: 'Privilege Leave', start: '', end: '', reason: '' });
                    alert("Leave application submitted!");
                }
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="grid-2" style={{ gap: '2rem' }}>
                <div className="card glass-panel">
                    <h2 className="card-title">🌴 Apply for Leave</h2>
                    <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div><label>Type</label><select className="btn btn-secondary" style={{ width: '100%', textAlign: 'left' }} value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                            <option>Privilege Leave</option>
                            <option>Sick Leave</option>
                            <option>Casual Leave</option>
                        </select></div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}><label>Start</label><input type="date" className="btn btn-secondary" style={{ width: '100%' }} value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} required /></div>
                            <div style={{ flex: 1 }}><label>End</label><input type="date" className="btn btn-secondary" style={{ width: '100%' }} value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} required /></div>
                        </div>
                        <div><label>Reason</label><textarea className="btn btn-secondary" style={{ width: '100%', minHeight: '80px', textAlign: 'left' }} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required /></div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
                    </form>
                </div>
                <div>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 className="card-title">📊 Leave Balance</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {leaveBalance?.types.map((t, i) => (
                                <div key={i} style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0a66c2' }}>{t.remaining}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{t.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <h2 className="card-title">📜 History</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {leaveHistory.length === 0 ? <p style={{ color: '#6b7280' }}>No recent leaves</p> :
                                leaveHistory.map((l, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                            <strong>{l.leave_type}</strong>
                                            <span style={{ color: (l.status && l.status.includes('Approved')) ? '#0a66c2' : '#ff7a00' }}>{l.status}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{l.start_date} to {l.end_date}</div>
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
                <div className="card">
                    <h2 className="card-title">🌈 Recent Appreciation</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {kudos.map((k, i) => (
                            <div key={i} style={{ padding: '1rem', background: 'rgba(255, 122, 0,0.05)', borderLeft: '4px solid #ff7a00', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <strong>{k.sender_name}</strong> appreciated <strong>{k.receiver_name}</strong>
                                </div>
                                <p style={{ fontStyle: 'italic', margin: '0.5rem 0', fontSize: '0.9rem' }}>"{k.message}"</p>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{k.timestamp ? new Date(k.timestamp).toLocaleDateString() : 'Just now'}</div>
                            </div>
                        ))}
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
                    <div className="card glass-panel" style={{ borderColor: '#ff7a00' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🤖</span>
                            <h2 className="card-title" style={{ marginBottom: 0 }}>Smart Daily Assistant</h2>
                        </div>

                        <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#ff7a00' }}>
                                <strong>Insight:</strong> {dashboardLoading ? 'Analyzing...' : (dashboardData?.insight_message || 'Loading your daily analysis...')}
                            </p>
                        </div>

                        <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Upcoming Highlights</h3>
                        <ul style={{ listStyle: 'none', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dashboardLoading ? (
                                <li style={{ color: '#6b7280' }}>Loading...</li>
                            ) : (
                                dashboardData?.highlights?.map((h, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: h.type === 'holiday' ? '#0a66c2' : '#6b7280' }}>
                                            {h.type === 'holiday' ? '📅' : '•'}
                                        </span>
                                        {h.time} - {h.title}
                                    </li>
                                )) || <li style={{ color: '#6b7280' }}>No upcoming highlights</li>
                            )}
                        </ul>
                    </div>

                    {/* AI Workforce Insights */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📊</span>
                            <h2 className="card-title" style={{ marginBottom: 0 }}>Workforce Insights</h2>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0a66c2' }}>
                                    {dashboardLoading ? '--' : (dashboardData?.productivity_score || 0)}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Productivity Score</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff7a00' }}>
                                    {dashboardLoading ? '--' : (dashboardData?.attendance_percentage || 0)}%
                                </div>
                                <div style={{ fontSize: '12', color: '#6b7280' }}>Attendance</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                <span>Burnout Risk</span>
                                <span style={{ color: '#0a66c2' }}>{dashboardLoading ? 'Calculating...' : (dashboardData?.burnout_risk || 'N/A')}</span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${dashboardData?.burnout_value || 0}%`, backgroundColor: '#0a66c2', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Policy Notice */}
                    <div className="card" style={{ borderLeft: '4px solid #ff7a00' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>📜</span>
                            <h2 className="card-title" style={{ marginBottom: 0 }}>Company Policy</h2>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#1f2937' }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <strong>Hours:</strong> 11 AM - 8 PM (Mandatory)
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <strong>Leaves:</strong> 1.5 days/month for FTE. Prior approval mandatory.
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
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
                            <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('leave')}>
                                🌴 Apply for Leave
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
