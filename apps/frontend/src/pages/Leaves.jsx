import React, { useState, useEffect } from 'react';
import {
    Plane, RefreshCw, Info,
    CheckCircle2, FileText,
    History, Users, Eye
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { API_URL } from '../config';
import LeaveDetailsView from './LeaveDetailsView';
import toast from '../lib/toast';

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
    const [lopOption, setLopOption] = useState('');
    const [deductFromNextMonthType, setDeductFromNextMonthType] = useState('Casual Leave');
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

    useEffect(() => {
        if (Array.isArray(leaveData?.types) && leaveData.types.length > 0) {
            const filteredTypes = leaveData.types.filter(t => t.name !== 'Privilege Leave');
            if (filteredTypes.length > 0) {
                setFormData(prev => ({ ...prev, leave_type: filteredTypes[0].name }));
            }
        }
    }, [leaveData]);

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

    const requestedDays = calculateLeaveDays({
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_session: formData.start_session,
        end_session: formData.end_session
    });

    const activeTypeData = (leaveData?.types || []).find(t => t.name === formData.leave_type);
    const activeBalance = activeTypeData ? Number(activeTypeData.remaining || 0) : 0;
    const isInsufficient = requestedDays > activeBalance;
    const excessDays = isInsufficient ? requestedDays - activeBalance : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyConsumed = Array.from({ length: 12 }, (_, i) => ({ monthIndex: i, consumed: 0 }));
    approvedTypeRecords.forEach((leave) => {
        const start = new Date(leave.start_date);
        const idx = start.getMonth();
        monthlyConsumed[idx].consumed += calculateLeaveDays(leave);
    });

    const monthLimit = selectedYear < new Date().getFullYear() ? 12 : (selectedYear > new Date().getFullYear() ? 0 : (new Date().getMonth() + 1));

    // Get the rate of the selected leave type
    const activeType = (leaveData?.types || []).find((type) => type.name === selectedTypeName) || (leaveData?.types || [])[0] || null;
    const rate = activeType ? Number(activeType.rate || 0) : 0;
    
    // Parse user joining date to filter out months before they joined
    const joiningDateStr = leaveData?.joining_date || user?.joining_date;
    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : null;

    let runningBalance = openingBalance;
    const monthlyDetailData = months.slice(0, monthLimit).map((m, idx) => {
        // Check if employee had joined in this month
        let hasJoined = true;
        if (joiningDate) {
            const jYear = joiningDate.getFullYear();
            const jMonth = joiningDate.getMonth(); // 0-indexed
            if (selectedYear < jYear || (selectedYear === jYear && idx < jMonth)) {
                hasJoined = false;
            }
        }

        const granted = hasJoined ? rate : 0.0;
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

        if (isInsufficient && !lopOption) {
            toast.error('Please select an option to handle insufficient leaves (Salary Cut or Next Month Deduction).');
            return;
        }

        setStatus('processing');

        try {
            const response = await fetch(`${apiUrl}/leaves/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    cc_ids: formData.cc_ids.filter(id => id && id !== ''),
                    lop_option: isInsufficient ? lopOption : null,
                    excess_days: excessDays,
                    deduct_from_next_month_type: (isInsufficient && lopOption === 'next_month_deduction') ? deductFromNextMonthType : null
                })
            });

            if (response.ok) {
                setTimeout(() => {
                    setStatus('submitted');
                    fetchBalance();
                    fetchRecentLeaves();
                    setLopOption('');
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
                toast.success('Leave request withdrawn successfully');
                fetchRecentLeaves();
                fetchBalance();
            } else {
                const error = await response.json();
                toast.error(`Failed to withdraw leave: ${error.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to withdraw leave request');
        }
    };

    if (loading) {
        return (
            <div className="ds">
                <div className="ds-wrap-narrow">
                    <div className="ds-loading">
                        <div className="ds-spinner" />
                        Loading leave records…
                    </div>
                </div>
            </div>
        );
    }

    if (selectedLeaveId) {
        return <LeaveDetailsView leaveId={selectedLeaveId} userId={userId} onBack={() => setSelectedLeaveId(null)} />;
    }

    const statusVariant = (raw) => {
        const s = String(raw || '').toLowerCase();
        if (s.includes('approved')) return 'present';
        if (s.includes('rejected')) return 'absent';
        if (s.includes('withdrawn')) return 'muted';
        return 'off';
    };

    /* ---------------- shared header ---------------- */
    const header = (
        <div className="ds-page-head">
            <div className="ds-brand">
                <div className="ds-icon"><Plane size={17} /></div>
                <h1>{pageTitle}</h1>
                <button
                    onClick={() => { fetchBalance(); fetchRecentLeaves(); }}
                    className="ds-sync-btn"
                    title="Sync balance"
                    type="button"
                >
                    <RefreshCw size={13} />
                </button>
                {leaveData?.accrual_info?.last_sync && (
                    <div className="ds-sync">
                        Synced {new Date(leaveData.accrual_info.last_sync).toLocaleTimeString()}
                    </div>
                )}
            </div>

            <div className="ds-head-right">
                {isBalanceView && (
                    <select
                        className="ds-year-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                )}

                <div className="ds-balance-strip">
                    {Array.isArray(leaveData?.types) && leaveData.types.map((type, idx) => {
                        const isSelected = selectedTypeName === type.name;
                        return (
                            <div
                                key={idx}
                                className={`ds-balance-card${isSelected && isBalanceView ? ' active' : ''}${isBalanceView ? ' with-link' : ''}`}
                                style={!isBalanceView ? { cursor: 'default' } : undefined}
                                onClick={() => { if (isBalanceView) setSelectedTypeName(type.name); }}
                            >
                                <div className="label">{type.name}</div>
                                <div className="value">{type.remaining} Days</div>
                                {isBalanceView && <div className="link">View details</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="ds">
            <div className="ds-wrap-narrow">

                {header}

                {/* ============================= APPLY VIEW ============================= */}
                {!isBalanceView && (
                    <div className="ds-layout">

                        {/* ---------- Application form ---------- */}
                        <div className="ds-panel roomier" style={leaveData.is_intern ? { opacity: 0.75 } : undefined}>
                            <div className="ds-panel-title serif-xl">
                                <span className="ic-box"><FileText size={14} /></span>
                                Smart Leave Application
                            </div>

                            {leaveData.is_intern && leaveData.remaining <= 0 ? (
                                <div className="ds-insight-box" style={{ textAlign: 'center', padding: '28px 20px' }}>
                                    <Info size={26} style={{ marginBottom: 10 }} />
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Internship Policy Notice</div>
                                    <div style={{ color: 'var(--ink-soft)' }}>
                                        {leaveData.message || "Interns are not eligible for paid leaves. You can only apply for earned Compensatory Off."}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={submitLeave}>

                                    <div className="ds-field">
                                        <label>Leave subject</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Brief summary (e.g. Family Function / Medical Checkup)"
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        />
                                    </div>

                                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                        <div className="ds-field">
                                            <label>Select employee</label>
                                            <select
                                                value={formData.employee_id}
                                                onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                                            >
                                                <option value={userId}>Current User (You)</option>
                                                {employeeDirectory.filter(emp => emp.employee_id !== userId).map(emp => (
                                                    <option key={emp.employee_id} value={emp.employee_id}>
                                                        {emp.name} ({emp.employee_id})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="ds-field">
                                        <label>Leave type</label>
                                        <select
                                            value={formData.leave_type}
                                            onChange={e => setFormData({ ...formData, leave_type: e.target.value })}
                                        >
                                            {leaveData.types
                                                .filter(t => t.name !== 'Privilege Leave')
                                                .filter(t => !leaveData.is_intern || t.name === 'Compensatory Off' || t.remaining > 0)
                                                .map(t => (<option key={t.name}>{t.name}</option>))
                                            }
                                        </select>
                                    </div>

                                    <div className="ds-field ds-row two">
                                        <div>
                                            <label>From date</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label>To date</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.end_date}
                                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="ds-field ds-row three">
                                        <div>
                                            <label>From date session</label>
                                            <select
                                                value={formData.start_session}
                                                onChange={e => setFormData({ ...formData, start_session: e.target.value })}
                                            >
                                                <option value="Full Day">Full Day</option>
                                                <option value="Session 1">Session 1 (Morning)</option>
                                                <option value="Session 2">Session 2 (Afternoon)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>To date session</label>
                                            <select
                                                value={formData.end_session}
                                                onChange={e => setFormData({ ...formData, end_session: e.target.value })}
                                            >
                                                <option value="Full Day">Full Day</option>
                                                <option value="Session 1">Session 1 (Morning)</option>
                                                <option value="Session 2">Session 2 (Afternoon)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>Send request to (approver)</label>
                                            <select
                                                required
                                                value={formData.approver_id}
                                                onChange={e => setFormData({ ...formData, approver_id: e.target.value })}
                                            >
                                                <option value="">Select approver</option>
                                                {approvers.map(app => (
                                                    <option key={app.employee_id} value={app.employee_id}>
                                                        {app.name} ({app.role === 'super_admin' ? 'Super Admin' : (app.role === 'hr' ? 'HR' : 'Admin')})
                                                    </option>
                                                ))}
                                                {approvers.length === 0 && <option value="">No admins found</option>}
                                            </select>
                                        </div>
                                    </div>

                                    {/* CC recipients */}
                                    <div className="ds-field">
                                        <label>CC recipients ({formData.cc_ids.length} selected)</label>
                                        <input
                                            type="text"
                                            placeholder="Search employees to CC…"
                                            value={ccSearch}
                                            onChange={e => setCcSearch(e.target.value)}
                                            style={{ marginBottom: 10 }}
                                        />
                                        <div className="ds-cc-box" style={{ display: 'block', maxHeight: 140, overflowY: 'auto' }}>
                                            {approvers
                                                .filter(a => a.employee_id !== formData.approver_id && a.employee_id !== userId)
                                                .filter(a => a.name.toLowerCase().includes(ccSearch.toLowerCase()))
                                                .map(app => (
                                                    <label key={app.employee_id} className="ds-cc-option">
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
                                                        <span>
                                                            {app.name}
                                                            <small> ({app.role.replace('_', ' ')})</small>
                                                        </span>
                                                    </label>
                                                ))
                                            }
                                            {approvers.length === 0 && <span>No recipients available</span>}
                                        </div>
                                    </div>

                                    {/* Insufficient balance handling */}
                                    {isInsufficient && (
                                        <div className="ds-lop-box">
                                            <div className="ds-lop-head">
                                                <Info size={15} />
                                                <span>Insufficient leave balance</span>
                                            </div>
                                            <p className="ds-lop-copy">
                                                You are requesting <strong>{requestedDays} days</strong> of leave, but your remaining
                                                balance for <strong>{formData.leave_type}</strong> is only <strong>{activeBalance} days</strong>.
                                                Choose how to handle the remaining <strong>{excessDays} excess day(s)</strong>:
                                            </p>

                                            <label className="ds-radio">
                                                <input
                                                    type="radio"
                                                    name="lop_option"
                                                    value="salary_cut"
                                                    checked={lopOption === 'salary_cut'}
                                                    onChange={() => setLopOption('salary_cut')}
                                                />
                                                <span>Salary cut (loss of pay) for {excessDays} day(s)</span>
                                            </label>

                                            <label className="ds-radio">
                                                <input
                                                    type="radio"
                                                    name="lop_option"
                                                    value="next_month_deduction"
                                                    checked={lopOption === 'next_month_deduction'}
                                                    onChange={() => setLopOption('next_month_deduction')}
                                                />
                                                <span>Deduct from next month's accrued balance</span>
                                            </label>

                                            {lopOption === 'next_month_deduction' && (
                                                <div style={{ marginLeft: 26, marginTop: 10 }}>
                                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-faint)', marginBottom: 6 }}>
                                                        Deduct from next month's
                                                    </label>
                                                    <select
                                                        value={deductFromNextMonthType}
                                                        onChange={e => setDeductFromNextMonthType(e.target.value)}
                                                        style={{ minWidth: 170, width: 'auto' }}
                                                    >
                                                        <option value="Casual Leave">Casual Leave</option>
                                                        <option value="Sick Leave">Sick Leave</option>
                                                        <option value="Privilege Leave">Privilege Leave</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="ds-field">
                                        <label>Reason</label>
                                        <textarea
                                            rows="3"
                                            required
                                            value={formData.reason}
                                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                            placeholder="Briefly describe your reason…"
                                        />
                                    </div>

                                    <button type="submit" className="ds-submit-btn" disabled={status === 'processing'}>
                                        {status === 'processing' ? 'Submitting & analyzing…' : 'Submit Request'}
                                    </button>
                                </form>
                            )}

                            {status === 'submitted' && (
                                <div className="ds-insight-box" style={{ marginTop: 20, marginBottom: 0 }}>
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <CheckCircle2 size={16} /> Submitted — pending admin approval
                                    </div>
                                    The AI Smart Leave Agent has reviewed your request and forwarded it to the administrator space.
                                </div>
                            )}
                        </div>

                        {/* ---------- Team availability ---------- */}
                        <div className="ds-panel roomier">
                            <div className="ds-panel-title serif-xl">
                                <span className="ic-box"><Users size={14} /></span>
                                Team Availability
                            </div>
                            <div className="ds-team-note">AI snapshot of your team's current availability.</div>

                            {teamAvailability.length === 0 ? (
                                <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading team status…</div>
                            ) : teamAvailability.map(member => {
                                const online = member.status === 'Available';
                                return (
                                    <div className="ds-member" key={member.id}>
                                        <div className="who">
                                            <div className="ds-avatar">{member.initials}</div>
                                            <div className="name">
                                                {member.name}
                                                {member.id === userId && <small>You</small>}
                                            </div>
                                        </div>
                                        <div className={`ds-status-dot${online ? ' online' : ''}`}>
                                            <span className="ds-dot" />{member.status}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ============================ BALANCE VIEW ============================ */}
                {isBalanceView && selectedType && (
                    <>
                        {/* ---------- Summary cards ---------- */}
                        <div className="ds-summary">
                            {[
                                { label: 'Available balance', value: availableBalance, key: 'avail' },
                                { label: 'Opening balance', value: openingBalance, key: 'open' },
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
                                        className="ds-summary-card"
                                        onClick={isClickable ? handleClick : undefined}
                                        style={{
                                            cursor: isClickable ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            borderColor: isActive ? 'var(--accent)' : undefined
                                        }}
                                    >
                                        <div className="top-row">
                                            <span className="label">{item.label}</span>
                                            {isClickable && (
                                                <span className="detail-link">{isActive ? '▲ Hide' : '▾ Details'}</span>
                                            )}
                                        </div>
                                        <div className="value">{item.value}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ---------- Granted breakdown ---------- */}
                        {showGrantedTable && (
                            <div className="ds-panel roomy stacked">
                                <div className="ds-panel-title serif-lg">
                                    Granted — {selectedType.name} · {selectedYear}
                                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)', fontWeight: 400 }}>
                                        {monthlyDetailData.length} month{monthlyDetailData.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Granted (days)</th>
                                                <th>Consumed (days)</th>
                                                <th>Running balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyDetailData.length === 0 ? (
                                                <tr className="ds-empty-row">
                                                    <td colSpan="4">No grant data for {selectedType.name} in {selectedYear}.</td>
                                                </tr>
                                            ) : monthlyDetailData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: 600 }}>{row.month}</td>
                                                    <td className="ds-amt positive">{row.granted > 0 ? `+${row.granted}` : row.granted}</td>
                                                    <td className={`ds-amt${row.consumed > 0 ? ' negative' : ''}`}>{row.consumed > 0 ? `-${row.consumed}` : row.consumed}</td>
                                                    <td className={`ds-amt${row.balance <= 0 ? ' negative' : ''}`}>{row.balance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {monthlyDetailData.length > 0 && (
                                            <tfoot>
                                                <tr style={{ background: 'var(--bg)' }}>
                                                    <td style={{ fontWeight: 700 }}>Total</td>
                                                    <td className="ds-amt positive">+{Number(grantedForType.toFixed(2))}</td>
                                                    <td className={`ds-amt${totalConsumedForType > 0 ? ' negative' : ''}`}>
                                                        {totalConsumedForType > 0 ? `-${Number(totalConsumedForType.toFixed(2))}` : 0}
                                                    </td>
                                                    <td className="ds-amt">{availableBalance}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ---------- Availed breakdown ---------- */}
                        {showAvailedTable && (
                            <div className="ds-panel roomy stacked">
                                <div className="ds-panel-title serif-lg">
                                    Availed — {selectedType.name} · {selectedYear}
                                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)', fontWeight: 400 }}>
                                        {approvedTypeRecords.length} record{approvedTypeRecords.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="ds-table">
                                        <thead>
                                            <tr>
                                                <th>Leave type</th><th>Applied on</th><th>From</th>
                                                <th>To</th><th>Days</th><th>Status</th><th>Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {approvedTypeRecords.length === 0 ? (
                                                <tr className="ds-empty-row">
                                                    <td colSpan="7">No availed records for {selectedType.name} in {selectedYear}.</td>
                                                </tr>
                                            ) : approvedTypeRecords.map((leaf, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: 600 }}>{leaf.leave_type || selectedType.name}</td>
                                                    <td>{leaf.applied_on ? new Date(leaf.applied_on).toLocaleDateString() : '–'}</td>
                                                    <td>{leaf.start_date ? new Date(leaf.start_date).toLocaleDateString() : '–'}</td>
                                                    <td>{leaf.end_date ? new Date(leaf.end_date).toLocaleDateString() : '–'}</td>
                                                    <td className="ds-amt">{calculateLeaveDays(leaf)}</td>
                                                    <td><span className={`ds-pill ${statusVariant(leaf.status)}`}>{leaf.status || '–'}</span></td>
                                                    <td className="ds-truncate" title={leaf.reason || ''}>{leaf.reason || '–'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ---------- Balance chart ---------- */}
                        <div className="ds-panel roomy stacked">
                            <div className="ds-panel-title serif-lg" style={{ marginBottom: 12 }}>
                                {selectedType.name} · {selectedYear}
                            </div>
                            <div className="ds-chart-wrap tall">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyDetailData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fill: '#A0A4B8', fontSize: 11, fontFamily: 'Inter' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: '#A0A4B8', fontSize: 11, fontFamily: 'Inter' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(53,82,214,0.05)' }}
                                            contentStyle={{
                                                borderRadius: 10,
                                                border: '1px solid var(--border)',
                                                boxShadow: '0 8px 24px -12px rgba(20,24,45,0.18)',
                                                fontSize: 12.5,
                                                fontFamily: 'Inter'
                                            }}
                                            formatter={(value, name) => [value, name === 'balance' ? 'Balance' : 'Consumed']}
                                        />
                                        <Bar
                                            dataKey="balance"
                                            fill="#3552D6"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={26}
                                        />
                                        <Bar
                                            dataKey="consumed"
                                            fill="#E5484D"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={26}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="ds-chart-legend">
                                <div className="item"><span className="ds-swatch" style={{ background: '#3552D6' }} />Balance</div>
                                <div className="item"><span className="ds-swatch" style={{ background: '#E5484D' }} />Consumed</div>
                            </div>
                        </div>

                        {/* ---------- Transactions ---------- */}
                        <div className="ds-panel roomy stacked">
                            <div className="ds-panel-title serif-lg">Transactions</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction type</th><th>Posted on</th><th>From</th>
                                            <th>To</th><th>Days</th><th>Reason</th><th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTypeRecords.length === 0 ? (
                                            <tr className="ds-empty-row">
                                                <td colSpan="7">No detailed records for {selectedType.name} in {selectedYear}.</td>
                                            </tr>
                                        ) : selectedTypeRecords.map((leaf, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>{leaf.leave_type || selectedType.name}</td>
                                                <td>{leaf.applied_on ? new Date(leaf.applied_on).toLocaleDateString() : '–'}</td>
                                                <td>{leaf.start_date ? new Date(leaf.start_date).toLocaleDateString() : '–'}</td>
                                                <td>{leaf.end_date ? new Date(leaf.end_date).toLocaleDateString() : '–'}</td>
                                                <td className="ds-amt">{calculateLeaveDays(leaf)}</td>
                                                <td className="ds-truncate" title={leaf.reason || ''}>{leaf.reason || '–'}</td>
                                                <td style={{ color: 'var(--ink-soft)' }}>{leaf.status || '–'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ====================== COMBINED VIEW (mode="all") ===================== */}
                {!isApplyView && !isBalanceView && (
                    <>
                        <div className="ds-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="ds-summary-card">
                                <div className="top-row"><span className="label">Leaves this month</span></div>
                                <div className="value">
                                    {recentLeaves.filter(l => {
                                        const isApproved = l.status && l.status.toLowerCase().includes('approved');
                                        const currentMonth = new Date().toISOString().slice(0, 7);
                                        return isApproved && l.start_date.slice(0, 7) === currentMonth;
                                    }).length}
                                </div>
                            </div>
                            <div className="ds-summary-card">
                                <div className="top-row"><span className="label">Pending requests</span></div>
                                <div className="value" style={{ color: 'var(--off)' }}>
                                    {recentLeaves.filter(l => l.status.includes('Pending')).length}
                                </div>
                            </div>
                            <div className="ds-summary-card">
                                <div className="top-row"><span className="label">Upcoming leaves</span></div>
                                <div className="value" style={{ color: 'var(--present)' }}>
                                    {recentLeaves.filter(l => {
                                        const isApproved = l.status && l.status.toLowerCase().includes('approved');
                                        return isApproved && new Date(l.start_date) > new Date();
                                    }).length}
                                </div>
                            </div>
                        </div>

                        <div className="ds-panel roomy">
                            <div className="ds-panel-title serif-lg">
                                <History size={15} className="ic" /> Recent applications &amp; status
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Date range</th><th>Type</th><th>Reason</th><th>Status</th><th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLeaves.length === 0 ? (
                                            <tr className="ds-empty-row">
                                                <td colSpan="5">No recent leave applications.</td>
                                            </tr>
                                        ) : recentLeaves.map((leaf, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>
                                                        {new Date(leaf.start_date).toLocaleDateString()} ({leaf.start_session || 'Full Day'})
                                                        <br />
                                                        to {new Date(leaf.end_date).toLocaleDateString()} ({leaf.end_session || 'Full Day'})
                                                    </div>
                                                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                                                        Requested {new Date(leaf.applied_on).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span className="ds-pill accent">{leaf.leave_type_short || 'L'}</span>
                                                        <span>{leaf.leave_type}</span>
                                                    </div>
                                                </td>
                                                <td className="ds-truncate" title={leaf.reason}>{leaf.reason}</td>
                                                <td>
                                                    <span className={`ds-pill ${statusVariant(leaf.status)}`}>{leaf.status}</span>
                                                    {leaf.status === 'Pending Admin Approval' && (
                                                        <button
                                                            className="ds-btn"
                                                            style={{ marginLeft: 8, padding: '4px 10px', fontSize: 11.5, color: 'var(--absent)' }}
                                                            onClick={() => withdrawLeave(leaf.id)}
                                                            title="Withdraw this leave request"
                                                        >
                                                            Withdraw
                                                        </button>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="ds-btn"
                                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                                        onClick={() => setSelectedLeaveId(leaf.id)}
                                                    >
                                                        <Eye size={13} /> View details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default Leaves;
