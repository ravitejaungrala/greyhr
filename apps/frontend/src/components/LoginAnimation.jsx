
import React, { useState, useEffect } from 'react';
import './LoginAnimation.css';

const stages = [
    {
        id: 'auth',
        title: "Liveness Biometrics",
        description: "Verified identity via active liveness detection—blinking, turning, and secure image capture."
    },
    {
        id: 'docs',
        title: "Dynamic Doc Gen",
        description: "Personalized documents for John Doe instantly generated and dispatched via Outlook."
    },
    {
        id: 'workspace',
        title: "Smart Monitor",
        description: "Unified view of attendance, public holidays, and leaves for total workforce visibility."
    },
    {
        id: 'profile',
        title: "Verified Identity Card",
        description: "Automatic ID card generation featuring your verified biometric photo and employee credentials."
    },
    {
        id: 'upload',
        title: "AI Template Learning",
        description: "Admins can upload any company template for instant AI-powered layout analysis and saving."
    }
];

const LoginAnimation = () => {
    const [activeStage, setActiveStage] = useState(0);
    const [subState, setSubState] = useState('initial');
    const [isBlinking, setIsBlinking] = useState(false);

    const STAGE_DURATION = 12000; // Increased to 12s for complex narrative

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStage((prev) => (prev + 1) % stages.length);
        }, STAGE_DURATION);
        return () => clearInterval(interval);
    }, []);

    // Blinking effect
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 150);
        }, 3000);
        return () => clearInterval(blinkInterval);
    }, []);

    useEffect(() => {
        setSubState('initial');
        const stageId = stages[activeStage].id;

        if (stageId === 'auth') {
            setTimeout(() => setSubState('look-left'), 2000);
            setTimeout(() => setSubState('look-right'), 4500);
            setTimeout(() => setSubState('center'), 7000);
            setTimeout(() => setSubState('capture'), 8500);
            setTimeout(() => setSubState('verifying'), 9500);
            setTimeout(() => setSubState('verified'), 11000);
        } else if (stageId === 'docs') {
            setTimeout(() => setSubState('filling'), 500);
            setTimeout(() => setSubState('sending'), 7000);
        } else if (stageId === 'workspace') {
            setTimeout(() => setSubState('active'), 500);
        } else if (stageId === 'profile') {
            setTimeout(() => setSubState('visible'), 500);
        } else if (stageId === 'upload') {
            setTimeout(() => setSubState('uploading'), 500);
            setTimeout(() => setSubState('analyzing'), 4000);
            setTimeout(() => setSubState('saved'), 9000);
        }
    }, [activeStage]);

    const renderScene = () => {
        const stageId = stages[activeStage].id;

        if (stageId === 'auth') {
            const isFlash = subState === 'capture';
            return (
                <div className={`liveness-scanner ${isFlash ? 'flash-active' : ''} ${subState === 'capture' ? 'capture-active' : ''} ${subState.startsWith('look') ? subState : ''}`}>
                    <div className="camera-flash" />
                    <div className="capture-frame" />
                        <svg viewBox="0 0 200 200" width="300" height="300" className={`face-group ${isBlinking ? 'blinking' : ''}`}>
                            <defs>
                                <radialGradient id="livenessFaceGrad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#ff7a00" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#c84cff" stopOpacity="0.05" />
                                </radialGradient>
                            </defs>
                            {/* Main Face Contour */}
                            <path 
                                d="M100,25 c-35,0-55,25-55,60 c0,40,25,90,55,90 s55-45,55-90 C155,50,135,25,100,25" 
                                className="face-mesh-detailed"
                                fill="url(#livenessFaceGrad)"
                            />
                            {/* Scanning Mesh Lines - Wireframe feel */}
                            <g opacity="0.15" stroke="var(--primary)" strokeWidth="0.5" fill="none">
                                <path d="M60,60 Q100,40 140,60" />
                                <path d="M50,90 Q100,70 150,90" />
                                <path d="M55,120 Q100,100 145,120" />
                                <path d="M100,25 Q90,100 100,175" />
                                <path d="M70,35 Q60,100 80,165" />
                                <path d="M130,35 Q140,100 120,165" />
                            </g>
                            {/* Eyes */}
                        <g className="eye-group">
                            <ellipse cx="75" cy="85" rx="6" ry="4" className="eye-path" />
                            <ellipse cx="125" cy="85" rx="6" ry="4" className="eye-path" />
                        </g>
                        {/* Nose and Mouth */}
                        <path d="M100,90 v20 l-5,5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                        <path d="M85,140 Q100,150 115,140" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

                        {subState === 'verified' && (
                            <g>
                                <circle cx="100" cy="90" r="45" fill="rgba(34, 197, 94, 0.4)" stroke="#22C55E" strokeWidth="2" />
                                <path d="M85,90 l10,10 l20,-20" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                            </g>
                        )}
                    </svg>
                    <div style={{position: 'absolute', bottom: '20px', color: subState === 'verified' ? '#22C55E' : 'rgba(255,255,255,0.6)', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        {subState === 'look-left' ? 'TURN HEAD LEFT' : 
                         subState === 'look-right' ? 'TURN HEAD RIGHT' : 
                         subState === 'capture' ? 'CAPTURING...' : 
                         subState === 'verifying' ? 'ANALYZING LIVENESS...' : 
                         subState === 'verified' ? 'IDENTITY VERIFIED' : 'ALIGN FACE'}
                    </div>
                </div>
            );
        }

        if (stageId === 'docs') {
            return (
                <div className={`scene-wrapper ${subState === 'sending' ? 'dispatched' : ''}`}>
                    <div className="personalized-doc">
                        <div className="doc-recipient-name">John Doe</div>
                        <p style={{fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '5px'}}>Official Offer Certificate</p>
                        <div style={{marginTop: '20px'}}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} style={{ height: '3px', background: 'rgba(255,255,255,0.1)', marginBottom: '10px', width: `${Math.random() * 40 + 60}%`, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: subState === 'initial' ? '0%' : '100%', background: 'var(--primary)', transition: `width 3s ease ${i * 0.2}s` }} />
                                </div>
                            ))}
                        </div>
                        <div className="dispatch-plane">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="#0078D4">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </div>
                    </div>
                    {subState === 'sending' && <div style={{position: 'absolute', bottom: '20px', color: '#0078D4', fontWeight: 'bold', fontSize: '0.8rem'}}>Sent via Outlook Support</div>}
                </div>
            );
        }

        if (stageId === 'workspace') {
            return (
                <div className="scene-wrapper">
                    <div className="calendar-glass">
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'white', fontWeight: 'bold'}}>
                            <span>Attendance Monitor</span>
                            <span style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)'}}>Oct 2024</span>
                        </div>
                        <div className="calendar-grid-detailed">
                            {[...Array(31)].map((_, i) => {
                                const day = i + 1;
                                const isHoliday = [2, 13, 20, 27].includes(day);
                                const isLeave = [9, 10].includes(day);
                                return (
                                    <div key={i} className={`day-box ${isHoliday ? 'day-holiday' : isLeave ? 'day-leave' : 'day-present'}`}>{day}</div>
                                );
                            })}
                        </div>
                        <div className="calendar-legend">
                            <div className="legend-item"><div className="dot-p" /> Present</div>
                            <div className="legend-item"><div className="dot-h" /> Holiday</div>
                            <div className="legend-item"><div className="dot-l" /> Leave</div>
                        </div>
                    </div>
                </div>
            );
        }

        if (stageId === 'profile') {
            return (
                <div className="scene-wrapper">
                    <div className="id-card-visual" style={{opacity: subState === 'visible' ? 1 : 0, transition: 'all 0.8s ease'}}>
                        <div className="id-photo-placeholder">
                             <svg viewBox="0 0 200 200" width="140">
                                <path d="M100,40 c-20,0-35,15-35,35 c0,25,15,55,35,55 s35-30,35-55 C135,55,120,40,100,40" fill="#ff7a00" opacity="0.3" />
                                <path d="M50,180 c0-30,20-50,50-50 s50,20,50,50" fill="#ff7a00" opacity="0.2" />
                             </svg>
                        </div>
                        <h3 style={{color: 'white', margin: '0', fontSize: '1.2rem'}}>John Doe</h3>
                        <p style={{color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '20px'}}>SENIOR AI ENGINEER</p>
                        <div style={{width: '100%'}}>
                             <div className="detail-row-detailed"><span>Employee ID</span><span style={{color: 'white'}}>#NEU-882</span></div>
                             <div className="detail-row-detailed"><span>D.O.B</span><span style={{color: 'white'}}>12/04/1995</span></div>
                             <div className="detail-row-detailed"><span>Status</span><span style={{color: '#22C55E'}}>VERIFIED</span></div>
                        </div>
                        <div style={{marginTop: 'auto', width: '80%', height: '30px', background: 'linear-gradient(to right, #000 10%, #fff 10%, #fff 20%, #000 20%, #000 40%, #fff 40%, #fff 50%, #000 50%, #000 80%, #fff 80%)', opacity: 0.3, borderRadius: '4px'}}></div>
                    </div>
                </div>
            );
        }

        if (stageId === 'upload') {
            return (
                <div className={`ai-portal ${subState === 'analyzing' || subState === 'saved' ? 'analyzing' : ''}`}>
                    <div className="portal-ring" />
                    <div className="portal-ring" style={{animationDelay: '0.5s'}} />
                    <div className="portal-ring" style={{animationDelay: '1s'}} />
                    
                    <div className="upload-dropzone-mimic" style={{background: 'rgba(255,255,255,0.02)', borderStyle: subState === 'saved' ? 'solid' : 'dashed', borderColor: subState === 'saved' ? '#22C55E' : ''}}>
                        {subState === 'saved' ? (
                             <svg width="60" height="60" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        ) : (
                             <svg width="60" height="60" viewBox="0 0 24 24" fill="rgba(255,122,0,0.4)">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                             </svg>
                        )}
                        <span style={{marginTop: '15px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                            {subState === 'uploading' ? 'Uploading Template...' : 
                             subState === 'analyzing' ? 'AI Analyzing ROI...' : 
                             subState === 'saved' ? 'Template Mastered ✓' : 'Add New Template'}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="login-animation-container">
            {stages.map((stage, index) => (
                <div 
                    key={stage.id} 
                    className={`animation-stage ${index === activeStage ? 'active' : ''}`}
                >
                    {renderScene()}
                    <div className="stage-footer-narrative">
                        <h2 className="stage-title-narrative">{stage.title}</h2>
                        <p className="stage-desc-narrative">{stage.description}</p>
                    </div>
                </div>
            ))}

            <div className="puck-container">
                {stages.map((_, index) => (
                    <div key={index} className={`puck-detailed ${index === activeStage ? 'active' : ''}`} />
                ))}
            </div>
        </div>
    );
};

export default LoginAnimation;
