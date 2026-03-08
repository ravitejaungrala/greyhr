import React, { useState, useRef, useEffect } from 'react';

const ChatbotBubble = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState([
        { role: 'agent', text: 'Hello! I am your AI HR Assistant. How can I help you today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [chat, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = { role: 'user', text: query };
        setChat(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/copilot/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.text })
            });
            const data = await response.json();
            setChat(prev => [...prev, { role: 'agent', text: data.response }]);
        } catch (err) {
            setChat(prev => [...prev, { role: 'agent', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {/* Chat Window */}
            {isOpen && (
                <div className="card glass-panel" style={{
                    width: '350px',
                    height: '500px',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <div style={{ padding: '1rem', background: 'var(--main-gradient)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🤖</span>
                            <span style={{ fontWeight: 'bold' }}>HR AI Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                    </div>

                    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--bg-color)' }}>
                        {chat.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                lineHeight: '1.4',
                                backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-color)',
                                color: msg.role === 'user' ? 'white' : 'var(--text-light)',
                                border: msg.role === 'agent' ? '1px solid var(--border-color)' : 'none'
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <span className="loading-dots">Thinking...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask me anything..."
                            style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-light)' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Send</button>
                    </form>
                </div>
            )}

            {/* Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--main-gradient)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.8rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? '↓' : '💬'}
            </button>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .loading-dots:after {
                    content: '...';
                    animation: dots 1.5s steps(5, end) infinite;
                }
                @keyframes dots {
                    0%, 20% { content: ''; }
                    40% { content: '.'; }
                    60% { content: '..'; }
                    80% { content: '...'; }
                }
            `}</style>
        </div>
    );
};

export default ChatbotBubble;
