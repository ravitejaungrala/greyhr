import React, { useState } from 'react';

const AICopilot = () => {
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState([
        { role: 'agent', text: 'Hello! I am your AI HR Copilot. Ask me about workforce analytics, policies, or employee risk.' }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Add user query to chat
        const newChat = [...chat, { role: 'user', text: query }];
        setChat(newChat);
        setQuery('');
        setLoading(true);

        try {
            // Connect to FastAPI Backend via env variable
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/copilot/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: newChat[newChat.length - 1].text })
            });
            const data = await response.json();

            setChat([...newChat, { role: 'agent', text: data.response }]);
        } catch (err) {
            // Fallback for when backend is offline
            setChat([...newChat, { role: 'agent', text: "I'm having trouble connecting to my central brain right now. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="copilot-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
                🧠 AI HR Copilot
            </h1>

            <div className="card glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

                {/* Chat History */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {chat.map((msg, index) => (
                        <div key={index} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            display: 'flex',
                            gap: '0.75rem'
                        }}>
                            {msg.role === 'agent' && (
                                <div className="avatar" style={{ width: 32, height: 32, flexShrink: 0 }}>🤖</div>
                            )}

                            <div style={{
                                backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-color)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: msg.role === 'agent' ? '1px solid var(--border-color)' : 'none',
                                color: 'white'
                            }}>
                                <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.75rem' }}>
                            <div className="avatar" style={{ width: 32, height: 32 }}>🤖</div>
                            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="E.g., Show employees with low productivity..."
                            style={{
                                flex: 1,
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-color)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }}>
                            Ask AI
                        </button>
                    </form>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try asking:</span>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => setQuery('Show employees with low productivity')}>Low Productivity</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => setQuery('What is the resignation risk across engineering?')}>Risk Prediction</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICopilot;
