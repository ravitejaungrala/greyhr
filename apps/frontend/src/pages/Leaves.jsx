import React, { useState, useEffect } from 'react';
import { 
    Plane, RefreshCw, Bot, Info, 
    CheckCircle2, Calendar, Clock, BarChart3,
    History, Users, Sparkles, Eye
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { API_URL } from '../config';
import LeaveDetailsView from './LeaveDetailsView';

const Leaves = ({ userId, user, mode = 'all' }) => {
    const isApplyView = mode === 'apply';
    const isBalanceView = mode === 'balance';
    const pageTitle = isApplyView ? 'Leave Apply' : (isBalanceView ? 'Leave Balances' : 'Leave Management');
    const [status, setStatus] = useState('');
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
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
        start_session: 'Full Day',
        end_session: 'Full Day',
        reason: '',
        approver_id: '',
        cc_ids: []
    });
    const [employeeDirectory, setEmployeeDirectory] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [ccSearch, setCcSearch] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedTypeName, setSelectedTypeName] = useState('');
    const [showAvailedTable, setShowAvailedTable] = useState(false);
    const [showGrantedTable, setShowGrantedTable] = useState(false);

    const apiUrl = API_URL;

    useEffect(() => {
        fetchBalance();
        fetchTeam();
        fetchRecentLeaves();
        fetchDirectory();
        fetchApprovers();
    }, [userId]);

    useEffect(() => {
        if (!selectedTypeName && Array.isArray(leaveData?.types) && leaveData.types.length > 0) {
            setSelectedTypeName(leaveData.types[0].name);
        }
    }, [leaveData, selectedTypeName]);

    const normalizeLeaveName = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    const sameLeaveType = (a, b) => {
        const left = normalizeLeaveName(a);
        const right = normalizeLeaveName(b);
        if (!left || !right) return false;
        return left.includes(right) || right.includes(left);
    };

    const calculateLeaveDays = (leave) => {
        try {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

            let days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const startSession = String(leave.start_session || 'Full Day');
            const endSession = String(leave.end_session || 'Full Day');

            if (days <= 1) {
                if (startSession !== 'Full Day' || endSession !== 'Full Day') {
                    if (startSession === endSession) return 0.5;
                    return 1;
                }
                return 1;
            }

            if (startSession !== 'Full Day') days -= 0.5;
            if (endSession !== 'Full Day') days -= 0.5;
            return Math.max(0.5, days);
        } catch {
            return 0;
        }
    };

    const selectedType = (leaveData?.types || []).find((type) => type.name === selectedTypeName) || (leaveData?.types || [])[0] || null;
    const selectedTypeRecords = recentLeaves.filter((leave) => {
        if (!selectedType) return false;
        if (!sameLeaveType(leave.leave_type, selectedType.name)) return false;
        const start = new Date(leave.start_date);
        return !Number.isNaN(start.getTime()) && start.getFullYear() === selectedYear;
    });

    const approvedTypeRecords = selectedTypeRecords.filter((leave) => {
        const status = String(leave.status || '').toLowerCase();
        return !status.includes('rejected') && !status.includes('withdrawn');
    });

    const totalConsumedForType = approvedTypeRecords.reduce((sum, leave) => sum + calculateLeaveDays(leave), 0);
    const availableBalance = Number(selectedType?.remaining || 0);
    const grantedForType = Math.max(0, availableBalance + totalConsumedForType);
    const openingBalance = 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyConsumed = Array.from({ length: 12 }, (_, i) => ({ monthIndex: i, consumed: 0 }));
    approvedTypeRecords.forEach((leave) => {
        const start = new Date(leave.start_date);
        const idx = start.getMonth();
        monthlyConsumed[idx].consumed += calculateLeaveDays(leave);
    });

    const monthLimit = selectedYear < new Date().getFullYear() ? 12 : (selectedYear > new Date().getFullYear() ? 0 : (new Date().getMonth() + 1));
    const monthlyGrantRate = monthLimit > 0 ? (grantedForType / monthLimit) : 0;

    let runningBalance = openingBalance;
    const monthlyDetailData = months.slice(0, monthLimit).map((m, idx) => {
        const granted = monthlyGrantRate;
        const consumed = Number(monthlyConsumed[idx].consumed.toFixed(2));
        runningBalance = runningBalance + granted - consumed;
        // Clamp here so negative does NOT carry into future months (matches backend logic)
        runningBalance = Math.max(0, runningBalance);
        return {
            month: `${m} ${String(selectedYear).slice(-2)}`,
            balance: Number(runningBalance.toFixed(2)),
            consumed,
            granted: Number(granted.toFixed(2)),
            opening: idx === 0 ? openingBalance : undefined
        };
    });

    const availableYears = Array.from(new Set(
        recentLeaves
            .map((leave) => new Date(leave.start_date))
            .filter((d) => !Number.isNaN(d.getTime()))
            .map((d) => d.getFullYear())
            .concat([new Date().getFullYear()])
    )).sort((a, b) => b - a);

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

    const withdrawLeave = async (leaveId) => {
        if (!confirm('Are you sure you want to withdraw this leave request?')) return;

        try {
            const response = await fetch(`${apiUrl}/employee/leaves/${leaveId}/withdraw?employee_id=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                alert('Leave request withdrawn successfully');
                fetchRecentLeaves();
                fetchBalance();
            } else {
                const error = await response.json();
                alert(`Failed to withdraw leave: ${error.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to withdraw leave request');
        }
    };

    if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading leave records...</div>;

    if (selectedLeaveId) {
        return <LeaveDetailsView leaveId={selectedLeaveId} userId={userId} onBack={() => setSelectedLeaveId(null)} />;
    }

    return (
        <div className="leaves-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Plane size={32} color="var(--primary)" /> {pageTitle}</h1>
                    <button 
                        onClick={() => { fetchBalance(); fetchRecentLeaves(); }}
                        className="btn-icon" 
                        style={{ 
                            background: 'rgba(255, 69, 0, 0.1)', 
                            borderRadius: '50%', 
                            padding: '5px',
                            cursor: 'pointer',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px'
                        }}
                        title="Sync Balance"
                    >
                        <RefreshCw size={16} />
                    </button>
                    {leaveData?.accrual_info?.last_sync && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Synced: {new Date(leaveData.accrual_info.last_sync).toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isBalanceView && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                            style={{ padding: '0.55rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', color: '#0f172a', fontWeight: 700, minWidth: '110px' }}
                        >
                            {availableYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    )}
                    {Array.isArray(leaveData?.types) && leaveData.types.map((type, idx) => {
                        const isSelected = selectedTypeName === type.name;
                        return (
                            <div
                                key={idx}
                                className="card shadow-sm"
                                style={{
                                    padding: '0.55rem 0.9rem',
                                    borderRadius: '10px',
                                    textAlign: 'center',
                                    minWidth: '120px',
                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                    border: isSelected ? '1px solid #93c5fd' : '1px solid var(--border-color)',
                                    cursor: isBalanceView ? 'pointer' : 'default'
                                }}
                                onClick={() => {
                                    if (isBalanceView) setSelectedTypeName(type.name);
                                }}
                            >
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{type.name}</div>
                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginTop: '0.2rem' }}>
                                    {type.remaining} Days
                                </div>
                                {isBalanceView && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTypeName(type.name)}
                                        style={{ marginTop: '0.4rem', border: 'none', background: 'transparent', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                                    >
                                        View Details
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {!isBalanceView && (
            <div className="grid-3">
                {/* Leave Application Form */}
                <div className="card" style={{ gridColumn: 'span 2', opacity: leaveData.is_intern ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Bot size={24} color="var(--primary)" />
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Smart Leave Application</h2>
                    </div>

                    {leaveData.is_intern && leaveData.remaining <= 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(200, 76, 255, 0.1)', border: '1px dashed var(--violet)', borderRadius: '8px' }}>
                            <Info size={32} color="var(--violet)" />
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
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>From Date Session</label>
                                    <select 
                                        value={formData.start_session}
                                        onChange={e => setFormData({ ...formData, start_session: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}
                                    >
                                        <option value="Full Day">Full Day</option>
                                        <option value="Session 1">Session 1 (Morning)</option>
                                        <option value="Session 2">Session 2 (Afternoon)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>To Date Session</label>
                                    <select 
                                        value={formData.end_session}
                                        onChange={e => setFormData({ ...formData, end_session: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-light)' }}
                                    >
                                        <option value="Full Day">Full Day</option>
                                        <option value="Session 1">Session 1 (Morning)</option>
                                        <option value="Session 2">Session 2 (Afternoon)</option>
                                    </select>
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
                                            <label key={app.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: formData.cc_ids.includes(app.employee_id) ? 'rgba(255, 69, 0, 0.2)' : 'transparent' }}>
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
                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 69, 0, 0.1)', border: '1px solid var(--secondary)', borderRadius: '8px' }}>
                            <p style={{ color: 'var(--secondary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Submitted Pending Admin Approval</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>The AI Smart Leave Agent has reviewed your request and forwarded it to the Administrator Space.</p>
                        </div>
                    )}
                </div>

                {/* AI Leave Insights */}
                <div className="card shadow-sm" style={{ borderColor: 'var(--border-color)', background: '#ffffff' }}>
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Team Availability</h2>
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
            )}

            {isBalanceView && selectedType && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                    {[
                        { label: 'Available Balance', value: availableBalance, key: 'avail' },
                        { label: 'Opening Balance', value: openingBalance, key: 'open' },
                        { label: 'Granted', value: Number(grantedForType.toFixed(2)), key: 'granted' },
                        { label: 'Availed', value: Number(totalConsumedForType.toFixed(2)), key: 'availed' }
                    ].map((item) => {
                        const isActive = item.key === 'granted' ? showGrantedTable : item.key === 'availed' ? showAvailedTable : false;
                        const isClickable = item.key === 'granted' || item.key === 'availed';
                        const handleClick = () => {
                            if (item.key === 'granted') setShowGrantedTable((prev) => !prev);
                            else if (item.key === 'availed') setShowAvailedTable((prev) => !prev);
                        };
                        return (
                        <div
                            key={item.label}
                            className="card shadow-sm"
                            onClick={isClickable ? handleClick : undefined}
                            style={{
                                background: isActive ? '#eff6ff' : '#ffffff',
                                border: isActive ? '1px solid #93c5fd' : '1px solid var(--border-color)',
                                padding: '0.85rem 1rem',
                                cursor: isClickable ? 'pointer' : 'default',
                                userSelect: 'none'
                            }}
                        >
                            <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {item.label}
                                {isClickable && (
                                    <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 600 }}>
                                        {isActive ? '▲ Hide' : '▼ Details'}
                                    </span>
                                )}
                            </div>
                            <div style={{ color: '#0f172a', fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>{item.value}</div>
                        </div>
                        );
                    })}
                </div>

                {showGrantedTable && (
                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid #93c5fd' }}>
                    <h2 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#1d4ed8' }}>▼</span> Granted — {selectedType.name} ({selectedYear})
                        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>{monthlyDetailData.length} month{monthlyDetailData.length !== 1 ? 's' : ''}</span>
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', background: '#f8fafc' }}>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Month</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Granted (Days)</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Consumed (Days)</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Running Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyDetailData.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No grant data for {selectedType.name} in {selectedYear}.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyDetailData.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.month}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#15803d' }}>{row.granted > 0 ? `+${row.granted}` : row.granted}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: row.consumed > 0 ? '#dc2626' : '#64748b' }}>{row.consumed > 0 ? `-${row.consumed}` : row.consumed}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: row.balance <= 0 ? '#dc2626' : '#0f172a' }}>{row.balance}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {monthlyDetailData.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border-color)', background: '#f0f9ff' }}>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Total</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#15803d' }}>+{Number(grantedForType.toFixed(2))}</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: totalConsumedForType > 0 ? '#dc2626' : '#64748b' }}>{totalConsumedForType > 0 ? `-${Number(totalConsumedForType.toFixed(2))}` : 0}</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{availableBalance}</td>
                                </tr>
                            </tfoot>
                            )}
                        </table>
                    </div>
                </div>
                )}

                {showAvailedTable && (
                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid #93c5fd' }}>
                    <h2 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#1d4ed8' }}>▼</span> Availed — {selectedType.name} ({selectedYear})
                        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>{approvedTypeRecords.length} record{approvedTypeRecords.length !== 1 ? 's' : ''}</span>
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', background: '#f8fafc' }}>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Leave Type</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Applied On</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>From</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>To</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Days</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedTypeRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No availed records for {selectedType.name} in {selectedYear}.
                                        </td>
                                    </tr>
                                ) : (
                                    approvedTypeRecords.map((leaf, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{leaf.leave_type || selectedType.name}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{leaf.applied_on ? new Date(leaf.applied_on).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{leaf.start_date ? new Date(leaf.start_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{leaf.end_date ? new Date(leaf.end_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1d4ed8' }}>{calculateLeaveDays(leaf)}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                                                    background: String(leaf.status || '').toLowerCase().includes('approved') ? '#dcfce7' : '#fef9c3',
                                                    color: String(leaf.status || '').toLowerCase().includes('approved') ? '#15803d' : '#92400e'
                                                }}>{leaf.status || '-'}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }} title={leaf.reason || ''}>{leaf.reason || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <h2 className="card-title" style={{ marginBottom: '1rem' }}>{selectedType.name}: {selectedYear}</h2>
                    <div style={{ width: '100%', height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyDetailData} margin={{ top: 10, right: 20, left: 10, bottom: 18 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: '1px solid #dbe4f0', boxShadow: '0 8px 25px rgba(15,23,42,0.1)' }}
                                    formatter={(value, name) => [value, name === 'balance' ? 'Balance' : 'Consumed']}
                                />
                                <Legend formatter={(value) => (value === 'balance' ? 'Balance' : 'Consumed')} />
                                <Bar dataKey="balance" fill="#7ec1ec" radius={[4, 4, 0, 0]} maxBarSize={34} />
                                <Bar dataKey="consumed" fill="#f28b82" radius={[4, 4, 0, 0]} maxBarSize={34} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <h2 className="card-title" style={{ marginBottom: '1rem' }}>Transactions</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>Transaction Type</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>Posted On</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>From</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>To</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>Days</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>Reason</th>
                                    <th style={{ padding: '0.85rem', color: 'var(--text-muted)' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedTypeRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No detailed records for {selectedType.name} in {selectedYear}.
                                        </td>
                                    </tr>
                                ) : (
                                    selectedTypeRecords.map((leaf, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.85rem', fontWeight: 600 }}>{leaf.leave_type || selectedType.name}</td>
                                            <td style={{ padding: '0.85rem' }}>{leaf.applied_on ? new Date(leaf.applied_on).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.85rem' }}>{leaf.start_date ? new Date(leaf.start_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.85rem' }}>{leaf.end_date ? new Date(leaf.end_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ padding: '0.85rem', fontWeight: 600 }}>{calculateLeaveDays(leaf)}</td>
                                            <td style={{ padding: '0.85rem', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaf.reason || ''}>{leaf.reason || '-'}</td>
                                            <td style={{ padding: '0.85rem', color: '#64748b' }}>{leaf.status || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}

            {/* Monthly Summary & History */}
            {!isApplyView && !isBalanceView && (
            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <div className="grid-3" style={{ gap: '1.5rem' }}>
                    <div className="card shadow-sm" style={{ textAlign: 'center', padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
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
                    
                    <div className="card shadow-sm" style={{ textAlign: 'center', padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PENDING REQUESTS</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F59E0B' }}>
                            {recentLeaves.filter(l => l.status.includes('Pending')).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Awaiting review</div>
                    </div>

                    <div className="card shadow-sm" style={{ textAlign: 'center', padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
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

                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={20} /> Recent Applications & Status</h2>
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
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent leave applications.</td>
                                    </tr>
                                ) : recentLeaves.map((leaf, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>
                                                {new Date(leaf.start_date).toLocaleDateString()} ({leaf.start_session || 'Full Day'}) 
                                                <br />
                                                to {new Date(leaf.end_date).toLocaleDateString()} ({leaf.end_session || 'Full Day'})
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Requested {new Date(leaf.applied_on).toLocaleDateString()}</div>
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
                                                                leaf.status.includes('Withdrawn') ? 'rgba(156, 163, 175, 0.15)' :
                                                                'rgba(245, 158, 11, 0.15)',
                                                color: leaf.status.includes('Approved') ? '#22C55E' : 
                                                       leaf.status.includes('Rejected') ? '#EF4444' : 
                                                       leaf.status.includes('Withdrawn') ? '#6B7280' :
                                                       '#F59E0B',
                                                border: `1px solid ${
                                                    leaf.status.includes('Approved') ? '#22C55E44' : 
                                                    leaf.status.includes('Rejected') ? '#EF444444' :
                                                    leaf.status.includes('Withdrawn') ? '#6B728044' :
                                                    '#F59E0B44'
                                                }`
                                            }}>
                                                {leaf.status}
                                            </span>
                                            {leaf.status === 'Pending Admin Approval' && (
                                                <button 
                                                    onClick={() => withdrawLeave(leaf.id)}
                                                    style={{ 
                                                        marginLeft: '0.5rem',
                                                        padding: '0.2rem 0.5rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: '#EF4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Withdraw this leave request"
                                                >
                                                    Withdraw
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                onClick={() => setSelectedLeaveId(leaf.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.4rem 0.8rem',
                                                    backgroundColor: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--secondary)'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                                            >
                                                <Eye size={14} />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default Leaves;
