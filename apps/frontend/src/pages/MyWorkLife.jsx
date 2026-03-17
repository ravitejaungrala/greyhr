import React, { useState, useEffect } from 'react';
import { PLACEHOLDER_IMAGE } from '../utils';

const MyWorkLife = ({ userId }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemRequestData, setItemRequestData] = useState({ item_name: '', quantity: 1, reason: '' });
    const [isRequesting, setIsRequesting] = useState(false);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/profile?employee_id=${userId}`);
            const data = await res.json();
            setProfile(data);
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const res = await fetch(`${apiUrl}/admin/employee/${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        // Using a dummy field or existing one to trigger update, 
                        // but better to have a specific upload for ID photo
                    })
                });
                // I'll actually add a specific endpoint for ID photo upload to be cleaner
                const uploadRes = await fetch(`${apiUrl}/employee/upload-id-photo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employee_id: userId,
                        image_base64: reader.result
                    })
                });
                if (uploadRes.ok) {
                    fetchProfile();
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleItemRequestSubmit = async () => {
        if (!itemRequestData.item_name || !itemRequestData.reason) {
            alert("Please fill in all fields");
            return;
        }

        setIsRequesting(true);
        try {
            const res = await fetch(`${apiUrl}/items/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId,
                    ...itemRequestData
                })
            });
            if (res.ok) {
                alert("Item request submitted successfully!");
                setIsItemModalOpen(false);
                setItemRequestData({ item_name: '', quantity: 1, reason: '' });
            }
        } catch (err) {
            console.error("Request failed", err);
        } finally {
            setIsRequesting(false);
        }
    };

    const calculateTenure = (joiningDate) => {
        if (!joiningDate) return "New Joinee";
        const start = new Date(joiningDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) return "New Joinee 🚀";

        const years = (diffDays / 365.25).toFixed(1);
        return `${years}y`;
    };

    if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading journey...</div>;

    return (
        <div className="work-life-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="card-title" style={{ fontSize: '1.75rem', margin: 0 }}>❤️ My Work Life</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ background: 'rgba(79, 70, 229, 0.2)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {profile?.position || 'Staff'}
                    </span>
                    <span style={{ background: profile?.employment_type === 'Intern' ? 'rgba(200, 76, 255, 0.2)' : 'rgba(10, 102, 194, 0.2)', color: profile?.employment_type === 'Intern' ? 'var(--violet)' : 'var(--secondary)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {profile?.employment_type || 'Full-Time'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* ID Card Visualization */}
                <div className="card glass-panel id-card-container">
                    <div className="id-card-header">
                        <div className="id-card-logo">NeuzenAI</div>
                        <div className="id-chip"></div>
                    </div>
                    <div className="id-card-body">
                        <div className="id-photo-frame">
                            <img 
                                src={profile?.id_card_photo_key ? `${apiUrl}/admin/photos/${profile.id_card_photo_key}` : (profile?.reference_image_key ? `${apiUrl}/admin/photos/${profile.reference_image_key}` : PLACEHOLDER_IMAGE)} 
                                alt="Profile" 
                            />
                        </div>
                        <div className="id-details">
                            <div className="id-name">{profile?.name || 'EMPLOYEE NAME'}</div>
                            <div className="id-role">{profile?.position || 'Staff Designer'}</div>
                            <div className="id-meta">
                                <div><span>ID:</span> {profile?.employee_id}</div>
                                <div><span>BLD:</span> O+</div>
                                <div><span>JOIN:</span> {profile?.joining_date?.split('T')[0] || '2026-01-01'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="id-footer">
                        <div className="id-barcode"></div>
                        <div className="id-verify-tag">CERTIFIED BIOMETRIC</div>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem' }}>📸</div>
                    <div>
                        <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>Update ID Photo</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Upload a professional photo for your digital ID card. 
                            Alternatively, use the AI Face Scan in the Attendance section.
                        </p>
                    </div>
                    <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                        📤 Upload Photo
                        <input type="file" hidden onChange={handlePhotoUpload} accept="image/*" />
                    </label>
                </div>
            </div>

            <div className="grid-3">
                <div className="card glass-panel" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>150</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reward Points</div>
                </div>
                <div className="card glass-panel" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {calculateTenure(profile?.joining_date)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tenure</div>
                </div>
                <div className="card glass-panel" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>4.8</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg. Rating</div>
                </div>

                <div 
                    className="card glass-panel" 
                    style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.05)' }}
                    onClick={() => setIsItemModalOpen(true)}
                >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>Request Item</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Apply for equipment</div>
                </div>
            </div>

            {/* Item Request Modal */}
            {isItemModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card glass-panel" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className="card-title" style={{ margin: 0 }}>📦 New Item Request</h2>
                            <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Item Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Wireless Mouse"
                                    value={itemRequestData.item_name}
                                    onChange={(e) => setItemRequestData({...itemRequestData, item_name: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Quantity</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={itemRequestData.quantity}
                                        onChange={(e) => setItemRequestData({...itemRequestData, quantity: parseInt(e.target.value) || 1})}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reason</label>
                                <textarea 
                                    rows="2"
                                    placeholder="Why do you need this?"
                                    value={itemRequestData.reason}
                                    onChange={(e) => setItemRequestData({...itemRequestData, reason: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', resize: 'none' }}
                                ></textarea>
                            </div>
                            
                            <button 
                                onClick={handleItemRequestSubmit}
                                disabled={isRequesting}
                                className="btn btn-primary" 
                                style={{ height: '2.5rem', fontWeight: 'bold' }}
                            >
                                {isRequesting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {profile?.offer_letter_status === 'final' && (
                <div className="card glass-panel" style={{ marginTop: '2rem', border: '1px solid var(--secondary)', background: 'rgba(10, 102, 194, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 className="card-title" style={{ margin: 0 }}>📄 Official Offer Letter</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Your official internship appointment letter is available for download.</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ backgroundColor: 'var(--secondary)' }}
                            onClick={() => window.open(`${apiUrl}/employee/offer-letter?employee_id=${userId}`, '_blank')}
                        >
                            ⬇️ Download PDF
                        </button>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginTop: '2rem' }}>
                <h2 className="card-title">📈 Growth Journey</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span>Skill Mastery: Core Competencies</span>
                            <span>{profile?.employment_type === 'Intern' ? '45%' : '85%'}</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: profile?.employment_type === 'Intern' ? '45%' : '85%', height: '100%', background: 'var(--primary)' }}></div>
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <span>Probation/Project Goals</span>
                            <span>{profile?.employment_type === 'Intern' ? '20%' : '60%'}</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: profile?.employment_type === 'Intern' ? '20%' : '60%', height: '100%', background: 'var(--secondary)' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .id-card-container {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                    overflow: hidden;
                    padding: 0 !important;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border-radius: 16px;
                    transition: transform 0.3s ease;
                }
                .id-card-container:hover {
                    transform: translateY(-5px) rotateX(2deg);
                }
                .id-card-header {
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.05);
                }
                .id-card-logo {
                    font-weight: 900;
                    letter-spacing: 1px;
                    color: var(--primary);
                }
                .id-chip {
                    width: 35px;
                    height: 25px;
                    background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
                    border-radius: 4px;
                }
                .id-card-body {
                    padding: 20px;
                    display: flex;
                    gap: 20px;
                }
                .id-photo-frame {
                    width: 100px;
                    height: 125px;
                    border: 2px solid var(--secondary);
                    border-radius: 8px;
                    overflow: hidden;
                    background: #000;
                }
                .id-photo-frame img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .id-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .id-name {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: white;
                    margin-bottom: 4px;
                }
                .id-role {
                    font-size: 0.85rem;
                    color: var(--secondary);
                    font-weight: 600;
                    margin-bottom: 15px;
                }
                .id-meta {
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.5);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .id-meta span {
                    color: rgba(255,255,255,0.8);
                    font-weight: bold;
                    width: 40px;
                    display: inline-block;
                }
                .id-footer {
                    margin-top: auto;
                    padding: 15px 20px;
                    background: var(--primary);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .id-barcode {
                    width: 80px;
                    height: 20px;
                    background: repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 3px);
                }
                .id-verify-tag {
                    font-size: 0.6rem;
                    font-weight: 900;
                    color: white;
                    background: rgba(0,0,0,0.3);
                    padding: 2px 8px;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default MyWorkLife;
