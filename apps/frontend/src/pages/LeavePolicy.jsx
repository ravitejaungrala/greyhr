import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Edit3, X, Save, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const LeavePolicy = ({ user }) => {
    const adminEmail = user?.email || '';
    const [defaults, setDefaults] = useState({ privilege_leave_rate: 1.5, sick_leave_rate: 1.0, casual_leave_rate: 1.0 });
    const [editDefaults, setEditDefaults] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [empRates, setEmpRates] = useState({});
    const [editingEmpId, setEditingEmpId] = useState(null);
    const [savingDefaults, setSavingDefaults] = useState(false);
    const [savingEmp, setSavingEmp] = useState(null);
    const [savedMsg, setSavedMsg] = useState('');
    const [loading, setLoading] = useState(true);

    const showMsg = (msg) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(''), 4000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [policyRes, empRes] = await Promise.all([
                fetch(`${API_URL}/admin/leave-policy/defaults`),
                fetch(`${API_URL}/auth/admin/employees?admin_email=${encodeURIComponent(adminEmail)}`)
            ]);
            const policyData = await policyRes.json();
            setDefaults(policyData);
            const empData = await empRes.json();
            const fullTime = (empData.employees || []).filter(e => e.employment_type !== 'Intern');
            setEmployees(fullTime);
            const rates = {};
            fullTime.forEach(emp => {
                rates[emp.employee_id] = {
                    privilege_leave_rate: emp.privilege_leave_rate ?? 1.5,
                    sick_leave_rate: emp.sick_leave_rate ?? 1.0,
                    casual_leave_rate: emp.casual_leave_rate ?? 1.0
                };
            });
            setEmpRates(rates);
        } catch (e) {
            showMsg('Failed to load policy data.');
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [adminEmail]);

    const saveDefaults = async () => {
        if (!editDefaults) return;
        setSavingDefaults(true);
        try {
            const res = await fetch(`${API_URL}/admin/leave-policy/defaults`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editDefaults)
            });
            const data = await res.json();
            setDefaults(editDefaults);
            setEditDefaults(null);
            showMsg(data.message || 'Policy saved successfully.');
            await loadData();
        } catch {
            showMsg('Failed to save policy.');
        }
        setSavingDefaults(false);
    };

    const saveEmpRates = async (empId) => {
        setSavingEmp(empId);
        try {
            await fetch(`${API_URL}/admin/employee/${empId}/leave-rates`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(empRates[empId])
            });
            setEditingEmpId(null);
            showMsg('Employee rates updated successfully.');
        } catch {
            showMsg('Failed to update employee rates.');
        }
        setSavingEmp(null);
    };

    const rateFields = [
        { key: 'privilege_leave_rate', label: 'Privilege Leave (PL)', color: '#7c3aed' },
        { key: 'sick_leave_rate', label: 'Sick Leave (SL)', color: '#0891b2' },
        { key: 'casual_leave_rate', label: 'Casual Leave (CL)', color: '#059669' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {savedMsg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} /> {savedMsg}
                </div>
            )}

            {/* Company Default Policy */}
            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div>
                        <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>Company Default Leave Policy</h2>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                            Monthly accrual rates applied to all full-time employees. Interns are not eligible.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <RefreshCw size={13} /> Refresh
                        </button>
                        {!editDefaults ? (
                            <button onClick={() => setEditDefaults({ ...defaults })} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                                <Edit3 size={14} /> Edit Policy
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => setEditDefaults(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }}>
                                    <X size={14} /> Cancel
                                </button>
                                <button onClick={saveDefaults} disabled={savingDefaults} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', border: 'none', borderRadius: '8px', background: '#ff4500', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <Save size={14} /> {savingDefaults ? 'Saving...' : 'Save & Apply to All'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {editDefaults && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#92400e' }}>
                        <AlertCircle size={15} /> Saving will apply these rates to <strong>all active full-time employees</strong> immediately. You can override per-employee below.
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {rateFields.map(({ key, label, color }) => (
                        <div key={key} style={{ border: `1px solid ${editDefaults ? '#93c5fd' : '#e2e8f0'}`, borderRadius: '12px', padding: '1.25rem', background: editDefaults ? '#eff6ff' : '#f8fafc' }}>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.75rem' }}>{label}</div>
                            {editDefaults ? (
                                <input
                                    type="number" min="0" max="30" step="0.5"
                                    value={editDefaults[key]}
                                    onChange={(e) => setEditDefaults({ ...editDefaults, [key]: parseFloat(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', background: '#ffffff' }}
                                />
                            ) : (
                                <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{defaults[key]}</div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>days / month</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-Employee Overrides */}
            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>Individual Employee Leave Rates</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    Override leave accrual rates for specific full-time employees. Individual changes take effect immediately.
                </p>

                {loading ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading employees...</p>
                ) : employees.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No full-time employees found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>Employee</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>ID</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#7c3aed', textAlign: 'center', fontWeight: 600 }}>PL / mo</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#0891b2', textAlign: 'center', fontWeight: 600 }}>SL / mo</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#059669', textAlign: 'center', fontWeight: 600 }}>CL / mo</th>
                                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, idx) => {
                                    const isEditing = editingEmpId === emp.employee_id;
                                    const rates = empRates[emp.employee_id] || { privilege_leave_rate: 1.5, sick_leave_rate: 1.0, casual_leave_rate: 1.0 };
                                    return (
                                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid #f1f5f9', background: isEditing ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc') }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{emp.name}</td>
                                            <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{emp.employee_id}</td>
                                            {['privilege_leave_rate', 'sick_leave_rate', 'casual_leave_rate'].map(rk => (
                                                <td key={rk} style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                    {isEditing ? (
                                                        <input
                                                            type="number" min="0" max="30" step="0.5"
                                                            value={rates[rk]}
                                                            onChange={(e) => setEmpRates(prev => ({
                                                                ...prev,
                                                                [emp.employee_id]: { ...rates, [rk]: parseFloat(e.target.value) || 0 }
                                                            }))}
                                                            style={{ width: '72px', padding: '0.3rem 0.5rem', border: '1px solid #93c5fd', borderRadius: '6px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rates[rk]}</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button onClick={() => setEditingEmpId(null)} style={{ padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                                                        <button onClick={() => saveEmpRates(emp.employee_id)} disabled={savingEmp === emp.employee_id} style={{ padding: '0.3rem 0.7rem', border: 'none', borderRadius: '6px', background: '#ff4500', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                                            {savingEmp === emp.employee_id ? '...' : 'Save'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setEditingEmpId(emp.employee_id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        <Edit3 size={12} /> Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeavePolicy;
