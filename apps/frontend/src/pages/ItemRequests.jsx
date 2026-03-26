import React, { useState, useEffect } from 'react';

const ItemRequests = ({ userId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemRequestData, setItemRequestData] = useState({ item_name: '', quantity: 1, reason: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
        }
    }, [userId]);

    const handleItemRequestSubmit = async () => {
        if (!itemRequestData.item_name || !itemRequestData.reason) {
            alert("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/items/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: userId,
                    ...itemRequestData
                })
            });
            if (res.ok) {
                alert("Item request submitted successfully!");
                setIsItemModalOpen(false);
                setItemRequestData({ item_name: '', quantity: 1, reason: '' });
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
                    <div className="card glass-panel" style={{ maxWidth: '450px', width: '100%', border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="card-title" style={{ margin: 0 }}>📦 New Item Request</h2>
                            <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Item Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Wireless Mouse, Laptop Stand..."
                                    value={itemRequestData.item_name}
                                    onChange={(e) => setItemRequestData({...itemRequestData, item_name: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Quantity</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={itemRequestData.quantity}
                                    onChange={(e) => setItemRequestData({...itemRequestData, quantity: parseInt(e.target.value) || 1})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reason for Request</label>
                                <textarea 
                                    rows="3"
                                    placeholder="Please provide a brief reason for this request..."
                                    value={itemRequestData.reason}
                                    onChange={(e) => setItemRequestData({...itemRequestData, reason: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', resize: 'none' }}
                                ></textarea>
                            </div>
                            
                            <button 
                                onClick={handleItemRequestSubmit}
                                disabled={isSubmitting}
                                className="btn btn-primary" 
                                style={{ height: '3rem', fontWeight: 'bold', marginTop: '0.5rem' }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemRequests;
