import React, { useRef, useState, useEffect } from 'react';
import { 
    ScanFace, Camera, User, 
    Calendar, CheckCircle2, History,
    AlertTriangle, ShieldCheck, ToggleRight
} from 'lucide-react';
import { API_URL } from '../config';

const AttendanceScan = ({ userId }) => {
    const videoRef = useRef(null);
    const [streamActive, setStreamActive] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, success, error
    const [todayStatus, setTodayStatus] = useState({ last_punch: null, status: 'Not Signed In' });
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAction, setSelectedAction] = useState(null); // 'sign_in' or 'sign_out'
    const [scanWarning, setScanWarning] = useState('');
    const [recentCaptures, setRecentCaptures] = useState([]);

    const apiUrl = API_URL;

    useEffect(() => {
        fetchInitialData();
    }, [userId]);

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

    const startCamera = async (action = 'sign_in') => {
        setSelectedAction(action);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStreamActive(true);
            setScanStatus('idle');
            setScanWarning('');
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setScanStatus('error');
            setScanWarning('Camera access denied. Please enable camera permissions.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            setStreamActive(false);
        }
    };

    const captureFrame = () => {
        if (!videoRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg');
    };

    const handlePunch = async () => {
        if (!streamActive || !videoRef.current) return;
        setScanStatus('scanning');
        
        const imageBase64 = captureFrame();
        if (!imageBase64) {
            setScanStatus('error');
            setScanWarning('Failed to capture image.');
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/attendance/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId || "EMP_UNKNOWN",
                    image_base64: imageBase64,
                    location: "Office WiFi",
                    action_type: selectedAction
                })
            });

            const result = await response.json();

            if (response.ok) {
                if (result.warning) setScanWarning(result.warning);
                setScanStatus('success');
                fetchInitialData();
                setTimeout(() => stopCamera(), 3000);
            } else {
                setScanWarning(result.error || result.detail || 'Punch failed');
                setScanStatus('error');
            }
        } catch (err) {
            console.error(err);
            setScanStatus('error');
        }
    };

    const formatTime = (isoString) => {
        if (!isoString || isoString === "-") return "-";
        try {
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
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={32} color="var(--primary)" /> Attendance Punch In/Out
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card shadow-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <div className="video-container" style={{
                            borderColor: scanStatus === 'success' ? '#22C55E' :
                                scanStatus === 'scanning' ? '#8B5CF6' : '#FF4500',
                            width: '100%',
                            height: '300px',
                            position: 'relative',
                            backgroundColor: '#000',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ display: streamActive ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {!streamActive && (
                                <div style={{ color: '#fff', opacity: 0.5 }}>Camera Standby</div>
                            )}

                            {scanStatus === 'scanning' && (
                                <div className="scanning-overlay">
                                    <div className="scanning-line"></div>
                                </div>
                            )}

                            {scanWarning && (
                                <div style={{ 
                                    position: 'absolute',
                                    bottom: '20px',
                                    backgroundColor: scanStatus === 'error' ? '#EF4444' : '#F59E0B',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    zIndex: 100
                                }}>
                                    {scanWarning}
                                </div>
                            )}
                            
                            {scanStatus === 'success' && (
                                <div style={{ 
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'rgba(34, 197, 94, 0.9)',
                                    color: 'white',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    zIndex: 101
                                }}>
                                    SUCCESSFULLY RECORDED
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            {!streamActive ? (
                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                     <button className="btn btn-primary" onClick={() => startCamera('sign_in')} disabled={todayStatus.status === 'Signed In'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                         <ScanFace size={18} /> Sign In
                                     </button>
                                     <button className="btn btn-secondary" onClick={() => startCamera('sign_out')} disabled={todayStatus.status === 'Signed Out' || todayStatus.status === 'Not Signed In'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                         <ScanFace size={18} /> Sign Out
                                     </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handlePunch}
                                        disabled={scanStatus === 'scanning' || scanStatus === 'success'}
                                    >
                                        {scanStatus === 'scanning' ? 'Processing...' : `Confirm ${selectedAction === 'sign_in' ? 'Sign In' : 'Sign Out'}`}
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

                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <h2 className="card-title">Today's Status</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Current Status</div>
                            <div style={{ fontWeight: 'bold', color: todayStatus.status === 'Signed In' ? '#22C55E' : '#FF4500' }}>
                                {todayStatus.status}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Latest Interaction</div>
                            <div style={{ fontWeight: 'bold' }}>{formatTime(todayStatus.last_punch)}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20} /> Attendance Calendar</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.5 }}>{d}</div>
                            ))}
                            {getDaysInMonth().map((d, i) => (
                                <div key={i} className="btn" style={{
                                    padding: '0.5rem 0', minWidth: 'auto', fontSize: '0.8rem',
                                    backgroundColor: d.status === 'Present' ? '#E6F0FF' : 'transparent',
                                    borderColor: d.status === 'Present' ? '#ff4500' : 'transparent',
                                    color: d.status === 'Present' ? '#ff4500' : 'var(--text-muted)'
                                }}>{d.day}</div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
            <style>{`
                .scanning-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
                .scanning-line { position: absolute; width: 100%; height: 2px; background: #FF4500; box-shadow: 0 0 15px #FF4500; animation: scan-anim 2s linear infinite; }
                @keyframes scan-anim { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
            `}</style>
        </div>
    );
};

export default AttendanceScan;
