import React, { useState, useEffect } from 'react';

const EngageModule = () => {
    const [announcement, setAnnouncement] = useState({ title: 'Loading...', content: '' });
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    useEffect(() => {
        fetch(`${apiUrl}/announcement`)
            .then(res => res.json())
            .then(data => setAnnouncement(data))
            .catch(err => console.error("Error fetching announcement:", err));
    }, [apiUrl]);

    return (
        <div className="engage-page">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>💬 Engage Module</h1>
            <div className="grid-2">
                <div className="card glass-panel">
                    <h2 className="card-title">📣 Announcements</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255, 122, 0,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)' }}>{announcement.title}</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.5rem 0', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                                {announcement.content}
                            </p>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Updated Recently</span>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <h2 className="card-title">💡 Employee Suggestions</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Have an idea to improve our workplace? Share it with us anonymously.</p>
                    <textarea
                        className="btn btn-secondary"
                        style={{ width: '100%', minHeight: '100px', textAlign: 'left', marginBottom: '1rem', cursor: 'text' }}
                        placeholder="Type your suggestion here..."
                    />
                    <button className="btn btn-primary" onClick={() => alert("Suggestion submitted!")}>Submit Suggestion</button>
                </div>
            </div>
        </div>
    );
};

export default EngageModule;
