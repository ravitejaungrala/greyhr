import React, { useState, useEffect } from 'react';

const DocumentCenter = ({ user }) => {
    const [payslips, setPayslips] = useState([]);
    const [hasOfferLetter, setHasOfferLetter] = useState(false);
    const [hasRelievingLetter, setHasRelievingLetter] = useState(false);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                // Fetch Payslips
                const psRes = await fetch(`${apiUrl}/employee/payslips?employee_id=${user.employee_id}`);
                if (psRes.ok) {
                    const psData = await psRes.json();
                    setPayslips(Array.isArray(psData) ? psData : []);
                }

                // Check Offer Letter
                const olRes = await fetch(`${apiUrl}/employee/offer-letter/${user.employee_id}`, { method: 'HEAD' });
                if (olRes.ok) {
                    setHasOfferLetter(true);
                }

                // Check Relieving Letter
                const rlRes = await fetch(`${apiUrl}/employee/relieving-letter/${user.employee_id}`, { method: 'HEAD' });
                if (rlRes.ok) {
                    setHasRelievingLetter(true);
                }
            } catch (err) {
                console.error("Error fetching documents:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user?.employee_id) {
            fetchDocs();
        }
    }, [user, apiUrl]);

    const handleDownloadPayslip = (month) => {
        window.open(`${apiUrl}/employee/payslip/download/${month}?employee_id=${user.employee_id}`, '_blank');
    };

    const handleDownloadOfferLetter = () => {
        window.open(`${apiUrl}/employee/offer-letter/${user.employee_id}`, '_blank');
    };

    const handleDownloadRelievingLetter = () => {
        window.open(`${apiUrl}/employee/relieving-letter/${user.employee_id}`, '_blank');
    };

    return (
        <div className="docs-page">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>📂 Document Center</h1>

            <div className="grid-2">
                {/* Official Documents */}
                <div className="card glass-panel" style={{ gridColumn: 'span 2', marginBottom: '2rem' }}>
                    <h2 className="card-title">🏢 Official Employment Documents</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>

                        {/* Offer Letter */}
                        <div className="card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>📄 Offer Letter</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official appointment document</div>
                                </div>
                                {hasOfferLetter ? (
                                    <button className="btn btn-primary" onClick={handleDownloadOfferLetter}>Download</button>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Available</span>
                                )}
                            </div>
                        </div>

                        {/* Relieving Letter */}
                        <div className="card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>📄 Relieving Letter</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official relieving certificate</div>
                                </div>
                                {hasRelievingLetter ? (
                                    <button className="btn btn-primary" onClick={handleDownloadRelievingLetter}>Download</button>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Available</span>
                                )}
                            </div>
                        </div>

                        {/* Recent Payslip */}
                        {payslips.length > 0 && (
                            <div className="card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>💰 Latest Payslip</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payslips[0].month}</div>
                                    </div>
                                    <button className="btn btn-secondary" onClick={() => handleDownloadPayslip(payslips[0].month)}>Download</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payslip History */}
                <div className="card glass-panel">
                    <h2 className="card-title">📅 Payslip History</h2>
                    {loading ? (
                        <p>Loading payslips...</p>
                    ) : payslips.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No payslips released yet.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {payslips.map((ps, idx) => (
                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{ps.month}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Released on {ps.date}</div>
                                    </div>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => handleDownloadPayslip(ps.month)}>
                                        Download PDF
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Company Policies */}
                <div className="card">
                    <h2 className="card-title">🏢 Company Policies</h2>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '6px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
                            <span>Employee Handbook 2026.pdf</span>
                            <button className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Download</button>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <span>Code of Conduct.pdf</span>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>View</button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DocumentCenter;
