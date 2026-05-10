import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, FileText, Phone, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { API_URL } from '../config';

const LeaveDetailsView = ({ leaveId, userId, onBack }) => {
    const [leave, setLeave] = useState(null);
    const [loading, setLoading] = useState(true);
    const apiUrl = API_URL;

    useEffect(() => {
        fetchLeaveDetails();
    }, [leaveId]);

    const fetchLeaveDetails = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/leaves?employee_id=${userId}`);
            const data = await res.json();
            const leaveDetail = data.leaves.find(l => l.id === leaveId);
            if (leaveDetail) {
                setLeave(leaveDetail);
            }
        } catch (err) {
            console.error("Error fetching leave details:", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        if (status.includes('Approved')) return <CheckCircle2 size={20} color="#22C55E" />;
        if (status.includes('Rejected')) return <XCircle size={20} color="#EF4444" />;
        if (status.includes('Withdrawn')) return <XCircle size={20} color="#6B7280" />;
        return <AlertCircle size={20} color="#F59E0B" />;
    };

    const getStatusColor = (status) => {
        if (status.includes('Approved')) return '#22C55E';
        if (status.includes('Rejected')) return '#EF4444';
        if (status.includes('Withdrawn')) return '#6B7280';
        return '#F59E0B';
    };

    const parseDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDays = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    };

    const getTimeline = () => {
        if (!leave) return [];
        
        const timeline = [
            {
                status: 'Submitted',
                date: leave.applied_on,
                icon: 'check',
                color: '#2563EB'
            }
        ];

        if (leave.status.includes('Approved')) {
            timeline.push({
                status: 'Approved',
                date: leave.applied_on,
                icon: 'check',
                color: '#22C55E'
            });
        } else if (leave.status.includes('Rejected')) {
            timeline.push({
                status: 'Rejected',
                date: leave.applied_on,
                icon: 'x',
                color: '#EF4444'
            });
        } else if (leave.status.includes('Withdrawn')) {
            timeline.push({
                status: 'Withdrawn by Employee',
                date: leave.applied_on,
                icon: 'x',
                color: '#6B7280'
            });
        } else {
            timeline.push({
                status: 'Pending',
                date: leave.applied_on,
                icon: 'clock',
                color: '#F59E0B'
            });
        }

        return timeline;
    };

    if (loading) {
        return (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                Loading leave details...
            </div>
        );
    }

    if (!leave) {
        return (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                Leave details not found
            </div>
        );
    }

    const timeline = getTimeline();
    const daysCount = calculateDays(leave.start_date, leave.end_date);

    return (
        <div style={{ padding: '2rem' }}>
            {/* Back Button */}
            <button 
                onClick={onBack}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    marginBottom: '1.5rem',
                    padding: 0
                }}
            >
                <ArrowLeft size={20} /> Back to My Leaves
            </button>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Leave Applied on {parseDate(leave.applied_on)}</h2>
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Side - Leave Details */}
                <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    {/* Status Badge */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: `${getStatusColor(leave.status)}20`,
                            borderRadius: '20px',
                            border: `1px solid ${getStatusColor(leave.status)}44`
                        }}>
                            {getStatusIcon(leave.status)}
                            <span style={{ color: getStatusColor(leave.status), fontWeight: '600', fontSize: '0.875rem' }}>
                                {leave.status}
                            </span>
                        </div>
                    </div>

                    {/* Leave Dates */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FEF3C7',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>From date</div>
                                <div style={{ fontWeight: '600', fontSize: '1rem' }}>{parseDate(leave.start_date)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{leave.start_session || 'Full Day'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>To date</div>
                                <div style={{ fontWeight: '600', fontSize: '1rem' }}>{parseDate(leave.end_date)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{leave.end_session || 'Full Day'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>No. of days</div>
                                <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--secondary)' }}>{daysCount}</div>
                            </div>
                        </div>
                    </div>

                    {/* Leave Type and Balance */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Balance</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Leave Type</span>
                            <span style={{ fontWeight: '600' }}>{leave.leave_type}</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                    {/* Details Section */}
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem' }}>Details</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Applying to</span>
                        <span style={{ fontWeight: '500' }}>BSR</span>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Reason</span>
                        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {leave.reason}
                        </p>
                    </div>

                    {/* Contact */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Contact</span>
                        <span style={{ fontWeight: '500' }}>7013666788</span>
                    </div>

                    {/* Remarks */}
                    <div style={{ marginTop: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Remarks</span>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No remarks yet
                        </p>
                    </div>
                </div>

                {/* Right Side - Application Timeline */}
                <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Application Timeline</h3>

                    <div>
                        {timeline.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: index < timeline.length - 1 ? '2rem' : 0 }}>
                                {/* Timeline Circle */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: '50px'
                                }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: item.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.7rem'
                                    }}>
                                        {item.icon === 'check' && '✓'}
                                        {item.icon === 'x' && '✕'}
                                        {item.icon === 'clock' && '◉'}
                                    </div>
                                    {index < timeline.length - 1 && (
                                        <div style={{
                                            width: '2px',
                                            height: '50px',
                                            background: 'var(--border-color)',
                                            marginTop: '0.5rem'
                                        }}></div>
                                    )}
                                </div>

                                {/* Timeline Content */}
                                <div style={{ paddingTop: '0.25rem' }}>
                                    <div style={{ fontWeight: '600', color: item.color, fontSize: '0.95rem' }}>
                                        {item.status}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                        {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comment Section */}
                    {leave.status.includes('Pending') && (
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <textarea
                                placeholder="Write comment"
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '0.75rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-light)',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaveDetailsView;
