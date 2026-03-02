import React, { useState } from 'react';

const Leaves = ({ userId }) => {
    const [status, setStatus] = useState('');
    const [formData, setFormData] = useState({
        leave_type: 'Annual Leave',
        start_date: '',
        end_date: '',
        reason: ''
    });

    const submitLeave = async (e) => {
        e.preventDefault();
        setStatus('processing');

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/leaves/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    employee_id: userId || 'EMP_UNKNOWN'
                })
            });
            const data = await response.json();

            if (response.ok) {
                // Simulate AI analysis delay before showing result
                setTimeout(() => {
                    setStatus('submitted');
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            setStatus('');
        }
    };

    return (
        <div className="leaves-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: 0 }}>✈️ Leave Management</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Annual Leave</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>12 Days</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sick Leave</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>5 Days</div>
                    </div>
                </div>
            </div>

            <div className="grid-3">
                {/* Leave Application Form */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Smart Leave Application</h2>
                    </div>

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={submitLeave}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Leave Type</label>
                                <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }}>
                                    <option>Annual Leave</option>
                                    <option>Sick Leave</option>
                                    <option>Unpaid Leave</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Duration</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }} />
                                    <input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Reason</label>
                            <textarea rows="3" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }} placeholder="Briefly describe your reason..."></textarea>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }} disabled={status === 'processing'}>
                            {status === 'processing' ? 'Submitting & Analyzing...' : 'Submit Request'}
                        </button>
                    </form>

                    {status === 'submitted' && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary)', borderRadius: '8px' }}>
                            <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ Submitted Pending Admin Approval</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>The AI Smart Leave Agent has reviewed your request. While Auto-Approval covers minor sick leaves, this request has been forwarded to the Administrator Space for review.</p>
                        </div>
                    )}
                </div>

                {/* AI Leave Insights */}
                <div className="card glass-panel" style={{ borderColor: 'var(--border-color)' }}>
                    <h2 className="card-title">Team Availability</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        AI snapshot of your team's current availability during your selected dates.
                    </p>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="avatar" style={{ width: 24, height: 24, fontSize: '10px' }}>AK</div>
                                <span>Alex K.</span>
                            </div>
                            <span style={{ color: 'var(--secondary)' }}>Available</span>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="avatar" style={{ width: 24, height: 24, fontSize: '10px', backgroundColor: '#EF4444' }}>JD</div>
                                <span>John D.</span>
                            </div>
                            <span style={{ color: '#EF4444' }}>On Leave</span>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="avatar" style={{ width: 24, height: 24, fontSize: '10px' }}>SJ</div>
                                <span>Sarah J.</span>
                            </div>
                            <span style={{ color: 'var(--secondary)' }}>Available</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Leaves;
