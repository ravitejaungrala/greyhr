import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock, Calendar, TreePalm, History, Sun,
    User, CheckCircle2, ChevronRight, AlertTriangle,
    BarChart3, ScrollText, Camera, Eye,
    ChevronLeft, Sparkles, FileText, TrendingUp,
    LogIn, LogOut
} from 'lucide-react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';
import { API_URL } from '../config';

const HomeDashboard = ({ user, setUser }) => {
    const navigate = useNavigate();
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
    const [todayStatus, setTodayStatus] = useState({ last_punch: null, status: 'Not Signed In' });
    const [punchLoading, setPunchLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [punchAction, setPunchAction] = useState(null);
    const [showSwipeModal, setShowSwipeModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [showDotsMenu, setShowDotsMenu] = useState(false);
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [payslipSummary, setPayslipSummary] = useState([]);
    const [attendanceChartMode, setAttendanceChartMode] = useState('daily');
    const [attendanceChartData, setAttendanceChartData] = useState([]);
    const [attendanceChartLoading, setAttendanceChartLoading] = useState(false);

    // Comp-off / non-working-day sign in
    const [compOffState, setCompOffState] = useState(null);   // { day_info, request, comp_off_balance }
    const [compOffPrompt, setCompOffPrompt] = useState(null); // { day_info, message } while confirming
    const [punchResult, setPunchResult] = useState(null);     // { tone, title, body }

    const apiUrl = API_URL;

    useEffect(() => {
        if (user.status === 'approved') {
            fetchDashboardData();
            fetchPunchStatus();
            fetchLeaveBalance();
            fetchPayslipSummary();
            fetchAttendanceChart('daily');
            fetchCompOffState();
        }
        if (user.status === 'incomplete_profile') {
            loadMediapipe();
        }
    }, [user.status]);

    const fetchPunchStatus = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/attendance/status?employee_id=${user.employee_id}`);
            const data = await res.json();
            setTodayStatus(data);
        } catch (err) {
            console.error("Error fetching punch status:", err);
        }
    };

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

    const fetchAttendanceChart = async (mode) => {
        setAttendanceChartLoading(true);
        try {
            const res = await fetch(`${apiUrl}/employee/attendance/chart?employee_id=${user.employee_id}&mode=${mode}`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceChartData(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching attendance chart:', err);
        } finally {
            setAttendanceChartLoading(false);
        }
    };

    const handleAttendanceChartMode = (mode) => {
        setAttendanceChartMode(mode);
        fetchAttendanceChart(mode);
    };

    const fetchLeaveBalance = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/leave-balance?employee_id=${user.employee_id}`);
            if (res.ok) {
                const data = await res.json();
                setLeaveBalance(data);
            }
        } catch (err) {
            console.error("Error fetching leave balance:", err);
        }
    };

    const fetchPayslipSummary = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/payslips?employee_id=${user.employee_id}`);
            if (res.ok) {
                const data = await res.json();
                const slips = (data.payslips || []).slice(0, 6).reverse();
                setPayslipSummary(slips.map(p => ({
                    month: p.month?.replace(/\s\d{4}$/, '').slice(0, 3) || '',
                    net: p.net_salary || 0,
                    gross: p.gross_salary || 0,
                })));
            }
        } catch (err) {
            console.error("Error fetching payslip summary:", err);
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

    const fetchCompOffState = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/comp-off/status?employee_id=${user.employee_id}`);
            const data = await res.json();
            if (!data.error) setCompOffState(data);
        } catch (err) {
            console.error("Error fetching comp-off state:", err);
        }
    };

    const handleDashboardPunch = async (action, acknowledged = false) => {
        setPunchAction(action);
        setPunchLoading(true);

        try {
            const response = await fetch(`${apiUrl}/attendance/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: user.employee_id,
                    image_base64: null,
                    location: "Dashboard Mobile/Web",
                    action_type: action,
                    acknowledged_non_working: acknowledged
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setPunchResult({ tone: 'error', title: 'Punch failed', body: data.error || 'Please try again.' });
                return;
            }

            // The API returns 200 with an { error } body for business-rule rejections
            if (data.error) {
                setPunchResult({ tone: 'error', title: 'Punch failed', body: data.error });
                return;
            }

            // Non-working day: the server is holding the punch until confirmation
            if (data.requires_confirmation) {
                setCompOffPrompt({ day_info: data.day_info, message: data.message, action });
                return;
            }

            await Promise.all([fetchPunchStatus(), fetchDashboardData(), fetchCompOffState()]);

            const isNonWorking = data.day_info?.is_non_working;
            if (action === 'sign_in' && isNonWorking && data.comp_off) {
                setPunchResult({
                    tone: 'compoff',
                    title: 'Signed in — Comp-Off request raised',
                    body: `Your sign-in on ${data.day_info.label} has been sent to your admin for approval. `
                        + 'Compensatory Off will be credited only once an admin approves it.'
                });
            } else {
                setPunchResult({
                    tone: 'success',
                    title: `Successfully ${action === 'sign_in' ? 'signed in' : 'signed out'}`,
                    body: data.warning || (action === 'sign_in' ? 'Have a good day.' : 'See you tomorrow.')
                });
            }
        } catch (err) {
            console.error("Dashboard punch error:", err);
            setPunchResult({ tone: 'error', title: 'Connection error', body: 'Please check your connection and try again.' });
        } finally {
            setPunchLoading(false);
            setPunchAction(null);
        }
    };

    const confirmCompOffPunch = async () => {
        const pending = compOffPrompt;
        setCompOffPrompt(null);
        if (pending) await handleDashboardPunch(pending.action, true);
    };

    const fetchAttendanceHistory = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/attendance/history?employee_id=${user.employee_id}`);
            const data = await res.json();
            if (res.ok) {
                setAttendanceHistory(data.history || []);
                setShowSwipeModal(true);
            }
        } catch (err) {
            console.error("Error fetching history:", err);
        }
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
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
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
                <div className="card shadow-lg animate-fade-in" style={{ padding: '2.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
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
                             <span>{message.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
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
                                            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', color: 'var(--text-light)', outline: 'none' }} 
                                        />
                                    </div>
                                </div>

                                {/* Biometric Section */}
                                <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-light)' }}>Biometric Verification</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Verify your identity for attendance using a 3D face scan.</p>
                                    
                                    {!referenceFace ? (
                                        streamActive ? (
                                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '24px', overflow: 'hidden', background: '#000', border: '2px solid var(--primary)', aspectRatio: '4/3', boxShadow: '0 0 30px rgba(255, 69, 0, 0.2)' }}>
                                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                
                                                {/* HUD Overlay */}
                                                <div style={{ position: 'absolute', inset: '0', border: '2px solid rgba(255,255,255,0.1)', margin: '15%', borderRadius: '50%', pointerEvents: 'none', borderStyle: 'dashed' }} />

                                                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', padding: '0.6rem 1.2rem', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', borderRadius: '30px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, whiteSpace: 'nowrap' }}>
                                                     {livenessStatus === 'prompt' && <><Eye size={14} /> Blink once to verify liveness</>}
                                                     {livenessStatus === 'left' && <><ChevronLeft size={14} /> Slowly Turn Head Left</>}
                                                     {livenessStatus === 'right' && <><ChevronRight size={14} /> Slowly Turn Head Right</>}
                                                     {livenessStatus === 'verified' && <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={14} /> Liveness Verified</span>}
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
                                                 <div style={{ width: '64px', height: '64px', background: 'rgba(255, 69, 0, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                                                     <Camera size={32} />
                                                 </div>
                                                <button type="button" onClick={startCamera} className="btn-submit-premium" style={{ width: 'auto', padding: '0.75rem 2rem' }}>Launch Identity Camera</button>
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ position: 'relative', width: '220px', margin: '0 auto' }}>
                                            <div style={{ position: 'absolute', inset: '-4px', borderRadius: '24px', padding: '2px', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', opacity: 0.5 }} />
                                            <img src={referenceFace} style={{ position: 'relative', width: '220px', borderRadius: '22px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} />
                                            <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: '#22c55e', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '4px solid #1a1a1a', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}><CheckCircle2 size={16} /></div>
                                            <button type="button" onClick={() => setReferenceFace(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }}>Retake Biometric Scan</button>
                                        </div>
                                    )}
                                </div>

                                {/* Financial Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>Financial Information</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Bank Name</label>
                                            <input type="text" name="bank_name" required placeholder="State Bank of India" value={formData.bank_name} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', color: 'var(--text-light)' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Account Number</label>
                                            <input type="text" name="bank_account" required placeholder="XXXX XXXX XXXX" value={formData.bank_account} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', color: 'var(--text-light)' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>IFSC Code</label>
                                            <input type="text" name="bank_ifsc" required placeholder="SBIN000XXXX" value={formData.bank_ifsc} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', color: 'var(--text-light)' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>CIF Number</label>
                                            <input type="text" name="cif_number" required placeholder="90XXXXXXXX" value={formData.cif_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', color: 'var(--text-light)' }} />
                                        </div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem', fontWeight: 500 }}>Upload Bank Passbook / Mock Transaction Screenshot</label>
                                        <input type="file" required onChange={e => handleFileUpload(e, setBankPhoto)} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                                        {bankPhoto && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}><CheckCircle2 size={16} /> Attached</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Education */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>Official Documents</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Degree / Highest Qualification</label>
                                            <input type="text" name="education_degree" required placeholder="B.Tech (Computer Science)" value={formData.education_degree} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', color: 'var(--text-light)' }} />
                                        </div>
                                        <div className="input-field-group">
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>PAN Card Number</label>
                                            <input type="text" name="pan_no" required placeholder="ABCDE1234F" value={formData.pan_no} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)', color: 'var(--text-light)' }} />
                                        </div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem', fontWeight: 500 }}>Upload Highest Degree Certificate</label>
                                        <input type="file" required onChange={e => handleFileUpload(e, setEduCert)} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                                        {eduCert && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}><CheckCircle2 size={16} /> Attached</span>}
                                    </div>
                                </div>

                                {/* Experience Detail */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-light)', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem', margin: 0 }}>Career History</h3>
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
                                        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Company</label>
                                                <input type="text" name="prev_company" required value={formData.prev_company} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-light)' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Role</label>
                                                <input type="text" name="prev_role" required value={formData.prev_role} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-light)' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Years of Experience</label>
                                                <input type="number" name="experience_years" required value={formData.experience_years} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-light)' }} />
                                            </div>
                                            <div className="input-field-group">
                                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>PF Account Number</label>
                                                <input type="text" name="pf_number" required value={formData.pf_number} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-light)' }} />
                                            </div>
                                            <div style={{ gridColumn: 'span 2', background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>Previous Company Payslip (Last 3 Months)</label>
                                                <input type="file" required onChange={e => handleFileUpload(e, setPayslipPhoto)} style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} />
                                                {payslipPhoto && <span style={{ marginLeft: '1rem', color: '#4ade80', fontSize: '0.75rem' }}><CheckCircle2 size={16} /> Attached</span>}
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
                <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                    <Clock size={64} className="animate-pulse" />
                </div>
                <h1 style={{ marginTop: '1.5rem' }}>Awaiting Admin Approval</h1>
                <p style={{ color: '#000000', marginTop: '0.5rem' }}>Your profile has been submitted. Please check back later once an administrator reviews your details.</p>
            </div>
        );
    }

    // --- Sub-Components ---

    const hour = new Date().getHours();
    const greetingWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const LEAVE_COLORS = ['#E88C1F', '#3552D6', '#12A56B', '#7C5CFC', '#A0A4B8'];

    return (
        <div className="ds">
            <div className="ds-wrap">

                <div className="ds-greeting">
                    {greetingWord}, {user.name}
                    <Sun size={19} color="var(--off)" style={{ verticalAlign: '-3px', marginLeft: 8 }} />
                </div>

                {/* ================= Row 1 ================= */}
                <div className="ds-row1">

                    {/* ---- Attendance ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title">Attendance</div>

                        {compOffState?.day_info?.is_non_working && (
                            <div className={`ds-dayflag ${compOffState.request ? 'raised' : ''}`}>
                                <div className="t">
                                    <Calendar size={13} /> {compOffState.day_info.label}
                                </div>
                                <div className="s">
                                    {compOffState.request
                                        ? (compOffState.request.status === 'Pending'
                                            ? 'Comp-Off request pending admin approval'
                                            : compOffState.request.status === 'Approved'
                                                ? 'Comp-Off approved — 1 day credited'
                                                : 'Comp-Off was not approved')
                                        : 'Signing in today raises a Comp-Off request'}
                                </div>
                            </div>
                        )}

                        <div className="ds-attendance-status">
                            <span className={`ds-dot${todayStatus.status === 'Signed In' ? ' live' : ''}`} />
                            {todayStatus.status || 'Not signed in'}
                        </div>
                        <div className="ds-today-line">
                            Today: <b>{todayStatus.total_hours_today || '0h 0m'}</b>
                        </div>

                        {todayStatus.status === 'Signed In' ? (
                            <button
                                className="ds-signin-btn out"
                                onClick={() => handleDashboardPunch('sign_out')}
                                disabled={punchLoading}
                            >
                                <LogOut size={15} /> {punchAction === 'sign_out' ? 'Signing out…' : 'Sign out'}
                            </button>
                        ) : (
                            <button
                                className="ds-signin-btn"
                                onClick={() => handleDashboardPunch('sign_in')}
                                disabled={punchLoading}
                            >
                                <LogIn size={15} /> {punchAction === 'sign_in' ? 'Signing in…' : 'Sign in'}
                            </button>
                        )}

                        <div className="ds-link" onClick={fetchAttendanceHistory}>
                            <History size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                            View swipe history
                        </div>
                    </div>

                    {/* ---- AI daily insight ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title serif">
                            <Sparkles size={15} color="var(--accent)" /> AI daily insight
                        </div>

                        <div className="ds-insight-box">
                            {dashboardLoading ? 'Analyzing…' : (dashboardData?.insight_message || 'Loading…')}
                        </div>

                        <div className="ds-highlight-label">Highlights</div>
                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                            {dashboardLoading ? (
                                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</div>
                            ) : (
                                dashboardData?.highlights?.map((h, i) => (
                                    <div className="ds-drow ds-highlight-row" key={i}>
                                        <div className="name">
                                            <span
                                                className="ds-dot"
                                                style={{
                                                    background: h.type === 'holiday' ? 'var(--off)'
                                                        : h.status === 'success' ? 'var(--present)'
                                                            : h.status === 'warning' ? 'var(--off)' : 'var(--absent)'
                                                }}
                                            />
                                            {h.title}
                                        </div>
                                        <div className="date">{h.time}</div>
                                    </div>
                                )) || <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No highlights</div>
                            )}
                        </div>
                    </div>

                    {/* ---- This month ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title">This month</div>
                        <div className="ds-month-grid">
                            <div className="ds-month-card att">
                                <div className="big">{dashboardLoading ? '–' : `${dashboardData?.attendance_percentage || 0}%`}</div>
                                <div className="lbl">Attendance</div>
                            </div>
                            <div className="ds-month-card prod">
                                <div className="big">{dashboardLoading ? '–' : `${dashboardData?.productivity_score || 0}%`}</div>
                                <div className="lbl">Productivity</div>
                            </div>
                            <div className="ds-month-card burn">
                                <div className="big">{dashboardLoading ? '–' : (dashboardData?.burnout_risk?.split(' ')[0] || 'N/A')}</div>
                                <div className="lbl">Burnout risk</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= Attendance tracker ================= */}
                <div className="ds-panel" style={{ marginBottom: 18 }}>
                    <div className="ds-tracker-head">
                        <div className="ds-panel-title serif" style={{ marginBottom: 0 }}>
                            <BarChart3 size={15} color="var(--rest)" /> Attendance tracker
                        </div>
                        <div className="ds-seg">
                            {[{ key: 'daily', label: 'Daily' }, { key: 'monthly', label: 'Monthly' }, { key: 'yearly', label: 'Yearly' }].map(f => (
                                <button
                                    key={f.key}
                                    className={attendanceChartMode === f.key ? 'active' : ''}
                                    onClick={() => handleAttendanceChartMode(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {attendanceChartLoading ? (
                        <div className="ds-empty">Loading…</div>
                    ) : attendanceChartData.length > 0 ? (
                        <div className="ds-chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={attendanceChartData}>
                                    <defs>
                                        <linearGradient id="dsAttGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.16} />
                                            <stop offset="100%" stopColor="#7C5CFC" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 10, fill: '#A0A4B8', fontFamily: 'Inter' }}
                                        axisLine={false} tickLine={false}
                                        interval={attendanceChartMode === 'daily' ? 4 : 0}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#A0A4B8', fontFamily: 'Inter' }}
                                        axisLine={false} tickLine={false} width={38}
                                        label={{
                                            value: attendanceChartMode === 'daily' ? 'Hours' : 'Days',
                                            angle: -90, position: 'insideLeft', offset: 12,
                                            style: { fontSize: 11, fill: '#A0A4B8' }
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12.5, borderRadius: 10, fontFamily: 'Inter',
                                            border: '1px solid var(--border)',
                                            boxShadow: '0 8px 24px -12px rgba(20,24,45,0.18)'
                                        }}
                                        formatter={(v) => [attendanceChartMode === 'daily' ? `${v} hrs` : `${v} days`, '']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey={attendanceChartMode === 'daily' ? 'hours' : 'days'}
                                        stroke="#7C5CFC" fill="url(#dsAttGrad)" strokeWidth={2}
                                        dot={{ r: attendanceChartMode === 'yearly' ? 4 : 3, fill: '#7C5CFC', strokeWidth: 0 }}
                                        activeDot={{ r: 5, stroke: '#7C5CFC', strokeWidth: 2, fill: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="ds-empty">No attendance data</div>
                    )}
                </div>

                {/* ================= Row 3 ================= */}
                <div className="ds-row2">

                    {/* ---- Leave balance donut ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title serif">
                            <TreePalm size={15} color="var(--off)" /> Leave balance
                        </div>

                        {leaveBalance ? (
                            <div className="ds-donut-wrap">
                                <div className="ds-donut-canvas">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={leaveBalance.types?.filter(t => t.remaining > 0).length > 0
                                                    ? leaveBalance.types.map(t => ({
                                                        name: t.name.replace(' Leave', '').replace('Compensatory ', 'C-'),
                                                        value: t.remaining
                                                    }))
                                                    : [{ name: 'No leaves', value: 1 }]
                                                }
                                                cx="50%" cy="50%"
                                                innerRadius={58} outerRadius={82}
                                                paddingAngle={2} dataKey="value"
                                                stroke="none"
                                            >
                                                {LEAVE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12.5, borderRadius: 10, fontFamily: 'Inter',
                                                    border: '1px solid var(--border)'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="ds-legend-list">
                                    {leaveBalance.types?.map((t, i) => (
                                        <div className="item" key={i}>
                                            <span className="ds-swatch" style={{ background: LEAVE_COLORS[i % LEAVE_COLORS.length] }} />
                                            {t.name.replace(' Leave', '').replace('Compensatory ', 'C-')}
                                            <span className="v">{t.remaining}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="ds-empty">Loading…</div>
                        )}
                    </div>

                    {/* ---- Salary trend ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title serif">
                            <TrendingUp size={15} color="var(--present)" /> Salary trend (last 6 months)
                        </div>

                        {payslipSummary.length > 0 ? (
                            <div className="ds-chart-wrap">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={payslipSummary}>
                                        <defs>
                                            <linearGradient id="dsSalaryGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#E5484D" stopOpacity={0.12} />
                                                <stop offset="100%" stopColor="#E5484D" stopOpacity={0.01} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 11, fill: '#A0A4B8', fontFamily: 'Inter' }}
                                            axisLine={false} tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#A0A4B8', fontFamily: 'Inter' }}
                                            axisLine={false} tickLine={false} width={48}
                                            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 12.5, borderRadius: 10, fontFamily: 'Inter',
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 8px 24px -12px rgba(20,24,45,0.18)'
                                            }}
                                            formatter={(v) => [`₹${v.toLocaleString()}`, '']}
                                        />
                                        <Area
                                            type="monotone" dataKey="net"
                                            stroke="#E5484D" fill="url(#dsSalaryGrad)" strokeWidth={2}
                                            name="Net salary" dot={{ r: 4, fill: '#E5484D', strokeWidth: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="ds-empty">No salary data yet</div>
                        )}
                    </div>
                </div>

                {/* ================= Row 4 ================= */}
                <div className="ds-row2" style={{ marginBottom: 0 }}>

                    {/* ---- Quick actions ---- */}
                    <div className="ds-panel">
                        <div className="ds-panel-title serif" style={{ marginBottom: 14 }}>Quick actions</div>
                        <div className="ds-qa-grid">
                            {[
                                { icon: <TreePalm size={15} />, label: 'Apply leave', to: '/employee/leaves/apply', cls: 'g1' },
                                { icon: <FileText size={15} />, label: 'View payslip', to: '/employee/salary', cls: 'g2' },
                                { icon: <Calendar size={15} />, label: 'Holidays', to: '/employee/holidays', cls: 'g3' },
                                { icon: <Sun size={15} />, label: 'Give kudos', to: '/employee/engage', cls: 'g4' },
                            ].map((item, i) => (
                                <button key={i} className={`ds-qa-btn ${item.cls}`} onClick={() => navigate(item.to)}>
                                    {item.icon} {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ---- Company policy ---- */}
                    <div className="ds-panel ds-policy-panel">
                        <div className="ds-panel-title serif">
                            <ScrollText size={15} color="var(--absent)" /> Company policy
                        </div>
                        <ul className="ds-policy-list">
                            <li>Working hours <b>11 AM – 8 PM</b></li>
                            <li>Monthly leaves <b>1.5 days/month (FTE)</b></li>
                            <li>Week off <b>Saturday &amp; Sunday</b></li>
                        </ul>
                        <div className="ds-policy-note">
                            Adherence required to avoid payroll discrepancies.
                        </div>
                    </div>
                </div>

                {/* ============ Non-working day confirmation ============ */}
                {compOffPrompt && (
                    <div className="ds-modal-backdrop" onClick={() => setCompOffPrompt(null)}>
                        <div className="ds-modal ds-modal-sm" onClick={e => e.stopPropagation()}>
                            <div className="ds-modal-head">
                                <div className="ds-panel-title serif" style={{ marginBottom: 0 }}>
                                    <AlertTriangle size={16} color="var(--off)" /> Non-working day
                                </div>
                                <button className="ds-modal-close" onClick={() => setCompOffPrompt(null)}>×</button>
                            </div>

                            <div className="ds-modal-body">
                                <div className="ds-daychip">{compOffPrompt.day_info?.label}</div>

                                <p className="ds-modal-copy">{compOffPrompt.message}</p>

                                <ul className="ds-modal-list">
                                    <li>Your sign-in will be recorded and sent to your admin.</li>
                                    <li>Compensatory Off is credited <strong>only if the admin approves</strong>.</li>
                                    <li>If it is rejected, no comp-off is added.</li>
                                </ul>
                            </div>

                            <div className="ds-modal-foot">
                                <button className="ds-btn" onClick={() => setCompOffPrompt(null)}>
                                    Cancel
                                </button>
                                <button className="ds-submit-btn" onClick={confirmCompOffPunch} disabled={punchLoading}>
                                    {punchLoading ? 'Signing in…' : 'Sign in & request Comp-Off'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= Punch result ================= */}
                {punchResult && (
                    <div className="ds-modal-backdrop" onClick={() => setPunchResult(null)}>
                        <div className="ds-modal ds-modal-sm" onClick={e => e.stopPropagation()}>
                            <div className="ds-modal-head">
                                <div className="ds-panel-title serif" style={{ marginBottom: 0 }}>
                                    {punchResult.tone === 'error'
                                        ? <><AlertTriangle size={16} color="var(--absent)" /> {punchResult.title}</>
                                        : punchResult.tone === 'compoff'
                                            ? <><Clock size={16} color="var(--accent)" /> {punchResult.title}</>
                                            : <><CheckCircle2 size={16} color="var(--present)" /> {punchResult.title}</>}
                                </div>
                                <button className="ds-modal-close" onClick={() => setPunchResult(null)}>×</button>
                            </div>

                            <div className="ds-modal-body">
                                <p className="ds-modal-copy" style={{ margin: 0 }}>{punchResult.body}</p>
                            </div>

                            <div className="ds-modal-foot">
                                <button className="ds-submit-btn" onClick={() => setPunchResult(null)}>Got it</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= Swipe history modal ================= */}
                {showSwipeModal && (
                    <div className="ds-modal-backdrop" onClick={() => setShowSwipeModal(false)}>
                        <div className="ds-modal" onClick={e => e.stopPropagation()}>
                            <div className="ds-modal-head">
                                <div className="ds-panel-title serif" style={{ marginBottom: 0 }}>
                                    <Clock size={16} color="var(--accent)" /> Attendance swipes (last 30 days)
                                </div>
                                <button className="ds-modal-close" onClick={() => setShowSwipeModal(false)}>×</button>
                            </div>

                            <div className="ds-modal-body">
                                {attendanceHistory.length === 0 ? (
                                    <div className="ds-empty">No swipe records found.</div>
                                ) : attendanceHistory.map((s, i) => (
                                    <div className="ds-swipe-row" key={i}>
                                        <div className="who">
                                            <span
                                                className="ds-dot"
                                                style={{ background: s.action === 'sign_in' ? 'var(--present)' : 'var(--absent)' }}
                                            />
                                            <div>
                                                <div className="t">{s.action === 'sign_in' ? 'Sign in' : 'Sign out'}</div>
                                                <div className="s">{s.location}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="t" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="s">{new Date(s.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default HomeDashboard;
