import React, { useRef, useState, useEffect } from 'react';
import { API_URL } from '../config';

const AttendanceScan = ({ userId }) => {
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error
    const [todayStatus, setTodayStatus] = useState({ last_punch: null, status: 'Not Signed In' });
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [livenessStatus, setLivenessStatus] = useState('none'); // none, prompt, left, right, verified
    const [capturedFaces, setCapturedFaces] = useState({ front: null, left: null, right: null, profile: null });
    const [recentCaptures, setRecentCaptures] = useState([]);
    const [selectedAction, setSelectedAction] = useState(null); // 'sign_in' or 'sign_out'
    const [isRequestingWeekend, setIsRequestingWeekend] = useState(false);
    const [weekendReqDate, setWeekendReqDate] = useState('');
    const [weekendReqReason, setWeekendReqReason] = useState('');
    const [weekendReqStatus, setWeekendReqStatus] = useState(null);
    const [headRotation, setHeadRotation] = useState(0.5);
    const [eyeBlinkValue, setEyeBlinkValue] = useState(0.03);
    const [flashActive, setFlashActive] = useState(false);
    const [scanWarning, setScanWarning] = useState('');

    const apiUrl = API_URL;

    // Mediapipe Refs
    const faceMeshRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        fetchInitialData();
        loadMediapipe();
    }, [userId]);

    const loadMediapipe = async () => {
        // We'll use CDN for Mediapipe as it's more reliable for this environment
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
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Liveness Detection Math
        const leftUpper = landmarks[159];
        const leftLower = landmarks[145];
        const eyeDist = Math.sqrt(Math.pow(leftUpper.x - leftLower.x, 2) + Math.pow(leftUpper.y - leftLower.y, 2));

        const nose = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const checkDist = rightCheek.x - leftCheek.x;
        const headRatio = checkDist > 0 ? (nose.x - leftCheek.x) / checkDist : 0.5;

        // Visual Feedback Refs for SVG
        setHeadRotation(headRatio);
        setEyeBlinkValue(eyeDist);

        setLivenessStatus(prev => {
            if (prev === 'prompt') {
                if (eyeDist < 0.015) { // Blink detected
                    triggerFlash();
                    captureFrame('front');
                    return 'left';
                }
            } else if (prev === 'left') {
                if (headRatio > 0.7) { // Look Left
                    triggerFlash();
                    captureFrame('left');
                    return 'right';
                }
            } else if (prev === 'right') {
                if (headRatio < 0.3) { // Look Right
                    triggerFlash();
                    captureFrame('right');
                    return 'profile_capture';
                }
            } else if (prev === 'profile_capture') {
                // Wait for user to look center
                if (headRatio > 0.45 && headRatio < 0.55) {
                    setTimeout(() => {
                        triggerFlash();
                        captureFrame('profile');
                        setLivenessStatus('verified');
                    }, 1000);
                }
            }
            return prev;
        });
    };

    const triggerFlash = () => {
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 200);
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

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [statusRes, historyRes] = await Promise.all([
                fetch(`${apiUrl}/employee/attendance/status?employee_id=${userId || "EMP_UNKNOWN"}`),
                fetch(`${apiUrl}/employee/attendance/calendar?employee_id=${userId || "EMP_UNKNOWN"}`)
            ]);
            const statusData = await statusRes.json();
            const historyData = await historyRes.json();
            setTodayStatus(statusData);
            setAttendanceHistory(historyData.history || []);
            setRecentCaptures(historyData.recent_captures || []);
        } catch (err) {
            console.error("Error fetching attendance data:", err);
        } finally {
            setLoading(false);
        }
    };

    const cameraRef = useRef(null);

    const startCamera = async (action = 'sign_in') => {
        setSelectedAction(action);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStreamActive(true);
            setScanStatus('idle');
            setLivenessStatus('prompt');
            setScanWarning('');
            isClosedRef.current = false;

            // We set the stream on state or globally if needed, 
            // but for simple sync we can just let the useEffect handle it.
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setScanStatus('error');
        }
    };

    const formatTime = (isoString) => {
        if (!isoString || isoString === "-") return "-";
        try {
            // If the string doesn't end with Z or a timezone offset (+/-), append Z to ensure UTC parsing
            let normalizedIso = isoString;
            if (!isoString.includes('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(isoString)) {
                normalizedIso += 'Z';
            }
            const date = new Date(normalizedIso);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "-";
        }
    };

    // Initialize MediaPipe Camera when video ref is ready
    useEffect(() => {
        if (streamActive && videoRef.current && window.Camera && faceMeshRef.current && livenessStatus !== 'none' && livenessStatus !== 'verified') {
            if (!cameraRef.current) {
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
    }, [streamActive, livenessStatus]);

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            setStreamActive(false);
            setLivenessStatus('none');
            setCapturedFaces({ front: null, left: null, right: null, profile: null });
        }
    };

    const handleScan = async (actionType) => {
        if (!streamActive || !videoRef.current) return;
        setScanStatus('scanning');

        try {
            const response = await fetch(`${apiUrl}/attendance/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId || "EMP_UNKNOWN",
                    image_base64: capturedFaces.front,
                    image_left_base64: capturedFaces.left,
                    image_right_base64: capturedFaces.right,
                    image_profile_base64: capturedFaces.profile,
                    location: "Office WiFi",
                    action_type: actionType
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.warning) {
                    setScanWarning(result.warning);
                }
                setScanStatus('success');
                // Refresh data
                fetchInitialData();

                // Auto-stop camera after successful scan after a few seconds
                setTimeout(() => {
                    stopCamera();
                }, result.warning ? 6000 : 3000); // Wait longer if there's a warning
            } else {
                const errData = await response.json();
                if (errData.detail) setScanWarning(errData.detail);
                setScanStatus('error');
            }
        } catch (err) {
            console.error(err);
            setScanStatus('error');
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleRequestWeekendWork = async () => {
        if (!weekendReqDate) return;
        try {
            const res = await fetch(`${apiUrl}/employee/weekend-work/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId,
                    date: weekendReqDate,
                    reason: weekendReqReason
                })
            });
            if (res.ok) {
                setWeekendReqStatus('success');
                setWeekendReqReason('');
                setTimeout(() => {
                    setIsRequestingWeekend(false);
                    setWeekendReqStatus(null);
                }, 2000);
            } else {
                setWeekendReqStatus('error');
            }
        } catch (err) {
            setWeekendReqStatus('error');
        }
    };

    // Helper for calendar days
    const getDaysInMonth = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => {
            const d = new Date(year, month, i + 1);
            const iso = d.toISOString().split('T')[0];
            const match = attendanceHistory.find(h => h.date === iso);
            return { day: i + 1, date: iso, ...match };
        });
    };

    return (
        <div className="attendance-scan">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>
                AI Face Scan Sign In/Out
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Camera & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="video-container" style={{
                            borderColor: scanStatus === 'success' ? 'var(--secondary)' :
                                scanStatus === 'scanning' ? 'var(--violet)' : 'var(--primary)',
                            width: '100%',
                            height: '300px'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ display: streamActive ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {!streamActive && scanStatus !== 'error' && (
                                <div style={{ color: 'var(--text-muted)' }}>Camera Off</div>
                            )}
                            {scanStatus === 'error' && (
                                <div style={{ color: '#EF4444' }}>Camera permission denied</div>
                            )}

                            {scanStatus === 'scanning' && (
                                <div className="scanning-overlay">
                                    <div className="scanning-line"></div>
                                </div>
                            )}

                            {/* Flash Effect */}
                            {flashActive && <div className="shutter-flash-overlay" />}

                            {/* High-Fidelity SVG Overlay */}
                            {streamActive && livenessStatus !== 'none' && (
                                <div className="biometric-svg-overlay">
                                    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                                        <path 
                                            d="M100,25 c-35,0-55,25-55,60 c0,40,25,90,55,90 s55-45,55-90 C155,50,135,25,100,25" 
                                            fill="none" 
                                            stroke={livenessStatus === 'verified' ? '#22C55E' : 'rgba(255,122,0,0.4)'} 
                                            strokeWidth="1.5"
                                            strokeDasharray="5,5"
                                            style={{ transform: `rotateY(${(headRotation - 0.5) * 60}deg)`, transformOrigin: 'center' }}
                                        />
                                        <g opacity="0.2">
                                            <path d="M60,60 Q100,40 140,60" fill="none" stroke="#fff" strokeWidth="0.5" />
                                            <path d="M50,90 Q100,70 150,90" fill="none" stroke="#fff" strokeWidth="0.5" />
                                            <path d="M100,25 Q90,100 100,175" fill="none" stroke="#fff" strokeWidth="0.5" />
                                        </g>
                                        {/* Status Text on SVG */}
                                        <text x="50%" y="185" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                            {livenessStatus === 'prompt' ? 'PLEASE BLINK' : 
                                             livenessStatus === 'left' ? 'TURN HEAD LEFT' :
                                             livenessStatus === 'right' ? 'TURN HEAD RIGHT' :
                                             livenessStatus === 'profile_capture' ? 'LOOK CENTER FOR PHOTO' : 'SECURITY VERIFIED'}
                                        </text>
                                    </svg>
                                </div>
                            )}

                            {scanStatus === 'idle' && livenessStatus !== 'none' && livenessStatus !== 'verified' && (
                                <div className="liveness-prompt-toast">
                                    {livenessStatus === 'prompt' && "👁️ Liveness Check: Please Blink"}
                                    {livenessStatus === 'left' && "⬅️ Step 1: Turn Head Left"}
                                    {livenessStatus === 'right' && "➡️ Step 2: Turn Head Right"}
                                    {livenessStatus === 'profile_capture' && "📸 Final: Look at camera for ID Photo"}
                                </div>
                            )}

                            {livenessStatus === 'verified' && scanStatus === 'idle' && (
                                <div className="liveness-success-toast">
                                    🛡️ IDENTITY SECURELY VERIFIED
                                </div>
                            )}

                            {scanWarning && (
                                <div className={`liveness-prompt-toast ${scanStatus === 'error' ? 'error-toast' : 'warning-toast'}`} style={{ 
                                    backgroundColor: scanStatus === 'error' ? '#EF4444' : '#F59E0B',
                                    top: 'auto',
                                    bottom: '20px',
                                    textAlign: 'center',
                                    width: '80%',
                                    zIndex: 100
                                }}>
                                    {scanStatus === 'error' ? '❌ ' : '⚠️ '} {scanWarning}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            {!streamActive ? (
                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                    <button className="btn btn-primary" onClick={() => startCamera('sign_in')} disabled={todayStatus.action === 'sign_in'}>
                                        🔘 Sign In
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => startCamera('sign_out')}>
                                        🔘 Sign Out
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleScan(selectedAction)}
                                        disabled={scanStatus === 'scanning' || scanStatus === 'success' || livenessStatus !== 'verified'}
                                        style={{ opacity: livenessStatus === 'verified' ? 1 : 0.5 }}
                                    >
                                        {scanStatus === 'scanning' ? 'Verifying...' : `Confirm ${selectedAction === 'sign_in' ? 'Sign In' : 'Sign Out'}`}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={stopCamera}
                                        disabled={scanStatus === 'scanning'}
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Today's Status</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Current Status</div>
                            <div style={{ fontWeight: 'bold', color: todayStatus.last_punch ? 'var(--secondary)' : 'var(--primary)' }}>
                                {todayStatus.status}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Latest Interaction</div>
                            <div style={{ fontWeight: 'bold' }}>{formatTime(todayStatus.last_punch)}</div>
                        </div>
                        {livenessStatus === 'verified' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                                Identity verified via Active Liveness
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Calendar & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card glass-panel">
                        <h2 className="card-title">📅 Attendance Calendar</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={`${d}-${i}`} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.5 }}>{d}</div>
                            ))}
                            {getDaysInMonth().map((d, i) => (
                                <div
                                    key={i}
                                    className="btn"
                                    style={{
                                        padding: '0.5rem 0',
                                        minWidth: 'auto',
                                        fontSize: '0.8rem',
                                        backgroundColor: d.status ? (d.color || (d.status === 'Present' ? 'rgba(10, 102, 194, 0.2)' : 'rgba(255,255,255,0.05)')) : 'transparent',
                                        borderColor: d.color || (d.status ? (d.status === 'Present' ? 'var(--secondary)' : 'var(--border-color)') : 'transparent'),
                                        color: d.status === 'Present' || d.status === 'Leave' || d.status?.includes('Present') ? 'white' : 'var(--text-muted)',
                                        position: 'relative'
                                    }}
                                    title={`${d.date}: ${d.status || 'No record'}${d.deduction ? ` (Deduction: ₹${d.deduction})` : ''}`}
                                >
                                    {d.day}
                                    {d.deduction > 0 && (
                                        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }}></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Weekend/Holiday Work Request */}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            {!isRequestingWeekend ? (
                                <button
                                    onClick={() => setIsRequestingWeekend(true)}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', fontSize: '0.8rem', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
                                >
                                    🙋‍♂️ Request to Work on Weekend/Holiday
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)' }}>New Work Request</div>
                                    <input
                                        type="date"
                                        className="input"
                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                                        value={weekendReqDate}
                                        onChange={(e) => setWeekendReqDate(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Reason (optional)"
                                        className="input"
                                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                                        value={weekendReqReason}
                                        onChange={(e) => setWeekendReqReason(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={handleRequestWeekendWork}
                                            className="btn btn-primary"
                                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                                        >
                                            {weekendReqStatus === 'success' ? 'Sent!' : 'Submit'}
                                        </button>
                                        <button
                                            onClick={() => setIsRequestingWeekend(false)}
                                            className="btn btn-secondary"
                                            style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {weekendReqStatus === 'error' && <div style={{ color: '#EF4444', fontSize: '0.7rem' }}>Error submitting request.</div>}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div> Present
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }}></div> No Record
                            </div>
                        </div>
                    </div>

                    <div className="card glass-panel" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <h2 className="card-title">🤖 AI Agent Feedback</h2>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', fontSize: '0.875rem' }}>
                            <strong>Pattern Analysis:</strong> {todayStatus.last_punch ?
                                "System indicates you've successfully completed your identity verification." :
                                "Awaiting your daily sign-in to begin performance analysis."}
                        </div>
                    </div>

                    <div className="card glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h2 className="card-title">📜 Detailed History</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {attendanceHistory.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', py: '1rem' }}>No records found for this month.</div>
                            ) : (
                                attendanceHistory.slice().reverse().map((h, i) => (
                                    <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${h.color || 'var(--border-color)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                {new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                                                {h.day_label && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({h.day_label})</span>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: h.color || 'var(--secondary)', fontWeight: 'bold' }}>{h.status}</div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <div>In: <strong>{formatTime(h.first_in_raw)}</strong></div>
                                            <div>Out: <strong>{formatTime(h.last_out_raw)}</strong></div>
                                            <div>Total: <strong>{h.total_work_hrs}</strong></div>
                                        </div>
                                        {h.deduction > 0 && (
                                            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#EF4444', fontWeight: 'bold' }}>
                                                ⚠ Deduction: ₹{h.deduction.toFixed(2)}
                                            </div>
                                        )}
                                        {h.alert && (
                                            <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--primary)', fontStyle: 'italic' }}>
                                                💡 {h.alert}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card glass-panel">
                        <h2 className="card-title">📸 Recent Identity Captures</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {recentCaptures.slice(0, 8).map((h) => (
                                <div key={h.timestamp} style={{ position: 'relative' }}>
                                    <img
                                        src={`${apiUrl}/admin/photos/${h.s3_image_key}`}
                                        alt="History"
                                        style={{ width: '100%', aspectRatio: '1', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
                                        {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0%; transform: translateY(0); }
                    50% { top: 100%; transform: translateY(-2px); }
                    100% { top: 0%; transform: translateY(0); }
                }
                .shutter-flash-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: white;
                    z-index: 100;
                    animation: flash-anim 0.2s ease-out forwards;
                }
                @keyframes flash-anim {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .biometric-svg-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 10;
                    background: radial-gradient(circle, transparent 40%, rgba(8, 5, 16, 0.6) 100%);
                }
                .liveness-prompt-toast {
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 122, 0, 0.9);
                    padding: 8px 20px;
                    border-radius: 30px;
                    color: white;
                    font-size: 0.8rem;
                    font-weight: 800;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                    animation: fadeInDown 0.5s ease forwards;
                    z-index: 50;
                }
                .liveness-success-toast {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(34, 197, 94, 0.95);
                    padding: 15px 30px;
                    border-radius: 12px;
                    color: white;
                    font-weight: bold;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    z-index: 50;
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
};

export default AttendanceScan;
