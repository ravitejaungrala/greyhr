import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const SalaryModule = ({ userId }) => {
    const [payslips, setPayslips] = useState([]);
    const [salaryOverview, setSalaryOverview] = useState({ net_salary: 0, deductions: 0, tax: 0, gross_salary: 0 });
    const [joiningDate, setJoiningDate] = useState(null);
    const [settings, setSettings] = useState({ enable_tax: true, enable_pf: true });
    const [loading, setLoading] = useState(true);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const apiUrl = API_URL;

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Payslips & joining date
                const psRes = await fetch(`${apiUrl}/employee/payslips?employee_id=${userId}`);
                const psData = await psRes.json();
                setPayslips(psData.payslips || []);
                setJoiningDate(psData.joining_date);
                if (psData.settings) setSettings(psData.settings);

                // Fetch current fixed salary overview
                const salRes = await fetch(`${apiUrl}/employee/salary?employee_id=${userId}`);
                const salData = await salRes.json();
                if (!salData.error) {
                    setSalaryOverview(salData);
                    if (salData.settings) setSettings(salData.settings);
                }
            } catch (err) {
                console.error("Error fetching salary data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const toggleMonth = (month) => {
        setSelectedMonths(prev => 
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    };

    const handleExport = (format) => {
        if (selectedMonths.length === 0) {
            alert("Please select at least one month to export.");
            return;
        }
        let url = `${apiUrl}/employee/salary/statement/${format}?employee_id=${userId}&selected_months=${selectedMonths.join(',')}`;
        window.open(url, '_blank');
    };

    if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Fetching salary details...</div>;

    return (
        <div className="salary-page">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>💰 Salary Module</h1>
            <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
                <h2 className="card-title">💵 Current Month Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Salary</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(salaryOverview.net_salary)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gross Salary</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatCurrency(salaryOverview.gross_salary)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LOP Deductions</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(salaryOverview.lop_deduction || 0)}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({salaryOverview.lop_days || 0} days)</div>
                    </div>
                    {settings.enable_pf && (
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Other (PF/PT)</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(salaryOverview.pf_pt || 0)}</div>
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attendance Penalty</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(salaryOverview.attendance_penalty || 0)}</div>
                    </div>
                    {settings.enable_tax && (
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax (TDS)</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(salaryOverview.tax)}</div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setSelectedMonths(payslips.map(p => p.month))}
                        style={{ fontSize: '0.85rem' }}
                    >
                        Select All
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setSelectedMonths([])}
                        style={{ fontSize: '0.85rem' }}
                        disabled={selectedMonths.length === 0}
                    >
                        Clear Selection
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {selectedMonths.length > 0 && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                            {selectedMonths.length} selected
                            <span 
                                onClick={() => setSelectedMonths([])}
                                style={{ marginLeft: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', textDecoration: 'underline', fontWeight: 'normal' }}
                            >
                                Clear
                            </span>
                        </div>
                    )}
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleExport('excel')}>
                        📊 Excel Statement
                    </button>
                    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleExport('pdf')}>
                        📜 PDF Portfolio
                    </button>
                </div>
            </div>

            {joiningDate && (
                <div style={{ 
                    background: 'rgba(200, 76, 255, 0.1)', 
                    border: '1px solid var(--primary)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span>ℹ️</span> 
                    <span>You joined NeuZen AI on <strong>{new Date(joiningDate).toLocaleDateString()}</strong>. Salary history is shown based on your tenure.</span>
                </div>
            )}

            <div className="card" style={{ overflowX: 'auto' }}>
                <h2 className="card-title">📄 Salary Disbursement History</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                <input 
                                    type="checkbox" 
                                    onChange={(e) => setSelectedMonths(e.target.checked ? payslips.map(p => p.month) : [])}
                                    checked={selectedMonths.length === payslips.length && payslips.length > 0}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Month</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Gross</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>LOP</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Penalty</th>
                            {settings.enable_pf && <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>PF/Other</th>}
                            {settings.enable_tax && <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Tax</th>}
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Net Paid</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payslips.length === 0 ? <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No salary history found.</td></tr> :
                            payslips.map((p, i) => (
                                <tr key={i} style={{ 
                                    borderBottom: '1px solid var(--border-color)', 
                                    background: selectedMonths.includes(p.month) ? 'rgba(200, 76, 255, 0.05)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}>
                                    <td style={{ padding: '1rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedMonths.includes(p.month)}
                                            onChange={() => toggleMonth(p.month)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>{p.month}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.date}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{formatCurrency(p.gross_salary)}</td>
                                    <td style={{ padding: '1rem', color: '#EF4444' }}>{formatCurrency(p.lop_deduction)}</td>
                                    <td style={{ padding: '1rem', color: '#EF4444' }}>{formatCurrency(p.attendance_penalty)}</td>
                                    {settings.enable_pf && <td style={{ padding: '1rem', color: '#EF4444' }}>{formatCurrency(p.pf_pt)}</td>}
                                    {settings.enable_tax && <td style={{ padding: '1rem', color: 'var(--primary)' }}>{formatCurrency(p.tax)}</td>}
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{formatCurrency(p.net_salary)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {p.released ? (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} 
                                                onClick={() => window.open(`${apiUrl}/employee/payslip/download/${p.month}?employee_id=${userId}`, '_blank')}
                                            >
                                                View Slip
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                🔒 Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalaryModule;
