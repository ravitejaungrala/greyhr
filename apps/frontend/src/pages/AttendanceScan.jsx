import React, { useRef, useState, useEffect } from 'react';

const AttendanceScan = ({ userId }) => {
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error
    const [todayStatus, setTodayStatus] = useState({ last_punch: null, status: 'Not Signed In' });
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [livenessStatus, setLivenessStatus] = useState('none'); // none, prompt, verified
    const [blinkCount, setBlinkCount] = useState(0);

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

    let lastEyeRatio = 1.0;
    let isClosed = false;

    const onResults = (results) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Landmark indices for eyes (approximate EAR calculation)
        // Left Eye: 159 (upper), 145 (lower)
        // Right Eye: 386 (upper), 374 (lower)
        const leftUpper = landmarks[159];
        const leftLower = landmarks[145];
        const dist = Math.sqrt(Math.pow(leftUpper.x - leftLower.x, 2) + Math.pow(leftUpper.y - leftLower.y, 2));

        // Simple threshold-based blink detection
        if (dist < 0.015 && !isClosed) {
            isClosed = true;
        } else if (dist > 0.02 && isClosed) {
            isClosed = false;
            setBlinkCount(prev => {
                const newCount = prev + 1;
                if (newCount >= 1) {
                    setLivenessStatus('verified');
                }
                return newCount;
            });
        }
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
        } catch (err) {
            console.error("Error fetching attendance data:", err);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStreamActive(true);
            setScanStatus('idle');
            setLivenessStatus('prompt');
            setBlinkCount(0);

            // Start Mediapipe tracking loop
            const camera = new window.Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480
            });
            camera.start();
        } catch (err) {
            console.error("Error accessing camera:", err);
            setScanStatus('error');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            setStreamActive(false);
            setLivenessStatus('none');
        }
    };

    const handleScan = async (actionType) => {
        if (!streamActive || !videoRef.current) return;
        setScanStatus('scanning');

        // Capture image from video
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg');

        try {
            const response = await fetch(`${apiUrl}/attendance/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId || "EMP_UNKNOWN",
                    image_base64: imageBase64,
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
                                scanStatus === 'scanning' ? '#F59E0B' : 'var(--primary)',
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
                                    background: 'rgba(245, 158, 11, 0.2)',
                                    border: '2px solid #F59E0B',
                                    animation: 'pulse 1.5s infinite'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: '50%', left: 0, right: 0, height: '2px',
                                        backgroundColor: '#F59E0B', boxShadow: '0 0 10px #F59E0B',
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

                            {livenessStatus === 'verified' && scanStatus === 'idle' && (
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.9)', borderRadius: '20px',
                                    color: 'var(--text-light)', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 'bold'
                                }}>
                                    ✅ Liveness Verified
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            {!streamActive ? (
                                <button className="btn btn-primary" onClick={startCamera}>
                                    📷 Open Camera
                                </button>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleScan('sign_in')}
                                        disabled={scanStatus === 'scanning' || scanStatus === 'success' || livenessStatus !== 'verified'}
                                        style={{ opacity: livenessStatus === 'verified' ? 1 : 0.5 }}
                                    >
                                        {scanStatus === 'scanning' ? 'Verifying...' : '🔘 Sign In Capture'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleScan('sign_out')}
                                        disabled={scanStatus === 'scanning' || scanStatus === 'success' || livenessStatus !== 'verified'}
                                        style={{ opacity: livenessStatus === 'verified' ? 1 : 0.5 }}
                                    >
                                        🔘 Sign Out Capture
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
                            <div style={{ fontWeight: 'bold' }}>{todayStatus.last_punch || 'Not available'}</div>
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
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.5 }}>{d}</div>
                            ))}
                            {getDaysInMonth().map((d, i) => (
                                <div
                                    key={i}
                                    className="btn"
                                    style={{
                                        padding: '0.5rem 0',
                                        minWidth: 'auto',
                                        fontSize: '0.8rem',
                                        backgroundColor: d.status ?
                                            (d.status === 'Present' ? 'rgba(16, 185, 129, 0.2)' :
                                                d.status.includes('Warning Type 2') ? 'rgba(245, 158, 11, 0.2)' :
                                                    'rgba(255,255,255,0.05)') : 'transparent',
                                        borderColor: d.status ?
                                            (d.status === 'Present' ? 'var(--secondary)' :
                                                d.status.includes('Warning Type 2') ? '#F59E0B' :
                                                    'var(--border-color)') : 'transparent',
                                        color: d.status === 'Present' ? 'white' :
                                            d.status.includes('Warning Type 2') ? '#F59E0B' :
                                                'var(--text-muted)'
                                    }}
                                    title={d.status || 'No record'}
                                >
                                    {d.day}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div> Present
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></div> Warning (Missing Sign-out)
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

                    <div className="card glass-panel">
                        <h2 className="card-title">📸 Recent Identity Captures</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {attendanceHistory.slice(0, 8).map((h, i) => (
                                <div key={i} style={{ position: 'relative' }}>
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
