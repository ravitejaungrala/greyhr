import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Bot, BrainCircuit, X, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_URL } from '../config';

const ChatbotBubble = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    
    // Get user role from session storage
    const userString = sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    const defaultAgentMsg = user 
        ? (isAdmin 
            ? `Hello! I am your HR Intelligence Specialist. I have identified you as **${user.name}** (ID: ${user.employee_id}). How can I assist you today?`
            : `Hello! I am your AI HR Assistant. I have identified you as **${user.name}** (ID: ${user.employee_id}). How can I help you today?`)
        : "Hello! I am your AI HR Assistant. How can I help you today?";

    const [chat, setChat] = useState([
        { role: 'agent', text: defaultAgentMsg }
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
            const apiUrl = API_URL;
            
            // Route to correct endpoint based on role
            const endpoint = isAdmin ? '/admin/copilot' : '/copilot/ask';
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.text })
            });

            const data = await response.json();
            
            // Backend keys vary: Admin endpoint uses 'answer', Employee endpoint uses 'response'
            const botResponse = data.answer || data.response || "No response received.";
            
            setChat(prev => [...prev, { role: 'agent', text: botResponse }]);
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
                    width: '400px',
                    height: '550px',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: isAdmin ? '1px solid rgba(89, 137, 244, 0.4)' : '1px solid var(--border-color)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        padding: '1.2rem', 
                        background: isAdmin ? 'linear-gradient(135deg, #4A90E2 0%, #9013FE 100%)' : 'var(--main-gradient)', 
                        color: 'white', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '8px', 
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {isAdmin ? <img src="/admin_agent_icon.png" style={{ width: '24px', height: '24px', objectFit: 'contain' }} alt="AI" /> : <Bot size={20} />}
                            </div>
                            <span style={{ fontWeight: '600', letterSpacing: '0.5px' }}>{isAdmin ? 'HR Intelligence Agent' : 'HR AI Assistant'}</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', opacity: 0.8 }}><X size={20} /></button>
                    </div>

                    <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'transparent' }}>
                        {chat.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '90%',
                                padding: '0.85rem 1rem',
                                borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                backgroundColor: msg.role === 'user' ? (isAdmin ? '#4A90E2' : 'var(--primary)') : '#F0F4F8',
                                color: msg.role === 'user' ? 'white' : '#334E68',
                                border: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden'
                            }}>
                                {msg.role === 'user' && (
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.25rem', opacity: 0.9, textAlign: 'right' }}>
                                        {user.name} • {user.employee_id}
                                    </div>
                                )}
                                {msg.role === 'user' ? (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                ) : (
                                    <div className="markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', padding: '0.85rem 1rem', borderRadius: '18px 18px 18px 2px', backgroundColor: '#F0F4F8', fontSize: '0.9rem', color: '#627D98' }}>
                                <span className="loading-dots">{isAdmin ? 'Accessing Intelligence' : 'Thinking'}</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSend} style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E4E7EB', display: 'flex', gap: '0.75rem', background: 'white' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isAdmin ? "Ask about employees, salaries..." : "Ask me anything..."}
                            style={{ 
                                flex: 1, 
                                padding: '0.75rem 1rem', 
                                borderRadius: '12px', 
                                border: '1.5px solid #E4E7EB', 
                                background: '#F8FAFC', 
                                color: '#102A43',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4A90E2'}
                            onBlur={(e) => e.target.style.borderColor = '#E4E7EB'}
                        />
                        <button type="submit" className="btn-primary-agent">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`agent-bubble-btn ${isAdmin ? 'admin-glow' : ''}`}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: isAdmin ? 'linear-gradient(135deg, #4A90E2 0%, #9013FE 100%)' : 'var(--main-gradient)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(74, 144, 226, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {isOpen ? (
                    <X size={32} />
                ) : (
                    isAdmin ? (
                        <img src="/admin_agent_icon.png" style={{ width: '38px', height: '38px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} alt="Admin AI" />
                    ) : (
                        <MessageCircle size={32} />
                    )
                )}
            </button>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(30px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .agent-bubble-btn:hover {
                    transform: scale(1.08) translateY(-4px);
                    box-shadow: 0 12px 30px rgba(74, 144, 226, 0.5);
                }
                .agent-bubble-btn:active {
                    transform: scale(0.95);
                }
                .admin-glow::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
                    animation: rotateGlow 4s linear infinite;
                    pointer-events: none;
                }
                @keyframes rotateGlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .admin-glow {
                    animation: pulseGlow 2s infinite;
                }
                @keyframes pulseGlow {
                    0% { box-shadow: 0 0 0 0 rgba(144, 19, 254, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(144, 19, 254, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(144, 19, 254, 0); }
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
                .btn-primary-agent {
                    background: linear-gradient(135deg, #4A90E2 0%, #446EE8 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    alignItems: center;
                    justifyContent: center;
                    cursor: pointer;
                    transition: transform 0.2s, background 0.2s;
                }
                .btn-primary-agent:hover {
                    transform: scale(1.05);
                    background: linear-gradient(135deg, #446EE8 0%, #4A90E2 100%);
                }
                .markdown-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 0.5rem 0;
                    font-size: 0.8rem;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #E4E7EB;
                }
                .markdown-content th, .markdown-content td {
                    border: 1px solid #E4E7EB;
                    padding: 0.5rem;
                    text-align: left;
                }
                .markdown-content th {
                    background: #F8FAFC;
                    font-weight: 600;
                    color: #475569;
                }
                .markdown-content ul, .markdown-content ol {
                    padding-left: 1.25rem;
                    margin: 0.5rem 0;
                }
                .markdown-content p {
                    margin: 0.5rem 0;
                }
                .markdown-content strong {
                    color: #000000;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
};

export default ChatbotBubble;
