import React, { useState, useEffect } from 'react';

const Leaves = ({ userId }) => {
    const [status, setStatus] = useState('');
    const [leaveData, setLeaveData] = useState({ total: 0, used: 0, remaining: 0, types: [], is_intern: false });
    const [teamAvailability, setTeamAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        leave_type: 'Annual Leave',
        start_date: '',
        end_date: '',
        reason: ''
    });

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        fetchBalance();
        fetchTeam();
    }, [userId]);

    const fetchTeam = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/team-availability`);
            const data = await res.json();
            setTeamAvailability(data.team || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBalance = async () => {
        try {
            const response = await fetch(`${apiUrl}/employee/leave-balance?employee_id=${userId}`);
            const data = await response.json();
            setLeaveData(data);
        } catch (err) {
            console.error("Error fetching balance:", err);
        } finally {
            setLoading(false);
        }
    };

    const submitLeave = async (e) => {
        e.preventDefault();
        if (leaveData.is_intern) return;

        setStatus('processing');

        try {
            const response = await fetch(`${apiUrl}/leaves/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    employee_id: userId || 'EMP_UNKNOWN'
                })
            });

            if (response.ok) {
                setTimeout(() => {
                    setStatus('submitted');
                    fetchBalance();
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            setStatus('');
        }
    };

    if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading leave records...</div>;

    return (
        <div className="leaves-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: 0 }}>✈️ Leave Management</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {leaveData.types.slice(0, 2).map((type, idx) => (
                        <div key={idx} className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{type.name}</div>
                            <div style={{ fontWeight: 'bold', color: idx === 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                                {type.remaining} Days
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid-3">
                {/* Leave Application Form */}
                <div className="card" style={{ gridColumn: 'span 2', opacity: leaveData.is_intern ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Smart Leave Application</h2>
                    </div>

                    {leaveData.is_intern ? (
                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #F59E0B', borderRadius: '8px' }}>
                            <span style={{ fontSize: '2rem' }}>ℹ️</span>
                            <p style={{ color: '#F59E0B', fontWeight: 'bold', marginTop: '1rem' }}>Internship Policy Notice</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {leaveData.message || "Interns are not eligible for paid leaves. Please contact HR for any urgent unpaid leave requests."}
                            </p>
                        </div>
                    ) : (
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={submitLeave}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Leave Type</label>
                                    <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}>
                                        {leaveData.types.map(t => <option key={t.name}>{t.name}</option>)}
                                        <option>Unpaid Leave</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Duration</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                                        <input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Reason</label>
                                <textarea rows="3" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} placeholder="Briefly describe your reason..."></textarea>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }} disabled={status === 'processing'}>
                                {status === 'processing' ? 'Submitting & Analyzing...' : 'Submit Request'}
                            </button>
                        </form>
                    )}

                    {status === 'submitted' && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary)', borderRadius: '8px' }}>
                            <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Submitted Pending Admin Approval</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>The AI Smart Leave Agent has reviewed your request and forwarded it to the Administrator Space.</p>
                        </div>
                    )}
                </div>

                {/* AI Leave Insights */}
                <div className="card glass-panel" style={{ borderColor: 'var(--border-color)' }}>
                    <h2 className="card-title">Team Availability</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        AI snapshot of your team's current availability.
                    </p>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {teamAvailability.length === 0 ? <li style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading team status...</li> :
                            teamAvailability.map(member => (
                                <li key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className="avatar" style={{
                                            width: 24,
                                            height: 24,
                                            fontSize: '10px',
                                            backgroundColor: member.status === 'Available' ? 'var(--secondary)' : member.status === 'On Leave' ? '#EF4444' : 'var(--text-muted)'
                                        }}>{member.initials}</div>
                                        <span>{member.name} {member.id === userId ? '(You)' : ''}</span>
                                    </div>
                                    <span style={{ color: member.status === 'Available' ? 'var(--secondary)' : member.status === 'On Leave' ? '#EF4444' : 'var(--text-muted)' }}>
                                        {member.status}
                                    </span>
                                </li>
                            ))
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Leaves;
