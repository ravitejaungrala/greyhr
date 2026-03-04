import React from 'react';

const DocumentCenter = () => {
    return (
        <div className="docs-page">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>📂 Document Center</h1>
            <div className="grid-2">
                <div className="card glass-panel">
                    <h2 className="card-title">📝 Personal Documents</h2>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <span>Aadhar Card.pdf</span>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>View</button>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <span>PAN Card.pdf</span>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>View</button>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <span>Degree Certificate.jpg</span>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>View</button>
                        </li>
                    </ul>
                </div>
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
