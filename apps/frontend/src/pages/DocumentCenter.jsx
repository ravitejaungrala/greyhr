import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const DocumentCenter = ({ user }) => {
    const [payslips, setPayslips] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [signingDate, setSigningDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    
    const apiUrl = API_URL;

    const fetchDocs = async () => {
        try {
            setLoading(true);
            // Fetch Payslips
            const psRes = await fetch(`${apiUrl}/employee/payslips?employee_id=${user.employee_id}`);
            if (psRes.ok) {
                const psData = await psRes.json();
                setPayslips(Array.isArray(psData.payslips) ? psData.payslips : []);
            }

            // Fetch All Generated Documents (Enhanced Doc System)
            const docsRes = await fetch(`${apiUrl}/enhanced-docs/employee/${user.employee_id}/documents`);
            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocuments(docsData.documents || []);
            }
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.employee_id) {
            fetchDocs();
        }
    }, [user, apiUrl]);

    const handleDownloadPayslip = (month) => {
        window.open(`${apiUrl}/employee/payslip/download/${month}?employee_id=${user.employee_id}`, '_blank');
    };

    const handleDownloadDocument = (type) => {
        window.open(`${apiUrl}/enhanced-docs/download/${user.employee_id}/${type}`, '_blank');
    };

    const handleSignOfferLetter = async () => {
        if (!signatureName.trim()) {
            alert("Please enter your name for signature.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/employee/submit-offer-signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: user.employee_id,
                    signature_name: signatureName,
                    signing_date: signingDate
                })
            });
            if (res.ok) {
                alert("Offer letter signed successfully! Status sent to Admin.");
                setShowSignModal(false);
                fetchDocs();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || data.error}`);
            }
        } catch (err) {
            console.error("Error signing offer letter:", err);
            alert("Failed to submit signature.");
        } finally {
            setSubmitting(false);
        }
    };

    const findDoc = (type) => documents.find(d => d.type === type);

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
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {user.offer_letter_status === 'signed' ? '✅ Signed' : 'Official appointment document'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {(findDoc('full_time_offer') || findDoc('internship_offer')) && (
                                        <button className="btn btn-secondary" onClick={() => handleDownloadDocument(findDoc('full_time_offer') ? 'full_time_offer' : 'internship_offer')}>View</button>
                                    )}
                                    {user.offer_letter_status === 'final' && (
                                        <button className="btn btn-primary" onClick={() => setShowSignModal(true)}>Sign Now</button>
                                    )}
                                    {!findDoc('full_time_offer') && !findDoc('internship_offer') && user.offer_letter_status !== 'final' && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Available</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Relieving / Internship Completion */}
                        <div className="card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>📄 {user.employment_type === 'Intern' ? 'Internship Completion' : 'Relieving Letter'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official service certificate</div>
                                </div>
                                {findDoc(user.employment_type === 'Intern' ? 'internship_completion' : 'relieving') ? (
                                    <button className="btn btn-primary" onClick={() => handleDownloadDocument(user.employment_type === 'Intern' ? 'internship_completion' : 'relieving')}>Download</button>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not Available</span>
                                )}
                            </div>
                        </div>

                        {/* Experience Certificate */}
                        <div className="card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>📄 Experience Certificate</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proof of service & performance</div>
                                </div>
                                {findDoc('experience') ? (
                                    <button className="btn btn-primary" onClick={() => handleDownloadDocument('experience')}>Download</button>
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
                        <p style={{ color: 'var(--text-muted)' }}>No payslips released yet or not available during internship.</p>
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

            {/* Signature Modal */}
            {showSignModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 className="card-title">✍️ Sign Offer Letter</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Please provide your full name as a digital signature and the date to accept the offer.
                        </p>
                        
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Full Name (Signature)</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                placeholder="Enter your full name"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Signing Date</label>
                            <input 
                                type="date" 
                                className="input-field" 
                                value={signingDate}
                                onChange={(e) => setSigningDate(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowSignModal(false)} disabled={submitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSignOfferLetter} disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Sign & Accept Offer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentCenter;
