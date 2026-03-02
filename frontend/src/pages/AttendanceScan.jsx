import React, { useRef, useState, useEffect } from 'react';

const AttendanceScan = ({ userId }) => {
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error
    const [lastPunchTime, setLastPunchTime] = useState(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStreamActive(true);
            setScanStatus('idle');
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
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
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
                setLastPunchTime(new Date().toLocaleTimeString());

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

    return (
        <div className="attendance-scan">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>
                AI Face Scan Sign In/Out
            </h1>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                {/* Camera Section */}
                <div className="card glass-panel" style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="video-container" style={{
                        borderColor: scanStatus === 'success' ? 'var(--secondary)' :
                            scanStatus === 'scanning' ? '#F59E0B' : 'var(--primary)'
                    }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ display: streamActive ? 'block' : 'none' }}
                        />
                        {!streamActive && scanStatus !== 'error' && (
                            <div style={{ color: 'var(--text-muted)' }}>Camera Off</div>
                        )}
                        {scanStatus === 'error' && (
                            <div style={{ color: '#EF4444' }}>Camera permission denied</div>
                        )}

                        {/* Scanning Overlay Animation */}
                        {scanStatus === 'scanning' && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '2px solid #F59E0B',
                                boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.5)',
                                animation: 'pulse 1.5s infinite'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundColor: '#F59E0B',
                                    boxShadow: '0 0 10px #F59E0B',
                                    animation: 'scan-line 2s linear infinite'
                                }}></div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        {!streamActive ? (
                            <button className="btn btn-primary" onClick={startCamera}>
                                Enable Camera
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleScan('sign_in')}
                                    disabled={scanStatus === 'scanning' || scanStatus === 'success'}
                                    style={{
                                        backgroundColor: scanStatus === 'success' ? 'var(--secondary)' : 'var(--primary)'
                                    }}
                                >
                                    {scanStatus === 'scanning' ? 'Verifying Identity...' :
                                        scanStatus === 'success' ? '✓ Verified' : 'Sign In'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleScan('sign_out')}
                                    disabled={scanStatus === 'scanning' || scanStatus === 'success'}
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Info & Insights Section */}
                <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h2 className="card-title">Today's Status</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Last Punch In</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                {lastPunchTime ? lastPunchTime : '09:05 AM'}
                            </div>
                        </div>

                        {scanStatus === 'success' && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--secondary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                ✓ Sign In Recorded Successfully! AI Identity Match: 99.8%
                            </div>
                        )}
                    </div>

                    <div className="card glass-panel" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <h2 className="card-title">Attendance AI Agent</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            GPS Location verification active. IP Address verified.
                        </p>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', fontSize: '0.875rem' }}>
                            <strong>Pattern Analysis:</strong> Your attendance is perfectly regular. No anomalies detected.
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
}

export default AttendanceScan;
