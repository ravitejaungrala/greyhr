import React, { useState, useEffect } from 'react';

const MyWorkLife = ({ userId }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
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
        fetchProfile();
    }, [userId]);

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
                    <span style={{ background: profile?.employment_type === 'Intern' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: profile?.employment_type === 'Intern' ? '#F59E0B' : 'var(--secondary)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {profile?.employment_type || 'Full-Time'}
                    </span>
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
            </div>

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
        </div>
    );
};

export default MyWorkLife;
