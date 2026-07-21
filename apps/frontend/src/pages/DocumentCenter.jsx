import React, { useState, useEffect } from 'react';
import { 
    FolderOpen, FileText, CheckCircle2, 
    Banknote, History, PenLine, Info, Download, Eye,
    Clock, AlertCircle, ChevronRight, Shield, ExternalLink
} from 'lucide-react';
import { API_URL } from '../config';
import toast from '../lib/toast';

const DocumentCenter = ({ user }) => {
    const [payslips, setPayslips] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signatureName, setSignatureName] = useState('');
    const [signingDate, setSigningDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const [requestLoading, setRequestLoading] = useState({}); // Tracking which doc is being requested
    
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
            toast.error("Please enter your name for signature.");
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
                toast.success("Offer letter signed successfully! Status sent to Admin.");
                setShowSignModal(false);
                fetchDocs();
            } else {
                const data = await res.json();
                toast.error(`Error: ${data.detail || data.error}`);
            }
        } catch (err) {
            console.error("Error signing offer letter:", err);
            toast.error("Failed to submit signature.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestDocument = async (type) => {
        if (requestLoading[type]) return;
        
        setRequestLoading(prev => ({ ...prev, [type]: true }));
        try {
            const res = await fetch(`${apiUrl}/employee/request-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: user.employee_id,
                    doc_type: type,
                    reason: `System Request from ${user.name}`
                })
            });
            if (res.ok) {
                toast.success(`Request for ${type.replace('_', ' ')} sent to HR department.`);
                setRequestLoading(prev => ({ ...prev, [type]: 'sent' }));
            } else {
                toast.error("Failed to send request. Please contact HR directly.");
            }
        } catch (err) {
            console.error("Error requesting document:", err);
        } finally {
            setRequestLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const findDoc = (type) => documents.find(d => d.type === type);

    // Shared styles
    const sectionStyle = {
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        marginBottom: '1.25rem',
    };

    const sectionHeaderStyle = {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: 'var(--text-strong)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        letterSpacing: '-0.01em',
    };

    const docRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.875rem 1rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        background: '#fafafa',
        transition: 'all 0.15s ease',
    };

    const docLabelStyle = {
        fontWeight: '500',
        fontSize: '0.875rem',
        color: 'var(--text-strong)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    };

    const docSubStyle = {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginTop: '2px',
    };

    const pillBtn = (variant = 'primary') => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.4rem 0.85rem',
        borderRadius: '8px',
        fontSize: '0.78rem',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.15s ease',
        ...(variant === 'primary' ? {
            background: 'var(--primary)',
            color: '#fff',
        } : variant === 'outline' ? {
            background: 'transparent',
            color: 'var(--primary)',
            border: '1px solid var(--primary)',
        } : variant === 'muted' ? {
            background: '#f1f5f9',
            color: '#64748b',
            cursor: 'default',
        } : {}),
    });

    const statusBadge = (type) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '20px',
        fontSize: '0.7rem',
        fontWeight: '500',
        ...(type === 'signed' ? {
            background: '#ecfdf5',
            color: '#059669',
        } : type === 'pending' ? {
            background: '#fef3c7',
            color: '#b45309',
        } : type === 'available' ? {
            background: '#eff6ff',
            color: '#2563eb',
        } : {
            background: '#f1f5f9',
            color: '#64748b',
        }),
    });

    const renderDocRow = (icon, title, subtitle, action, statusInfo) => (
        <div style={docRowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '9px',
                    background: 'var(--primary-soft)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div>
                    <div style={docLabelStyle}>{title}</div>
                    <div style={docSubStyle}>{subtitle}</div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusInfo}
                {action}
            </div>
        </div>
    );

    return (
        <div style={{ padding: '0.5rem 0' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{
                    fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-strong)',
                    display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem',
                    letterSpacing: '-0.02em',
                }}>
                    <FolderOpen size={26} color="var(--primary)" /> Document Center
                </h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '2.35rem' }}>
                    Access your employment documents & payslips
                </p>
            </div>

            {/* Employment Documents Section */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <FileText size={18} color="var(--primary)" /> Employment Documents
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                    {/* Offer Letter */}
                    {renderDocRow(
                        <FileText size={18} color="var(--primary)" />,
                        'Offer Letter',
                        user.offer_letter_status === 'signed' ? 'Accepted & signed' : 'Official appointment letter',
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {(findDoc('full_time_offer') || findDoc('internship_offer')) && (
                                <button
                                    style={pillBtn('outline')}
                                    onClick={() => handleDownloadDocument(findDoc('full_time_offer') ? 'full_time_offer' : 'internship_offer')}
                                >
                                    <Eye size={13} /> View
                                </button>
                            )}
                            {user.offer_letter_status === 'final' && (
                                <button style={pillBtn('primary')} onClick={() => setShowSignModal(true)}>
                                    <PenLine size={13} /> Sign
                                </button>
                            )}
                        </div>,
                        user.offer_letter_status === 'signed'
                            ? <span style={statusBadge('signed')}><CheckCircle2 size={12} /> Signed</span>
                            : !findDoc('full_time_offer') && !findDoc('internship_offer') && user.offer_letter_status !== 'final'
                            ? <span style={statusBadge('default')}>Not available</span>
                            : null
                    )}

                    {/* Relieving / Internship Completion */}
                    {(() => {
                        const isIntern = user.employment_type === 'Intern';
                        const docType = isIntern ? 'internship_completion' : 'relieving';
                        const title = isIntern ? 'Internship Letter' : 'Relieving Letter';
                        const hasDoc = findDoc(docType);
                        return renderDocRow(
                            <FileText size={18} color="var(--primary)" />,
                            title,
                            'Official service certificate',
                            hasDoc ? (
                                <button style={pillBtn('primary')} onClick={() => handleDownloadDocument(docType)}>
                                    <Download size={13} /> Download
                                </button>
                            ) : (
                                <button
                                    style={pillBtn(requestLoading[docType] === 'sent' ? 'muted' : 'outline')}
                                    onClick={() => handleRequestDocument(docType)}
                                    disabled={requestLoading[docType] === 'sent'}
                                >
                                    {requestLoading[docType] === 'sent'
                                        ? <><CheckCircle2 size={13} /> Requested</>
                                        : 'Request'}
                                </button>
                            ),
                            hasDoc ? <span style={statusBadge('available')}><CheckCircle2 size={12} /> Ready</span> : null
                        );
                    })()}

                    {/* Experience Certificate */}
                    {renderDocRow(
                        <Shield size={18} color="var(--primary)" />,
                        'Experience Certificate',
                        'Proof of service & performance',
                        findDoc('experience') ? (
                            <button style={pillBtn('primary')} onClick={() => handleDownloadDocument('experience')}>
                                <Download size={13} /> Download
                            </button>
                        ) : (
                            <button
                                style={pillBtn(requestLoading['experience'] === 'sent' ? 'muted' : 'outline')}
                                onClick={() => handleRequestDocument('experience')}
                                disabled={requestLoading['experience'] === 'sent'}
                            >
                                {requestLoading['experience'] === 'sent'
                                    ? <><CheckCircle2 size={13} /> Requested</>
                                    : 'Request'}
                            </button>
                        ),
                        findDoc('experience') ? <span style={statusBadge('available')}><CheckCircle2 size={12} /> Ready</span> : null
                    )}
                </div>
            </div>

            {/* Latest Payslip Card */}
            {payslips.length > 0 && (
                <div style={{
                    ...sectionStyle,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: payslips[0].released ? '#ffffff' : '#fafbfc',
                    opacity: payslips[0].released ? 1 : 0.75,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: payslips[0].released ? 'var(--primary-soft)' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Banknote size={20} color={payslips[0].released ? 'var(--primary)' : '#94a3b8'} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: payslips[0].released ? 'var(--text-strong)' : '#94a3b8' }}>
                                Latest Payslip
                            </div>
                            <div style={{ fontSize: '0.75rem', color: payslips[0].released ? 'var(--text-muted)' : '#94a3b8' }}>
                                {payslips[0].released ? payslips[0].month : 'Not yet released by admin'}
                            </div>
                        </div>
                    </div>
                    {payslips[0].released ? (
                        <button style={pillBtn('primary')} onClick={() => handleDownloadPayslip(payslips[0].month)}>
                            <Download size={13} /> Download PDF
                        </button>
                    ) : (
                        <span style={statusBadge('pending')}><Clock size={12} /> Pending</span>
                    )}
                </div>
            )}

            {/* Payslip History */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <History size={18} color="var(--secondary)" /> Payslip History
                </div>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0' }}>Loading payslips...</p>
                ) : payslips.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '2rem 1rem',
                        color: 'var(--text-muted)', fontSize: '0.85rem',
                    }}>
                        <Banknote size={28} color="#d1d5db" style={{ marginBottom: '0.5rem' }} />
                        <div>No payslips available yet</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {payslips.map((ps, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.7rem 0.85rem', borderRadius: '9px',
                                background: ps.released ? '#fafafa' : '#fafbfc',
                                border: '1px solid var(--border-color)',
                                opacity: ps.released ? 1 : 0.6,
                                transition: 'all 0.15s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Banknote size={16} color={ps.released ? 'var(--primary)' : '#cbd5e1'} />
                                    <div>
                                        <div style={{ fontWeight: '500', fontSize: '0.84rem', color: 'var(--text-strong)' }}>{ps.month}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {ps.released ? `Released ${ps.date}` : 'Not yet released'}
                                        </div>
                                    </div>
                                </div>
                                {ps.released ? (
                                    <button style={pillBtn('outline')} onClick={() => handleDownloadPayslip(ps.month)}>
                                        <Download size={12} /> PDF
                                    </button>
                                ) : (
                                    <span style={statusBadge('pending')}><Clock size={11} /> Pending</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Signature Modal */}
            {showSignModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        width: '90%', maxWidth: '440px', padding: '1.75rem',
                        background: '#ffffff', borderRadius: '16px',
                        boxShadow: 'var(--shadow-xl)',
                    }}>
                        <h2 style={{
                            fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem 0',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-strong)',
                        }}>
                            <PenLine size={20} color="var(--primary)" /> Sign Offer Letter
                        </h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                            Enter your full name as a digital signature to accept the offer.
                        </p>

                        <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '500', marginBottom: '0.35rem', color: 'var(--text-body)' }}>
                                Full Name (Signature)
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                placeholder="Enter your full name"
                                style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '500', marginBottom: '0.35rem', color: 'var(--text-body)' }}>
                                Signing Date
                            </label>
                            <input
                                type="date"
                                className="input-field"
                                value={signingDate}
                                onChange={(e) => setSigningDate(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                            <button style={pillBtn('outline')} onClick={() => setShowSignModal(false)} disabled={submitting}>Cancel</button>
                            <button style={{ ...pillBtn('primary'), padding: '0.5rem 1rem' }} onClick={handleSignOfferLetter} disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Sign & Accept'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentCenter;
