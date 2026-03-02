import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ activeTab }) => {
    // Data States
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [approvedEmployees, setApprovedEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewedEmp, setViewedEmp] = useState(null);
    const [selectedApprovedEmp, setSelectedApprovedEmp] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [payrollStatus, setPayrollStatus] = useState([]);
    const [copilotQuery, setCopilotQuery] = useState('');
    const [copilotAnswer, setCopilotAnswer] = useState('');
    const [isCopilotLoading, setIsCopilotLoading] = useState(false);
    const [announcementMsg, setAnnouncementMsg] = useState({ title: '', content: '' });
    const [payslipTemplate, setPayslipTemplate] = useState(null);
    const [templateAnalysis, setTemplateAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Form states
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public Holiday' });
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [empRoleSetup, setEmpRoleSetup] = useState({
        employment_type: 'Full-Time',
        position: 'Software Engineer',
        monthly_salary: 50000,
        privilege_leave_rate: 0.0,
        sick_leave_rate: 0.5,
        casual_leave_rate: 1.0
    });

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
            } else if (activeTab === 'notifications') {
                const res = await fetch(`${apiUrl}/admin/notifications`);
                const data = await res.json();
                setNotifications(data.notifications || []);
            } else if (activeTab === 'attendance') {
                const res = await fetch(`${apiUrl}/admin/attendance`);
                const data = await res.json();
                setAttendanceLogs(data.logs || []);
            } else if (activeTab === 'payroll') {
                const res = await fetch(`${apiUrl}/admin/payslips/status`);
                const data = await res.json();
                setPayrollStatus(data.releases || []);
            } else if (activeTab === 'announcements') {
                const res = await fetch(`${apiUrl}/announcement`);
                const data = await res.json();
                setAnnouncementMsg(data);
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
                body: JSON.stringify({
                    employee_id: empId,
                    action,
                    employment_type: empRoleSetup.employment_type,
                    position: empRoleSetup.position,
                    monthly_salary: parseInt(empRoleSetup.monthly_salary),
                    privilege_leave_rate: parseFloat(empRoleSetup.privilege_leave_rate),
                    sick_leave_rate: parseFloat(empRoleSetup.sick_leave_rate),
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate)
                })
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

    const handleUpdateEmployee = async (employee_id) => {
        try {
            const response = await fetch(`${apiUrl}/admin/employee/${employee_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employment_type: empRoleSetup.employment_type,
                    position: empRoleSetup.position,
                    monthly_salary: parseInt(empRoleSetup.monthly_salary),
                    privilege_leave_rate: parseFloat(empRoleSetup.privilege_leave_rate),
                    sick_leave_rate: parseFloat(empRoleSetup.sick_leave_rate),
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate)
                })
            });
            if (response.ok) {
                alert("Employee profile updated successfully!");
                fetchData(); // Refresh list
                setSelectedApprovedEmp(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${apiUrl}/admin/announcement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementMsg)
            });
            if (response.ok) {
                alert("Announcement updated successfully!");
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCopilot = async (e) => {
        if (e) e.preventDefault();
        if (!copilotQuery.trim()) return;
        setIsCopilotLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: copilotQuery })
            });
            const data = await res.json();
            setCopilotAnswer(data.answer);
        } catch (err) {
            console.error(err);
            setCopilotAnswer("Something went wrong with Copilot.");
        } finally {
            setIsCopilotLoading(false);
        }
    };

    const submitHoliday = async (e) => {
        e.preventDefault();
        try {
            if (editingHoliday) {
                const response = await fetch(`${apiUrl}/admin/holidays/${editingHoliday.originalDate}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newHoliday)
                });
                if (response.ok) {
                    setHolidays(prev => prev.map(h => h.date === editingHoliday.originalDate ? { ...newHoliday } : h));
                    setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
                    setEditingHoliday(null);
                }
            } else {
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
            }
        } catch (err) {
            console.error("Error saving holiday: ", err);
        }
    };

    const handleDeleteHoliday = async (date) => {
        if (!window.confirm("Are you sure you want to delete this holiday?")) return;
        try {
            const response = await fetch(`${apiUrl}/admin/holidays/${date}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setHolidays(prev => prev.filter(h => h.date !== date));
            }
        } catch (err) {
            console.error("Error deleting holiday: ", err);
        }
    };

    const handleEditClick = (holiday) => {
        setEditingHoliday({ ...holiday, originalDate: holiday.date });
        setNewHoliday({ name: holiday.name, date: holiday.date, type: holiday.type });
    };

    return (
        <div className="admin-dashboard">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeTab === 'onboarding' && '📋 Pending Approvals'}
                {activeTab === 'employees' && '👥 Employee Directory'}
                {activeTab === 'leaves' && '🌴 Leave Management'}
                {activeTab === 'holidays' && '📅 Holiday Calendar'}
                {activeTab === 'reports' && '📊 Company Reports'}
                {activeTab === 'notifications' && '🔔 Admin Notifications'}
                {activeTab === 'attendance' && '📸 Attendance Logs'}
                {activeTab === 'copilot' && '🤖 HR AI Copilot'}
            </h1>

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
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Prev Company:</strong> {viewedEmp.experience?.prev_company}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Role:</strong> {viewedEmp.experience?.prev_role}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Years:</strong> {viewedEmp.experience?.years}</div>
                                                    </>
                                                ) : <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fresher</div>}
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Documents & Photos</h3>

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live Face Capture:</div>
                                                    <img
                                                        src={`${apiUrl}/admin/photos/${viewedEmp.reference_image_key}`}
                                                        alt="Face"
                                                        style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
                                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/120?text=No+Photo'; }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Photo:</div>
                                                        <img
                                                            src={`${apiUrl}/admin/photos/${viewedEmp.bank_details?.bank_photo_key}`}
                                                            alt="Bank"
                                                            style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Education Cert:</div>
                                                        <img
                                                            src={`${apiUrl}/admin/photos/${viewedEmp.education?.cert_key}`}
                                                            alt="Education"
                                                            style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--primary)', marginBottom: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>⚙️ Role & Position Setup</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Employment Type</label>
                                                    <select
                                                        value={empRoleSetup.employment_type}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                    >
                                                        <option value="Full-Time">Full-Time</option>
                                                        <option value="Intern">Intern</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Designation / Position</label>
                                                    <input
                                                        type="text"
                                                        value={empRoleSetup.position}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })}
                                                        placeholder="e.g. Frontend Developer"
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                    />
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Monthly Gross Salary (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={empRoleSetup.monthly_salary}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                    />
                                                </div>

                                                <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>🎁 Monthly Leave Accrual Rate (days/month)</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Privilege</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Sick</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Casual</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {empRoleSetup.employment_type === 'Intern' && (
                                                        <div style={{ fontSize: '0.7rem', color: '#F59E0B', marginTop: '0.5rem' }}>* Interns have zero paid leaves as per policy (GreytHR guidelines).</div>
                                                    )}
                                                </div>
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
                                        <th style={{ padding: '1rem' }}>Photo</th>
                                        <th style={{ padding: '1rem' }}>ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Email</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedEmployees.map(emp => (
                                        <tr
                                            key={emp.employee_id}
                                            onClick={() => {
                                                setSelectedApprovedEmp(emp);
                                                setEmpRoleSetup({
                                                    employment_type: emp.employment_type || 'Full-Time',
                                                    position: emp.position || 'Software Engineer',
                                                    monthly_salary: emp.monthly_salary || 0,
                                                    privilege_leave_rate: emp.privilege_leave_rate || 0,
                                                    sick_leave_rate: emp.sick_leave_rate || 0.5,
                                                    casual_leave_rate: emp.casual_leave_rate || 1.0
                                                });
                                            }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selectedApprovedEmp?.employee_id === emp.employee_id ? 'rgba(79, 70, 229, 0.1)' : 'transparent' }}
                                        >
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <img
                                                    src={`${apiUrl}/admin/photos/${emp.reference_image_key}`}
                                                    alt=""
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{emp.employee_id}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{emp.email}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {selectedApprovedEmp && (
                                <div className="card glass-panel" style={{ marginTop: '2rem', borderTop: '2px solid var(--primary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-light)' }}>✏️ Edit Profile: {selectedApprovedEmp.name}</h3>
                                        <button onClick={() => setSelectedApprovedEmp(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕ Close</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        {/* Same role setup fields as onboarding */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Employment Type</label>
                                                <select
                                                    value={empRoleSetup.employment_type}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                >
                                                    <option>Full-Time</option>
                                                    <option>Intern</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Designation / Position</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.position}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Monthly Gross Salary (₹)</label>
                                                <input
                                                    type="number"
                                                    value={empRoleSetup.monthly_salary}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>🎁 Monthly Leave Accrual Rate (days/month)</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Privilege</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Sick</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Casual</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setSelectedApprovedEmp(null)} className="btn btn-secondary">Cancel</button>
                                        <button onClick={() => handleUpdateEmployee(selectedApprovedEmp.employee_id)} className="btn btn-primary" style={{ backgroundColor: 'var(--secondary)' }}>Save Profile Changes</button>
                                    </div>
                                </div>
                            )}
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
                                <h2 className="card-title">{editingHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
                                <form onSubmit={submitHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.875rem' }}>Holiday Name</label><input required type="text" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Date</label><input required type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Type</label><select required value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }}><option>Public Holiday</option><option>Optional Holiday</option></select></div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingHoliday ? "Save Changes" : "Add Holiday"}</button>
                                        {editingHoliday && (
                                            <button type="button" className="btn btn-secondary" onClick={() => { setEditingHoliday(null); setNewHoliday({ name: '', date: '', type: 'Public Holiday' }); }} style={{ flex: 1 }}>Cancel</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
                                <h2 className="card-title">Holiday Calendar</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {holidays.map((h, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{h.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.type} | {new Date(h.date).toDateString()}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditClick(h)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                                                <button onClick={() => handleDeleteHoliday(h.date)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#EF4444', color: '#EF4444' }}>🗑️ Delete</button>
                                            </div>
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

                    {/* TAB: NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Latest Updates</h2>
                            {notifications.length === 0 ? <p>No new notifications.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {notifications.map((n, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: '600', color: 'var(--primary)', marginRight: '1rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>{n.type}</span>
                                                <span>{n.message}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: ATTENDANCE LOGS */}
                    {activeTab === 'attendance' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Global Attendance History</h2>
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            <th style={{ padding: '1rem' }}>Employee</th>
                                            <th style={{ padding: '1rem' }}>Action</th>
                                            <th style={{ padding: '1rem' }}>Time</th>
                                            <th style={{ padding: '1rem' }}>Location</th>
                                            <th style={{ padding: '1rem' }}>Verification Photo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceLogs.map((log, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                                <td style={{ padding: '1rem' }}>{log.employee_id}</td>
                                                <td style={{ padding: '1rem' }}>{log.action}</td>
                                                <td style={{ padding: '1rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                                <td style={{ padding: '1rem' }}>{log.location}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <img
                                                        src={`${apiUrl}/admin/photos/${log.s3_image_key}`}
                                                        alt="Capture"
                                                        style={{ width: '60px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="card glass-panel">
                                <h2 className="card-title">📄 Payslip Template Configuration</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Upload a sample payslip image to train the AI on your specific company format.</p>

                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-color)' }} onClick={() => document.getElementById('template-upload').click()}>
                                            <span style={{ fontSize: '2rem' }}>📁</span>
                                            <p style={{ marginTop: '0.5rem' }}>{isAnalyzing ? 'Analyzing format with AI...' : 'Click to upload payslip template (JPG/PNG)'}</p>
                                            <input id="template-upload" type="file" hidden accept="image/*" onChange={handleTemplateUpload} />
                                        </div>
                                    </div>
                                    {templateAnalysis && (
                                        <div style={{ flex: 1, padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>✔ AI ANALYSIS COMPLETE</div>
                                            <pre style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>{templateAnalysis}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="card-title">🚀 Payslip Release Control</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['February 2026', 'March 2026'].map(month => {
                                        const isReleased = payrollStatus.some(p => p.month_year === month && p.released);
                                        return (
                                            <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{month}</div>
                                                    <div style={{ fontSize: '0.8rem', color: isReleased ? 'var(--secondary)' : 'var(--text-muted)' }}>{isReleased ? 'Released to Employees' : 'Not yet released'}</div>
                                                </div>
                                                <button
                                                    className={`btn ${isReleased ? 'btn-secondary' : 'btn-primary'}`}
                                                    onClick={async () => {
                                                        const res = await fetch(`${apiUrl}/admin/payslips/release`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ month_year: month, release: !isReleased })
                                                        });
                                                        if (res.ok) fetchData();
                                                    }}
                                                >
                                                    {isReleased ? 'Hide Payslips' : 'Release Payslips'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>AI Payroll Note:</div>
                                <p style={{ fontSize: '0.875rem', margin: 0 }}>All LOP (Loss of Pay) deductions are automatically calculated based on attendance and leave records for the selected month.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB: COPILOT */}
                    {activeTab === 'copilot' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                            <h2 className="card-title">🤖 HR AI Copilot</h2>
                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                {copilotAnswer ? (
                                    <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{copilotAnswer}</div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20%' }}>Ask me anything about company policies, candidate details, or salary rules...</div>
                                )}
                                {isCopilotLoading && <div style={{ textAlign: 'center', marginTop: '1rem' }}>Thinking... 🧠</div>}
                            </div>
                            <form onSubmit={handleCopilot} style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    value={copilotQuery}
                                    onChange={(e) => setCopilotQuery(e.target.value)}
                                    placeholder="e.g. Compare candidates for Software role..."
                                    style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                />
                                <button type="submit" disabled={isCopilotLoading} className="btn-primary" style={{ padding: '0 2rem' }}>Ask AI</button>
                            </form>
                        </div>
                    )}

                    {/* TAB: ANNOUNCEMENTS */}
                    {activeTab === 'announcements' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">📢 Manage System Announcements</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This message will be visible to all employees in their Engage module.</p>

                            <form onSubmit={handleUpdateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Announcement Title</label>
                                    <input
                                        type="text"
                                        value={announcementMsg.title}
                                        onChange={(e) => setAnnouncementMsg({ ...announcementMsg, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)' }}
                                        placeholder="e.g. 📌 Essential Office Guidelines"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Content</label>
                                    <textarea
                                        rows="6"
                                        value={announcementMsg.content}
                                        onChange={(e) => setAnnouncementMsg({ ...announcementMsg, content: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-light)', lineHeight: '1.5' }}
                                        placeholder="Type the announcement content here..."
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>Update Announcement</button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
