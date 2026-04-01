import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Zap, Users, BrainCircuit, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

const IntelligenceAgent = ({ user }) => {
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState([
        { role: 'agent', text: `Welcome back, **${user.name}** (ID: ${user.employee_id}). I am the HR Intelligence Specialist. 

I've successfully synchronized all employee records from MongoDB to the vector engine. I am ready to assist you with:

*   **Deep Salary Analysis**: Identify trends and outliers.
*   **Performance Overviews**: Retrieve comprehensive employee summaries.
*   **Workforce Planning**: Analyze leave patterns and availability.

How can I power your decisions today?` }
    ]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingEmps, setLoadingEmps] = useState(false);
    const chatEndRef = useRef(null);

    const fetchEmployees = async () => {
        setLoadingEmps(true);
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/auth/admin/employees`);
            const data = await res.json();
            setEmployees(data.employees || []);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        } finally {
            setLoadingEmps(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat]);

    const quickActions = [
        { label: "Salary Breakdown", query: "Show me a detailed salary table for all approved employees." },
        { label: "Leave Overviews", query: "Who is currently on leave, and what are the upcoming leave requests?" },
        { label: "Recruitment Audit", query: "Show me all employees pending approval and their roles." },
        { label: "Security Logs", query: "Summarize recent admin activities and employee updates." }
    ];

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSend = async (e, customQuery = null) => {
        if (e) e.preventDefault();
        const finalQuery = customQuery || query;
        if (!finalQuery.trim()) return;

        const userMsg = { role: 'user', text: finalQuery };
        setChat(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/admin/copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: finalQuery })
            });

            const data = await response.json();
            setChat(prev => [...prev, { role: 'agent', text: data.answer || "No intelligence retrieved." }]);
        } catch (err) {
            setChat(prev => [...prev, { role: 'agent', text: "Critical connection error. Ensure the backend intelligence engine is running." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="intelligence-container" style={{ 
            height: 'calc(100vh - 120px)', 
            display: 'flex', 
            gap: '1.5rem',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Sidebar Suggestions */}
            <div className="intelligence-sidebar" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(74, 144, 226, 0.2)' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={16} /> Quick Analysis
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {quickActions.map((action, i) => (
                            <button 
                                key={i} 
                                onClick={(e) => handleSend(e, action.query)}
                                className="quick-action-btn"
                                style={{
                                    textAlign: 'left',
                                    padding: '0.85rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Sparkles size={14} className="text-primary" /> {action.label}
                            </button>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', marginTop: '2rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} /> Identify Employees
                    </h3>
                    
                    <div style={{ marginBottom: '1rem' }}>
                        <input 
                            type="text"
                            placeholder="Find name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.75rem',
                                borderRadius: '10px',
                                border: '1.5px solid #E2E8F0',
                                fontSize: '0.75rem',
                                outline: 'none',
                                background: '#F8FAFC'
                            }}
                        />
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.5rem', 
                        maxHeight: '300px', 
                        overflowY: 'auto',
                        paddingRight: '0.5rem',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'thin'
                    }}>
                        {loadingEmps ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>Loading directory...</div>
                        ) : filteredEmployees.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>No matches found</div>
                        ) : (
                            filteredEmployees.map((emp, i) => (
                                <button 
                                    key={i} 
                                    onClick={(e) => handleSend(e, `Provide a full intelligence overview for ${emp.name} (ID: ${emp.employee_id})`)}
                                    className="employee-select-btn"
                                    style={{
                                        textAlign: 'left',
                                        padding: '0.75rem',
                                        background: 'white',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.2rem'
                                    }}
                                >
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{emp.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>{emp.employee_id}</div>
                                </button>
                            ))
                        )}
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            SYSTEM STATUS: <strong>HEALTHY</strong>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#166534', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                            Vector Engine Online
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="intelligence-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid rgba(74, 144, 226, 0.2)' }}>
                    <div className="chat-messages" style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {chat.map((msg, i) => (
                            <div key={i} style={{ 
                                display: 'flex', 
                                gap: '1.25rem', 
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: msg.role === 'user' ? '70%' : '100%',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                            }}>
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '12px', 
                                    flexShrink: 0,
                                    background: msg.role === 'user' ? 'var(--primary)' : 'linear-gradient(135deg, #4A90E2 0%, #9013FE 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.role === 'user' ? user.name.charAt(0) : <BrainCircuit size={24} />}
                                </div>
                                <div style={{ 
                                    padding: '1.25rem', 
                                    background: msg.role === 'user' ? 'var(--primary)' : 'white', 
                                    color: msg.role === 'user' ? 'white' : '#1e293b',
                                    borderRadius: msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    border: msg.role === 'agent' ? '1px solid #e2e8f0' : 'none'
                                }}>
                                    {msg.role === 'user' && (
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem', opacity: 0.8, color: '#e0e7ff' }}>
                                            {user.name} • {user.employee_id}
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                    ) : (
                                        <div className="markdown-content full-page">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', gap: '1.25rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4A90E2 0%, #9013FE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <TrendingUp size={24} className="animate-pulse" />
                                </div>
                                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '4px 20px 20px 20px', color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    <span className="scanning-glow">Aggregating Intelligence...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                            <input 
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Consult the HR Intelligence Agent..."
                                style={{
                                    flex: 1,
                                    padding: '1rem 3.5rem 1rem 1.5rem',
                                    borderRadius: '16px',
                                    border: '2px solid #e2e8f0',
                                    background: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4A90E2'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button 
                                type="submit" 
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '12px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={20} />
                            </button>
                        </form>
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
                    border-color: var(--primary) !important;
                    color: var(--primary) !important;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.1);
                }
                .scanning-glow {
                    background: linear-gradient(90deg, #64748b 0%, #4A90E2 50%, #64748b 100%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shine 2s linear infinite;
                }
                @keyframes shine {
                    to { background-position: 200% center; }
                }
                .markdown-content.full-page table {
                    width: 100%;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    margin: 1.5rem 0;
                }
                .markdown-content.full-page th {
                    background: #f1f5f9;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 700;
                    color: #475569;
                }
                .markdown-content.full-page td {
                    padding: 1rem;
                    border-top: 1px solid #e2e8f0;
                }
                .markdown-content.full-page tr:hover {
                    background: #f8fafc;
                }
            `}</style>
        </div>
    );
};

export default IntelligenceAgent;
