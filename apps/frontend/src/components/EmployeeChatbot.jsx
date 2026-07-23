import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const EmployeeChatbot = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello ${user?.name || 'there'}! I'm your NeuzenAI Assistant. How can I help you today? You can ask me to apply for leaves, request items, or check your status.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const API_BASE_URL = API_URL;
            const response = await axios.post(`${API_BASE_URL}/employee/chat`, {
                employee_id: user.employee_id,
                query: userMessage
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="employee-chatbot-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            {/* Chat Bubble */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={30} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="glass-panel" style={{
                    width: '380px',
                    height: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(15, 23, 42, 0.95)',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bot size={24} />
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Employee Assistant</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online & Active</div>
                            </div>
                        </div>
                        <X 
                            size={20} 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => setIsOpen(false)}
                        />
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                gap: '4px'
                            }}>
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: msg.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                                    background: msg.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.4',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
                                <Loader2 size={16} className="animate-spin" />
                                <span style={{ fontSize: '0.8rem' }}>Assistant is thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <input 
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything..."
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading}
                            style={{
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeChatbot;
