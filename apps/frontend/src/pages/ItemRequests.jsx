import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const ItemRequests = ({ userId, user }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemRequestData, setItemRequestData] = useState({ subject: '', item_name: '', quantity: 1, reason: '', approver_id: '', cc_ids: [] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approvers, setApprovers] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [requestType, setRequestType] = useState('item'); // 'item' or 'general'
    const [ccSearchTerm, setCcSearchTerm] = useState('');

    const apiUrl = API_URL;

    const fetchMyRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/items/my-requests?employee_id=${userId}`);
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (err) {
            console.error("Error fetching requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMyRequests();
            fetchAllEmployees();
        }
    }, [userId]);

    const fetchAllEmployees = async () => {
        try {
            const res = await fetch(`${apiUrl}/enhanced-docs/employees`);
            const data = await res.json();
            setAllEmployees(data.employees || []);
            if (data.employees && data.employees.length > 0) {
                setItemRequestData(prev => ({ ...prev, approver_id: data.employees[0].employee_id }));
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    const fetchApprovers = async () => {
        try {
            const res = await fetch(`${apiUrl}/employee/approvers`);
            const data = await res.json();
            setApprovers(data.approvers || []);
            if (data.approvers && data.approvers.length > 0) {
                setItemRequestData(prev => ({ ...prev, approver_id: data.approvers[0].employee_id }));
            }
        } catch (err) {
            console.error("Error fetching approvers:", err);
        }
    };

    const handleItemRequestSubmit = async () => {
        if (requestType === 'item' && (!itemRequestData.item_name || !itemRequestData.reason)) {
            alert("Please fill in all fields");
            return;
        }
        if (requestType === 'general' && (!itemRequestData.subject || !itemRequestData.reason)) {
            alert("Please fill in subject and message");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/items/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId,
                    ...itemRequestData,
                    request_type: requestType,
                    cc_ids: itemRequestData.cc_ids.filter(id => id && id !== '')
                })
            });
            if (res.ok) {
                alert(requestType === 'item' ? "Item request submitted successfully!" : "Message sent successfully!");
                setIsItemModalOpen(false);
                setItemRequestData({ subject: '', item_name: '', quantity: 1, reason: '', approver_id: allEmployees[0]?.employee_id || '', cc_ids: [] });
                fetchMyRequests(); // Refresh list
            }
        } catch (err) {
            console.error("Request failed", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="item-requests-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="card-title" style={{ fontSize: '1.75rem', margin: 0 }}>📦 Item Requests</h1>
                <button 
                    className="btn btn-primary" 
                    onClick={() => setIsItemModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    + New Request
                </button>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading your requests...</p>
            ) : (
                <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '1rem' }}>Item Name</th>
                                <th style={{ padding: '1rem' }}>Quantity</th>
                                <th style={{ padding: '1rem' }}>Reason</th>
                                <th style={{ padding: '1rem' }}>Applied On</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        You haven't made any item requests yet.
                                    </td>
                                </tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{req.item_name}</td>
                                        <td style={{ padding: '1rem' }}>{req.quantity}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', maxWidth: '300px' }}>{req.reason}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(req.applied_on).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                padding: '0.25rem 0.6rem', 
                                                borderRadius: '4px', 
                                                fontSize: '0.75rem', 
                                                background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : (req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                                                color: req.status === 'Approved' ? '#10b981' : (req.status === 'Rejected' ? '#ef4444' : '#f59e0b')
                                            }}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Item Request Modal */}
            {isItemModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card glass-panel" style={{ 
                        maxWidth: '450px', 
                        width: '100%', 
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '1px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--primary) transparent'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className="card-title" style={{ margin: 0 }}>
                                {requestType === 'item' ? '📦 New Item Request' : '✉️ General Message'}
                            </h2>
                            <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        {/* Mode Switcher */}
                        <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: '8px', padding: '0.25rem', marginBottom: '1.5rem' }}>
                            <button 
                                onClick={() => setRequestType('item')}
                                style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: requestType === 'item' ? 'var(--primary)' : 'transparent', color: requestType === 'item' ? 'white' : 'var(--text-muted)', transition: 'all 0.3s' }}
                            >
                                Item Request
                            </button>
                            <button 
                                onClick={() => setRequestType('general')}
                                style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: requestType === 'general' ? 'var(--primary)' : 'transparent', color: requestType === 'general' ? 'white' : 'var(--text-muted)', transition: 'all 0.3s' }}
                            >
                                General Message
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    {requestType === 'item' ? 'Request Subject' : 'Message Subject'}
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder={requestType === 'item' ? "e.g. Need new laptop for development" : "e.g. Inquiry about project status"}
                                    value={itemRequestData.subject}
                                    onChange={(e) => setItemRequestData({...itemRequestData, subject: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>

                            {requestType === 'item' && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Item Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Wireless Mouse"
                                            value={itemRequestData.item_name}
                                            onChange={(e) => setItemRequestData({...itemRequestData, item_name: e.target.value})}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Qty</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={itemRequestData.quantity}
                                            onChange={(e) => setItemRequestData({...itemRequestData, quantity: parseInt(e.target.value) || 1})}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    {requestType === 'item' ? 'Send Request To (Admin)' : 'Send To (Recipient)'}
                                </label>
                                <select 
                                    required
                                    value={itemRequestData.approver_id}
                                    onChange={e => setItemRequestData({ ...itemRequestData, approver_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                >
                                    <option value="">Select Employee</option>
                                    {allEmployees.map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_id} style={{ background: '#1a1a1a' }}>
                                            {emp.name} ({emp.employee_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* CC Checklist Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    CC Recipients ({itemRequestData.cc_ids.length} selected)
                                </label>
                                
                                <input 
                                    type="text" 
                                    placeholder="Search employees to CC..." 
                                    value={ccSearchTerm}
                                    onChange={e => setCcSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem' }}
                                />

                                <div style={{ 
                                    height: '120px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '8px', 
                                    padding: '0.4rem',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: 'var(--primary) transparent'
                                }}>
                                    {allEmployees
                                        .filter(e => e.employee_id !== itemRequestData.approver_id && e.employee_id !== userId)
                                        .filter(e => e.name.toLowerCase().includes(ccSearchTerm.toLowerCase()))
                                        .map(emp => (
                                            <label key={emp.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: itemRequestData.cc_ids.includes(emp.employee_id) ? 'rgba(10, 102, 194, 0.2)' : 'transparent' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={itemRequestData.cc_ids.includes(emp.employee_id)}
                                                    onChange={() => {
                                                        const newCcIds = itemRequestData.cc_ids.includes(emp.employee_id)
                                                            ? itemRequestData.cc_ids.filter(id => id !== emp.employee_id)
                                                            : [...itemRequestData.cc_ids, emp.employee_id];
                                                        setItemRequestData({ ...itemRequestData, cc_ids: newCcIds });
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.85rem', color: 'white' }}>{emp.name}</span>
                                            </label>
                                        ))
                                    }
                                    {allEmployees.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>No employees found</p>}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    {requestType === 'item' ? 'Reason for Request' : 'Message Content'}
                                </label>
                                <textarea 
                                    rows="3"
                                    required
                                    placeholder={requestType === 'item' ? "Explain why you need this item..." : "Write your message here..."}
                                    value={itemRequestData.reason}
                                    onChange={(e) => setItemRequestData({...itemRequestData, reason: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', resize: 'none' }}
                                ></textarea>
                            </div>
                            
                            <button 
                                onClick={handleItemRequestSubmit}
                                disabled={isSubmitting}
                                className="btn btn-primary" 
                                style={{ height: '3.5rem', fontWeight: 'bold', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {isSubmitting ? (
                                    <>⌛ Processing...</>
                                ) : (
                                    requestType === 'item' ? <>📤 Submit Item Request</> : <>📧 Send Message</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemRequests;
