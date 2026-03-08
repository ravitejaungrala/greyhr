import React, { useRef, useState, useEffect } from 'react';

const AttendanceScan = ({ userId }) => {
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error
    const [todayStatus, setTodayStatus] = useState({ last_punch: null, status: 'Not Signed In' });
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [livenessStatus, setLivenessStatus] = useState('none'); // none, prompt, left, right, verified
    const [capturedFaces, setCapturedFaces] = useState({ front: null, left: null, right: null });
    const [recentCaptures, setRecentCaptures] = useState([]);
    const [selectedAction, setSelectedAction] = useState(null); // 'sign_in' or 'sign_out'
    const [isRequestingWeekend, setIsRequestingWeekend] = useState(false);
    const [weekendReqDate, setWeekendReqDate] = useState('');
    const [weekendReqReason, setWeekendReqReason] = useState('');
    const [weekendReqStatus, setWeekendReqStatus] = useState(null);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

        // Landmark indices for eyes (approximate EAR calculation)
        const leftUpper = landmarks[159];
        const leftLower = landmarks[145];
        const eyeDist = Math.sqrt(Math.pow(leftUpper.x - leftLower.x, 2) + Math.pow(leftUpper.y - leftLower.y, 2));

        // Head pose estimation using ratio of nose to cheeks
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
                // User looks left (so nose moves towards right edge of camera)
                if (headRatio > 0.65) {
                    captureFrame('left');
                    return 'right';
                }
            } else if (prev === 'right') {
                // User looks right (so nose moves towards left edge of camera)
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
            setCapturedFaces({ front: null, left: null, right: null });
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
                    location: "Office WiFi",
                    action_type: actionType
                })
            });

            if (response.ok) {
                setScanStatus('success');
                // Refresh data
                fetchInitialData();

                // Auto-stop camera after successful scan after a few seconds
                setTimeout(() => {
                    stopCamera();
                }, 3000);
            } else {
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
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(200, 76, 255, 0.2)',
                                    border: '2px solid var(--violet)',
                                    animation: 'pulse 1.5s infinite'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: '50%', left: 0, right: 0, height: '2px',
                                        backgroundColor: 'var(--violet)', boxShadow: '0 0 10px var(--violet)',
                                        animation: 'scan-line 2s linear infinite'
                                    }}></div>
                                </div>
                            )}

                            {livenessStatus === 'prompt' && scanStatus === 'idle' && (
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px',
                                    color: 'var(--text-light)', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid var(--border-color)'
                                }}>
                                    👁️ Blink once to verify liveness
                                </div>
                            )}

                            {livenessStatus === 'left' && scanStatus === 'idle' && (
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px',
                                    color: 'var(--text-light)', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid var(--border-color)'
                                }}>
                                    ⬅️ Slowly Turn Head Left
                                </div>
                            )}

                            {livenessStatus === 'right' && scanStatus === 'idle' && (
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.7)', borderRadius: '20px',
                                    color: 'var(--text-light)', whiteSpace: 'nowrap', fontSize: '0.9rem', border: '1px solid var(--border-color)'
                                }}>
                                    ➡️ Slowly Turn Head Right
                                </div>
                            )}

                            {livenessStatus === 'verified' && scanStatus === 'idle' && (
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '0.5rem 1rem', background: 'rgba(10, 102, 194, 0.9)', borderRadius: '20px',
                                    color: 'var(--text-light)', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 'bold'
                                }}>
                                    ✅ Liveness Verified
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
                @keyframes pulse {
                    0% { opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default AttendanceScan;
