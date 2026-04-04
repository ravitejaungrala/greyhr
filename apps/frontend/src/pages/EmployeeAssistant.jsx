import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2, BrainCircuit, Sparkles, Zap, Palmtree, ClipboardList, Package, Timer, Wallet } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const EmployeeAssistant = ({ user }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Welcome back, **${user?.name || 'Employee'}**! I am the Dhanadurga AI Specialist. 

I'm here to handle your work logistics, including:
*   **Leave Applications**: Casual, Sick, or Privilege.
*   **Equipment Requisitions**: Laptops, monitors, and office supplies.
*   **Status Inquiries**: Real-time balance and request tracking.

How can I power your workday today?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const quickActions = [
        { label: "Apply for 1-Day Leave", query: "Apply for a 1-day casual leave starting tomorrow.", icon: Palmtree, color: "#4A90E2" },
        { label: "My Leave Balance", query: "Show me my current leave balance summary.", icon: ClipboardList, color: "#6366f1" },
        { label: "Equipment Request", query: "I need to request a new item (monitor/chair).", icon: Package, color: "#a855f7" },
        { label: "Attendance Summary", query: "Display my attendance summary for this month.", icon: Timer, color: "#f59e0b" },
        { label: "My Salary Info", query: "Show me my recent salary/earnings summary.", icon: Wallet, color: "#ec4899" }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (customQuery = null) => {
        const finalQuery = typeof customQuery === 'string' ? customQuery : input.trim();
        if (!finalQuery || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: finalQuery }]);
        setIsLoading(true);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const response = await axios.post(`${API_BASE_URL}/employee/chat`, {
                employee_id: user.employee_id,
                query: finalQuery
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I encountered a technical issue. Please try again or rephrase your request." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="employee-assistant-container" style={{ 
            height: 'calc(100vh - 120px)', 
            display: 'flex', 
            gap: '1.5rem',
            maxWidth: '1300px',
            margin: '0 auto',
            padding: '1rem',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Sidebar Suggestions */}
            <div className="assistant-sidebar" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                <div className="card shadow-sm" style={{ 
                    padding: '1.5rem', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)'
                }}>
                    <h3 style={{ 
                        fontSize: '0.85rem', 
                        color: '#4A90E2', 
                        fontWeight: 800, 
                        textTransform: 'uppercase', 
                        marginBottom: '1.25rem', 
                        letterSpacing: '0.05em', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.6rem' 
                    }}>
                        <Zap size={16} /> Quick Analysis
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {quickActions.map((action, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(action.query)}
                                className="quick-action-btn"
                                style={{
                                    textAlign: 'left',
                                    padding: '0.85rem',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <Sparkles size={14} style={{ color: action.color }} />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 600 }}>ASSISTANT STATUS</div>
                        <div style={{ 
                            padding: '0.75rem', 
                            background: 'rgba(34, 197, 94, 0.1)', 
                            color: '#166534', 
                            borderRadius: '8px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem' 
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                            AI Specialization Active
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Assistant Body */}
            <div className="employee-assistant-page" style={{ 
                flex: 1,
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {/* Chat Body */}
                <div className="chat-content-wrapper card shadow-md" style={{
                    flex: 1,
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: 0
                }}>
                    <div className="messages-scroll-area" style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: msg.role === 'user' ? '70%' : '100%',
                                display: 'flex',
                                gap: '1.25rem',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: msg.role === 'user' ? '#4A90E2' : 'linear-gradient(135deg, #4A90E2 0%, #a855f7 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    color: 'white'
                                }}>
                                    {msg.role === 'user' ? <User size={22} /> : <BrainCircuit size={24} />}
                                </div>
                                <div style={{
                                    padding: '1.25rem',
                                    borderRadius: msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                                    background: msg.role === 'user' ? '#4A90E2' : '#f8fafc',
                                    color: msg.role === 'user' ? 'white' : '#1e293b',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                                    overflowX: 'auto'
                                }}>
                                    {msg.role === 'user' ? (
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    ) : (
                                        <div className="markdown-content employee-chat">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, #4A90E2 0%, #a855f7 100%)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: 'white' 
                                }}>
                                    <Loader2 size={24} className="animate-spin" />
                                </div>
                                <div style={{ 
                                    padding: '1rem 1.5rem', 
                                    background: '#f8fafc', 
                                    borderRadius: '4px 20px 20px 20px', 
                                    color: '#64748b', 
                                    fontSize: '0.9rem', 
                                    fontStyle: 'italic',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    Analyzing request details...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer / Input Area */}
                    <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Consult the HR Assistant Specialist..."
                                style={{
                                    flex: 1,
                                    padding: '1rem 3.5rem 1rem 1.5rem',
                                    borderRadius: '16px',
                                    border: '2px solid #e2e8f0',
                                    background: 'white',
                                    fontSize: '1rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4A90E2'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button 
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim()}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '12px',
                                    background: '#4A90E2',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    opacity: (isLoading || !input.trim()) ? 0.5 : 1
                                }}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .quick-action-btn:hover {
                    background: white !important;
                    border-color: #4A90E2 !important;
                    color: #4A90E2 !important;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.1);
                }
                .markdown-content.employee-chat table {
                    width: 100%;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    margin: 1.5rem 0;
                    border-collapse: collapse;
                    overflow: hidden;
                }
                .markdown-content.employee-chat th {
                    background: #f1f5f9;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 700;
                    color: #475569;
                    border-bottom: 2px solid #e2e8f0;
                }
                .markdown-content.employee-chat td {
                    padding: 1rem;
                    border-top: 1px solid #e2e8f0;
                    color: #334155;
                }
                .markdown-content.employee-chat tr:hover {
                    background: #f8fafc;
                }
                .markdown-content.employee-chat h3 {
                    font-size: 1.1rem;
                    margin: 1.5rem 0 0.75rem 0;
                    color: #4a90e2;
                    font-weight: 800;
                }
                .markdown-content.employee-chat strong {
                    color: #4a90e2;
                    font-weight: 700;
                }
                .markdown-content.employee-chat ul {
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .markdown-content.employee-chat li {
                    margin-bottom: 0.5rem;
                }
            `}</style>
        </div>
    );
};

export default EmployeeAssistant;
