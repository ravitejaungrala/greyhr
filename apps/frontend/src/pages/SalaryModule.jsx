import React, { useState, useEffect } from 'react';
import {
    CreditCard, IndianRupee, BarChart3, FileText,
    Info, History, Lock
} from 'lucide-react';
import { API_URL } from '../config';
import toast from '../lib/toast';

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
        const releasedSelected = selectedMonths.filter(m => {
            const ps = payslips.find(p => p.month === m);
            return ps && ps.released;
        });
        if (releasedSelected.length === 0) {
            toast.error("Please select at least one released month to export.");
            return;
        }
        let url = `${apiUrl}/employee/salary/statement/${format}?employee_id=${userId}&selected_months=${releasedSelected.join(',')}`;
        window.open(url, '_blank');
    };

    const columnCount = 6 + (settings.enable_pf ? 1 : 0) + (settings.enable_tax ? 1 : 0);
    const summaryCols = 5 + (settings.enable_tax ? 1 : 0);

    if (loading) {
        return (
            <div className="ds">
                <div className="ds-wrap">
                    <div className="ds-loading">
                        <div className="ds-spinner" />
                        Fetching salary details…
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ds">
            <div className="ds-wrap">

                {/* ---------- Header ---------- */}
                <div className="ds-brand" style={{ marginBottom: 24 }}>
                    <div className="ds-icon"><CreditCard size={17} /></div>
                    <h1>Salary Module</h1>
                </div>

                {/* ---------- Current month summary ---------- */}
                <div className="ds-panel roomy stacked">
                    <div className="ds-panel-title serif-lg">
                        <IndianRupee size={15} className="ic" /> Current month summary
                    </div>
                    <div className={`ds-summary-grid${summaryCols === 6 ? ' six' : ''}`}>
                        <div className="ds-summary-item">
                            <div className="label">Net salary</div>
                            <div className="value neutral">{formatCurrency(salaryOverview.net_salary)}</div>
                        </div>
                        <div className="ds-summary-item">
                            <div className="label">Gross salary</div>
                            <div className="value neutral">{formatCurrency(salaryOverview.gross_salary)}</div>
                        </div>
                        <div className="ds-summary-item">
                            <div className="label">LOP deductions</div>
                            <div className="value negative">{formatCurrency(salaryOverview.lop_deduction || 0)}</div>
                            <div className="sub">{salaryOverview.lop_days || 0} days</div>
                        </div>
                        <div className="ds-summary-item">
                            <div className="label">Other (PF/PT)</div>
                            <div className="value negative">
                                {settings.enable_pf ? formatCurrency(salaryOverview.pf_pt || 0) : '–'}
                            </div>
                        </div>
                        <div className="ds-summary-item">
                            <div className="label">Attendance penalty</div>
                            <div className="value negative">{formatCurrency(salaryOverview.attendance_penalty || 0)}</div>
                        </div>
                        {settings.enable_tax && (
                            <div className="ds-summary-item">
                                <div className="label">Tax (TDS)</div>
                                <div className="value negative">{formatCurrency(salaryOverview.tax)}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ---------- Toolbar ---------- */}
                <div className="ds-toolbar">
                    <div className="ds-btn-group">
                        <button
                            className="ds-btn"
                            onClick={() => setSelectedMonths(payslips.map(p => p.month))}
                        >
                            Select all
                        </button>
                        <button
                            className="ds-btn"
                            onClick={() => setSelectedMonths([])}
                            disabled={selectedMonths.length === 0}
                        >
                            Clear selection
                        </button>
                        {selectedMonths.length > 0 && (
                            <span className="ds-pill accent" style={{ alignSelf: 'center' }}>
                                {selectedMonths.length} selected
                            </span>
                        )}
                    </div>

                    <div className="ds-btn-group">
                        <button className="ds-btn accent" onClick={() => handleExport('excel')}>
                            <BarChart3 size={15} /> Excel statement
                        </button>
                        <button className="ds-btn primary" onClick={() => handleExport('pdf')}>
                            <FileText size={15} /> PDF portfolio
                        </button>
                    </div>
                </div>

                {/* ---------- Tenure notice ---------- */}
                {joiningDate && (
                    <div className="ds-notice">
                        <Info size={16} />
                        <span>
                            You joined NeuZen AI on <strong>{new Date(joiningDate).toLocaleDateString()}</strong>.
                            {' '}Salary history is shown based on your tenure.
                        </span>
                    </div>
                )}

                {/* ---------- Disbursement history ---------- */}
                <div className="ds-panel roomy" style={{ overflowX: 'auto' }}>
                    <div className="ds-panel-title serif-lg">
                        <History size={15} className="ic" /> Salary disbursement history
                    </div>
                    <table className="ds-table filled">
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>
                                    <input
                                        type="checkbox"
                                        onChange={(e) => setSelectedMonths(e.target.checked ? payslips.map(p => p.month) : [])}
                                        checked={selectedMonths.length === payslips.length && payslips.length > 0}
                                    />
                                </th>
                                <th>Month</th>
                                <th>Gross</th>
                                <th>LOP</th>
                                <th>Penalty</th>
                                {settings.enable_pf && <th>PF/Other</th>}
                                {settings.enable_tax && <th>Tax</th>}
                                <th>Net paid</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payslips.length === 0 ? (
                                <tr className="ds-empty-row">
                                    <td colSpan={columnCount}>No salary history found.</td>
                                </tr>
                            ) : (
                                payslips.map((p, i) => (
                                    <tr
                                        key={i}
                                        style={selectedMonths.includes(p.month) ? { background: 'var(--accent-soft)' } : undefined}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedMonths.includes(p.month)}
                                                onChange={() => toggleMonth(p.month)}
                                            />
                                        </td>
                                        <td className="ds-month-cell">
                                            <div className="m">{p.month}</div>
                                            <div className="d">{p.date}</div>
                                        </td>
                                        <td className="ds-amt">{formatCurrency(p.gross_salary)}</td>
                                        <td className="ds-amt negative">{formatCurrency(p.lop_deduction)}</td>
                                        <td className="ds-amt negative">{formatCurrency(p.attendance_penalty)}</td>
                                        {settings.enable_pf && <td className="ds-amt warn">{formatCurrency(p.pf_pt)}</td>}
                                        {settings.enable_tax && <td className="ds-amt warn">{formatCurrency(p.tax)}</td>}
                                        <td className="ds-amt">{formatCurrency(p.net_salary)}</td>
                                        <td>
                                            {p.released ? (
                                                <button
                                                    className="ds-btn"
                                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                                    onClick={() => window.open(`${apiUrl}/employee/payslip/download/${p.month}?employee_id=${userId}`, '_blank')}
                                                >
                                                    View slip
                                                </button>
                                            ) : (
                                                <span className="ds-status-pending">
                                                    <Lock size={13} /> Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default SalaryModule;
