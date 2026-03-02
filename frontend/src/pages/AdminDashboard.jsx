import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('onboarding'); // onboarding, employees, leaves, holidays, reports

    // Data States
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [approvedEmployees, setApprovedEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewedEmp, setViewedEmp] = useState(null);

    // Form states
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public Holiday' });

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'onboarding') {
                const res = await fetch(`${apiUrl}/auth/admin/pending`);
                const data = await res.json();
                setPendingEmployees(data.employees || []);
                setViewedEmp(null);
            } else if (activeTab === 'employees') {
                const res = await fetch(`${apiUrl}/auth/admin/employees`);
                const data = await res.json();
                setApprovedEmployees(data.employees || []);
                setViewedEmp(null);
            } else if (activeTab === 'leaves') {
                const res = await fetch(`${apiUrl}/admin/leaves`);
                const data = await res.json();
                setLeaves(data.leaves || []);
            } else if (activeTab === 'holidays') {
                const res = await fetch(`${apiUrl}/admin/holidays`);
                const data = await res.json();
                setHolidays(data.holidays || []);
            } else if (activeTab === 'reports') {
                const res = await fetch(`${apiUrl}/admin/reports`);
                const data = await res.json();
                setReports(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleApproval = async (empId, action) => {
        try {
            const response = await fetch(`${apiUrl}/auth/admin/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: empId, action })
            });
            if (response.ok) {
                setPendingEmployees(prev => prev.filter(emp => emp.employee_id !== empId));
                setViewedEmp(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleLeaveStatus = async (leaveId, status) => {
        try {
            const response = await fetch(`${apiUrl}/admin/leaves/${leaveId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const submitHoliday = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${apiUrl}/admin/holidays`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHoliday)
            });
            if (response.ok) {
                const data = await response.json();
                setHolidays(prev => [...prev, data.record]);
                setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="admin-dashboard">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
                🛡️ Administrator Control Center
            </h1>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                {['onboarding', 'employees', 'leaves', 'holidays', 'reports'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn ${activeTab === tab ? 'btn-primary' : ''}`}
                        style={{
                            background: activeTab === tab ? '' : 'transparent',
                            border: 'none',
                            color: activeTab === tab ? 'white' : 'var(--text-muted)',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab.replace('onboarding', 'Pending Approvals')}
                    </button>
                ))}
            </div>

            {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading data...</p>}

            {!loading && (
                <div className="grid-3">

                    {/* TAB: ONBOARDING */}
                    {activeTab === 'onboarding' && (
                        <>
                            <div className="card glass-panel" style={{ gridColumn: 'span 1' }}>
                                <h2 className="card-title">Pending ({pendingEmployees.length})</h2>
                                {pendingEmployees.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px dashed var(--secondary)' }}>
                                        <span style={{ fontSize: '2rem' }}>🎉</span><p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>All caught up!</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                                        {pendingEmployees.map(emp => (
                                            <div key={emp.employee_id} onClick={() => setViewedEmp(emp)} style={{ padding: '1rem', backgroundColor: viewedEmp?.employee_id === emp.employee_id ? 'rgba(79, 70, 229, 0.2)' : 'var(--surface-color)', border: `1px solid ${viewedEmp?.employee_id === emp.employee_id ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card" style={{ gridColumn: 'span 2' }}>
                                <h2 className="card-title">Employee Details</h2>
                                {viewedEmp ? (
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Personal Information</h3>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Name:</strong> {viewedEmp.name}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Email:</strong> {viewedEmp.email}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>DOB:</strong> {viewedEmp.dob}</div>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Experience</h3>
                                                {viewedEmp.is_experienced ? (
                                                    <>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Prev Company:</strong> {viewedEmp.experience.prev_company}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Role:</strong> {viewedEmp.experience.prev_role}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Years:</strong> {viewedEmp.experience.years}</div>
                                                    </>
                                                ) : <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fresher</div>}
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Documents (S3 Keys)</h3>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Bank A/C:</strong> {viewedEmp.bank_details?.account_number}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Bank Photo: {viewedEmp.bank_details?.bank_photo_key}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', marginTop: '1rem' }}><strong>Education:</strong> {viewedEmp.education?.degree}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Cert Photo: {viewedEmp.education?.cert_key}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', marginTop: '1rem', color: 'var(--primary)' }}><strong>Live Face:</strong> {viewedEmp.reference_image_key}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'reject')} className="btn btn-secondary" style={{ color: '#EF4444', borderColor: '#EF4444' }}>Reject Application</button>
                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'approve')} className="btn btn-primary" style={{ backgroundColor: 'var(--secondary)' }}>Approve Onboarding</button>
                                        </div>
                                    </div>
                                ) : <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Select an employee to review.</div>}
                            </div>
                        </>
                    )}

                    {/* TAB: EMPLOYEES */}
                    {activeTab === 'employees' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Employee Directory ({approvedEmployees.length})</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '1rem' }}>ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Email</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedEmployees.map(emp => (
                                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{emp.employee_id}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{emp.email}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: LEAVES */}
                    {activeTab === 'leaves' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Leave Requests</h2>
                            {leaves.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No leaves found (Try applying from Employee view).</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {leaves.map((l, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-color)' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{l.leave_type} - {l.employee_id}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{l.start_date} to {l.end_date}</div>
                                                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>{l.reason}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: l.status.includes('Approved') ? 'var(--secondary)' : '#F59E0B' }}>{l.status}</span>
                                                {l.status.includes('Pending') && (
                                                    <>
                                                        <button onClick={() => handleLeaveStatus(l.id, 'Rejected')} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Reject</button>
                                                        <button onClick={() => handleLeaveStatus(l.id, 'Approved by Admin')} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem', background: 'var(--secondary)' }}>Approve</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: HOLIDAYS */}
                    {activeTab === 'holidays' && (
                        <>
                            <div className="card" style={{ gridColumn: 'span 1' }}>
                                <h2 className="card-title">Add Holiday</h2>
                                <form onSubmit={submitHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.875rem' }}>Holiday Name</label><input required type="text" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Date</label><input required type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Type</label><select required value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }}><option>Public Holiday</option><option>Optional Holiday</option></select></div>
                                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Add Holiday</button>
                                </form>
                            </div>
                            <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
                                <h2 className="card-title">Holiday Calendar</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {holidays.map((h, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-color)', display: 'flex', justifyContent: 'space-between' }}>
                                            <div><div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{h.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.type}</div></div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{new Date(h.date).toDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB: REPORTS */}
                    {activeTab === 'reports' && reports && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Company Health Data</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div style={{ padding: '2rem', background: 'var(--surface-color)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{reports.total_employees}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Total Employees</div>
                                </div>
                                <div style={{ padding: '2rem', background: 'var(--surface-color)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{reports.present_today}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Present Today</div>
                                </div>
                                <div style={{ padding: '2rem', background: 'var(--surface-color)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>{reports.on_leave}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>On Leave</div>
                                </div>
                                <div style={{ padding: '2rem', background: 'var(--surface-color)', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{reports.average_engagement_score}%</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Engagement</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <span style={{ fontSize: '2rem' }}>📊</span>
                                <p style={{ marginTop: '1rem' }}>Deep integrations for Data visualization can be powered by AI Analytics Agent soon.</p>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
