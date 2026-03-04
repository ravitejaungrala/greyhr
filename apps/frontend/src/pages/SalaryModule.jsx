import React, { useState, useEffect } from 'react';

const SalaryModule = ({ userId }) => {
    const [payslips, setPayslips] = useState([]);
    const [salaryOverview, setSalaryOverview] = useState({ net_salary: 0, deductions: 0, tax: 0, gross_salary: 0 });
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Payslips
                const psRes = await fetch(`${apiUrl}/employee/payslips?employee_id=${userId}`);
                const psData = await psRes.json();
                setPayslips(psData.payslips || []);

                // Fetch current fixed salary overview
                const salRes = await fetch(`${apiUrl}/employee/salary?employee_id=${userId}`);
                const salData = await salRes.json();
                if (!salData.error) {
                    setSalaryOverview(salData);
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
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Other (PF/PT)</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(salaryOverview.deductions - (salaryOverview.lop_deduction || 0) - (salaryOverview.attendance_penalty || 0))}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attendance Penalty</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(salaryOverview.attendance_penalty || 0)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax (TDS)</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(salaryOverview.tax)}</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="card-title">📄 Recent Payslips</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {payslips.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No payslips found.</p> :
                        payslips.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{p.month}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Disbursed on {p.date}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{p.amount}</div>
                                    <button className="btn btn-secondary" onClick={() => window.open(`${apiUrl}/employee/payslip/download/${p.month}?employee_id=${userId}`, '_blank')}>Download</button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default SalaryModule;
