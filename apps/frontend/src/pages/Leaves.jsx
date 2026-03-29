import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const Leaves = ({ userId, user }) => {
    const [status, setStatus] = useState('');
    const [leaveData, setLeaveData] = useState({ total: 0, used: 0, remaining: 0, types: [], is_intern: false });
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [teamAvailability, setTeamAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        employee_id: userId,
        leave_type: 'Annual Leave',
        subject: '',
        start_date: '',
        end_date: '',
        reason: '',
        approver_id: '',
        cc_ids: []
    });
    const [employeeDirectory, setEmployeeDirectory] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [ccSearch, setCcSearch] = useState('');

    const apiUrl = API_URL;

    useEffect(() => {
        fetchBalance();
        fetchTeam();
        fetchRecentLeaves();
        fetchDirectory();
        fetchApprovers();
    }, [userId]);

    const fetchApprovers = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/approvers`);
            const data = await res.json();
            setApprovers(data.approvers || []);
            if (data.approvers && data.approvers.length > 0) {
                setFormData(prev => ({ ...prev, approver_id: data.approvers[0].employee_id }));
            }
        } catch (err) {
            console.error("Error fetching approvers:", err);
        }
    };

    const fetchDirectory = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/directory`);
            const data = await res.json();
            setEmployeeDirectory(data.employees || []);
        } catch (err) {
            console.error("Error fetching directory:", err);
        }
    };

    const fetchRecentLeaves = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/leaves?employee_id=${userId}`);
            const data = await res.json();
            setRecentLeaves(data.leaves || []);
        } catch (err) {
            console.error(err);
        }
    };

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
        if (leaveData.is_intern && formData.leave_type !== 'Compensatory Off') return;

        setStatus('processing');

        try {
            const response = await fetch(`${apiUrl}/leaves/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    cc_ids: formData.cc_ids.filter(id => id && id !== '')
                })
            });

            if (response.ok) {
                setTimeout(() => {
                    setStatus('submitted');
                    fetchBalance();
                    fetchRecentLeaves();
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
                    {leaveData.types.map((type, idx) => (
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

                    {leaveData.is_intern && leaveData.remaining <= 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(200, 76, 255, 0.1)', border: '1px dashed var(--violet)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '2rem' }}>ℹ️</span>
                            <p style={{ color: 'var(--violet)', fontWeight: 'bold', marginTop: '1rem' }}>Internship Policy Notice</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {leaveData.message || "Interns are not eligible for paid leaves. You can only apply for earned Compensatory Off."}
                            </p>
                        </div>
                    ) : (
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={submitLeave}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Leave Subject</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Brief summary (e.g. Family Function / Medical Checkup)"
                                    value={formData.subject} 
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })} 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Employee</label>
                                        <select value={formData.employee_id} onChange={e => {
                                            setFormData({ ...formData, employee_id: e.target.value });
                                            // Refresh balance when employee changes if needed, 
                                        }} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}>
                                            <option value={userId}>Current User (You)</option>
                                            {employeeDirectory.filter(emp => emp.employee_id !== userId).map(emp => (
                                                <option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Leave Type</label>
                                    <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}>
                                        {leaveData.types.filter(t => !leaveData.is_intern || t.name === 'Compensatory Off' || t.remaining > 0).map(t => (
                                            <option key={t.name}>{t.name}</option>
                                        ))}
                                        <option>Paid Leave</option>
                                        <option>Unpaid Leave</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Duration</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                                        <input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Send Request To (Approver)</label>
                                    <select 
                                        required
                                        value={formData.approver_id} 
                                        onChange={e => setFormData({ ...formData, approver_id: e.target.value })} 
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}
                                    >
                                        <option value="">Select Approver</option>
                                        {approvers.map(app => (
                                            <option key={app.employee_id} value={app.employee_id}>
                                                {app.name} ({app.role === 'super_admin' ? 'Super Admin' : (app.role === 'hr' ? 'HR' : 'Admin')})
                                            </option>
                                        ))}
                                        {approvers.length === 0 && <option value="">No admins found</option>}
                                    </select>
                                </div>
                            </div>

                            {/* CC Selection Checklist */}
                            <div style={{ marginTop: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                    CC Recipients ({formData.cc_ids.length} selected)
                                </label>
                                
                                <input 
                                    type="text" 
                                    placeholder="Search employees to CC..." 
                                    value={ccSearch}
                                    onChange={e => setCcSearch(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem' }}
                                />

                                <div style={{ 
                                    height: '120px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '6px', 
                                    padding: '0.4rem',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'var(--primary) transparent'
                                }}>
                                    {approvers
                                        .filter(a => a.employee_id !== formData.approver_id && a.employee_id !== userId)
                                        .filter(a => a.name.toLowerCase().includes(ccSearch.toLowerCase()))
                                        .map(app => (
                                            <label key={app.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: formData.cc_ids.includes(app.employee_id) ? 'rgba(10, 102, 194, 0.2)' : 'transparent' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.cc_ids.includes(app.employee_id)}
                                                    onChange={() => {
                                                        const newCcIds = formData.cc_ids.includes(app.employee_id)
                                                            ? formData.cc_ids.filter(id => id !== app.employee_id)
                                                            : [...formData.cc_ids, app.employee_id];
                                                        setFormData({ ...formData, cc_ids: newCcIds });
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.85rem' }}>{app.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({app.role.replace('_', ' ')})</span></span>
                                            </label>
                                        ))
                                    }
                                    {approvers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>No recipients available</p>}
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
                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(10, 102, 194, 0.1)', border: '1px solid var(--secondary)', borderRadius: '8px' }}>
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

            {/* Monthly Summary & History */}
            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <div className="grid-3" style={{ gap: '1.5rem' }}>
                    <div className="card glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LEAVES THIS MONTH</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {recentLeaves.filter(l => {
                                const isApproved = l.status && l.status.toLowerCase().includes('approved');
                                const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
                                const startMonth = l.start_date.slice(0, 7);
                                return isApproved && startMonth === currentMonth;
                            }).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Approved requests</div>
                    </div>
                    
                    <div className="card glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PENDING REQUESTS</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>
                            {recentLeaves.filter(l => l.status.includes('Pending')).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Awaiting review</div>
                    </div>

                    <div className="card glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>UPCOMING LEAVES</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                            {recentLeaves.filter(l => {
                                const isApproved = l.status && l.status.toLowerCase().includes('approved');
                                const isFuture = new Date(l.start_date) > new Date();
                                return isApproved && isFuture;
                            }).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Future dates</div>
                    </div>
                </div>

                <div className="card glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Applications & Status</h2>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time approval tracking</div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date Range</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Type</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Reason</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent leave applications.</td>
                                    </tr>
                                ) : recentLeaves.map((leaf, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>{new Date(leaf.start_date).toLocaleDateString()} - {new Date(leaf.end_date).toLocaleDateString()}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requested {new Date(leaf.applied_on).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ 
                                                    padding: '0.15rem 0.4rem', 
                                                    borderRadius: '4px', 
                                                    backgroundColor: 'var(--primary-glow)', 
                                                    color: 'var(--primary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    border: '1px solid var(--primary)'
                                                }}>{leaf.leave_type_short || 'L'}</span>
                                                <span>{leaf.leave_type}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaf.reason}>
                                            {leaf.reason}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '20px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: '600',
                                                backgroundColor: leaf.status.includes('Approved') ? 'rgba(34, 197, 94, 0.15)' : 
                                                                leaf.status.includes('Rejected') ? 'rgba(239, 68, 68, 0.15)' : 
                                                                'rgba(245, 158, 11, 0.15)',
                                                color: leaf.status.includes('Approved') ? '#22C55E' : 
                                                       leaf.status.includes('Rejected') ? '#EF4444' : 
                                                       '#F59E0B',
                                                border: `1px solid ${
                                                    leaf.status.includes('Approved') ? '#22C55E44' : 
                                                    leaf.status.includes('Rejected') ? '#EF444444' : 
                                                    '#F59E0B44'
                                                }`
                                            }}>
                                                {leaf.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaves;
