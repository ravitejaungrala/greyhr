import React, { useMemo, useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import {
    Send,
    Zap,
    Users,
    BrainCircuit,
    Sparkles,
    TrendingUp,
    Copy,
    Check,
    Download,
    Trash2,
    Clock3,
    UserRoundSearch,
    Briefcase,
    CalendarRange,
    ShieldCheck,
    CircleDot
} from 'lucide-react';
import { API_URL } from '../config';

const IntelligenceAgent = ({ user }) => {
    const navigate = useNavigate();
    const displayName = user?.name || 'Admin';
    const displayId = user?.employee_id || 'N/A';
    const createMessage = (role, text, extra = {}) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text,
        createdAt: new Date().toISOString(),
        ...extra
    });
    const initialWelcome = `Welcome back, **${displayName}** (ID: ${displayId}). I am the HR Intelligence Specialist.\n\nI can support deeper decision-making with:\n\n- **Salary Intelligence**: outliers, deductions, comparative summaries.\n- **Leave Intelligence**: approval bottlenecks, leave load, absentee risk.\n- **Workforce Intelligence**: joins, exits, role-level distribution, capacity planning.\n- **Risk Intelligence**: anomaly indicators and operational watchpoints.\n\nAsk me anything and I will format it for fast action.`;

    const [query, setQuery] = useState('');
    const [chat, setChat] = useState([createMessage('agent', initialWelcome)]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingEmps, setLoadingEmps] = useState(false);
    const [focusedEmployee, setFocusedEmployee] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const chatEndRef = useRef(null);
    const abortRef = useRef(null);

    const fetchEmployees = async () => {
        setLoadingEmps(true);
        try {
            const res = await fetch(`${API_URL}/auth/admin/employees`);
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
        {
            label: 'Salary Breakdown',
            icon: <Briefcase size={14} />,
            query: 'Generate a salary breakdown with top earners, lowest earners, and deduction outliers in table format.'
        },
        {
            label: 'Leave Overviews',
            icon: <CalendarRange size={14} />,
            query: 'Summarize current on-leave employees, pending leave approvals, and leave hotspots by team.'
        },
        {
            label: 'Recruitment Audit',
            icon: <UserRoundSearch size={14} />,
            query: 'Show pending approvals with role, company, and risk flags for delayed onboarding.'
        },
        {
            label: 'Security Logs',
            icon: <ShieldCheck size={14} />,
            query: 'List unusual admin and employee events from recent records and suggest follow-up checks.'
        },
        {
            label: 'How To Add Employee',
            icon: <Users size={14} />,
            query: 'Where can I add a new employee and what are the exact steps?'
        },
        {
            label: 'How To Add Holiday',
            icon: <CalendarRange size={14} />,
            query: 'How to add a holiday and where is that page?'
        },
        {
            label: 'Leave Balance Page',
            icon: <CalendarRange size={14} />,
            query: 'How can I open the leave balance page and check balances clearly?'
        }
    ];

    const hasAny = (text, parts) => parts.some((part) => text.includes(part));

    const buildGuideResponse = (question) => {
        const q = String(question || '').toLowerCase();
        const wantsNavigation = hasAny(q, ['show page', 'open page', 'open it', 'take me', 'go to', 'navigate']);

        const makeResponse = ({ title, route, navPath, steps, note }) => ({
            text: `### ${title}\n\n**Open this page:** \`${route}\`\n\n**Navigation path:** ${navPath}\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n${note ? `**Note:** ${note}` : ''}`.trim(),
            actions: [
                { label: `Open ${title} Page`, path: route },
                { label: `Ask More About ${title}`, prompt: `Explain ${title.toLowerCase()} with examples and common mistakes.` }
            ],
            autoOpen: wantsNavigation
        });

        if (hasAny(q, ['add employee', 'new employee', 'create employee', 'edit employee', 'update employee', 'employee add'])) {
            return makeResponse({
                title: 'Add Or Edit Employee',
                route: '/admin/dashboard',
                navPath: 'Management Control -> Workforce',
                steps: [
                    'Go to Workforce and open the Directory section.',
                    'Click Add Employee in the top-right area.',
                    'Fill basic fields like name, email, role/designation, and salary.',
                    'Submit to create the employee account.',
                    'For edits, open an existing employee from the directory and update required fields.'
                ],
                note: 'If onboarding approval is required, also review pending profiles in the Workforce onboarding/pending section.'
            });
        }

        if (hasAny(q, ['holiday', 'hoilday', 'calendar holiday', 'add holiday', 'create holiday'])) {
            return makeResponse({
                title: 'Add Holiday',
                route: '/admin/calendar',
                navPath: 'Calendar -> Holiday Calendar',
                steps: [
                    'Open Calendar from the left navigation.',
                    'In Add Holiday, enter Holiday Name and Date.',
                    'Select Type (Public Holiday or Optional Holiday).',
                    'Click Add Holiday to save.',
                    'Confirm it appears in the Holiday Calendar grid on the right.'
                ],
                note: 'You can edit or delete an existing holiday by clicking the holiday badge inside the calendar day.'
            });
        }

        if (hasAny(q, ['leave', 'approve leave', 'leave request'])) {
            return makeResponse({
                title: 'Leave Management',
                route: '/admin/leaves',
                navPath: 'Management Control -> Leave Mgmt',
                steps: [
                    'Open Leave Mgmt from the sidebar.',
                    'Use filters to locate employee/date/type quickly.',
                    'Review request details and employee history.',
                    'Click Approve or Reject with policy-based decision.'
                ],
                note: 'Use the same page to track pending, approved, and rejected requests.'
            });
        }

        if (hasAny(q, ['leave balance', 'balance page', 'my leave balance', 'check leave balance', 'leave balances'])) {
            return {
                text: `### Leave Balance Page\n\n**Employee Page:** \`/employee/leaves/balance\`\n**Admin Monitoring Page:** \`/admin/leaves\`\n\n**How to check leave balance (employee):**\n1. Open the Leave module from the left sidebar.\n2. Click Leave Balances.\n3. Select leave type (Casual, Sick, Earned) to see available/granted/consumed values.\n4. Review the monthly trend chart and transaction table for detailed history.\n\n**How to verify balances as admin:**\n1. Open Leave Mgmt page.\n2. Search employee by name/ID.\n3. Open leave history/details and validate approved/consumed days.\n\n**Tip:** If balance looks negative, check recent availed entries and whether new monthly/annual credits were posted.`,
                actions: [
                    { label: 'Open Employee Leave Balance', path: '/employee/leaves/balance' },
                    { label: 'Open Employee Leave Apply', path: '/employee/leaves/apply' },
                    { label: 'Open Admin Leave Mgmt', path: '/admin/leaves' },
                    { label: 'Ask Balance Troubleshooting', prompt: 'Why is leave balance negative and how to fix it step by step?' }
                ],
                autoOpen: wantsNavigation
            };
        }

        if (hasAny(q, ['salary report', 'finance report', 'salary', 'payroll', 'payslip'])) {
            return makeResponse({
                title: 'Salary And Payroll',
                route: '/admin/finance',
                navPath: 'Analytics -> Finance',
                steps: [
                    'Open Finance for month-wise salary reports.',
                    'Select month and review gross, deductions, and net payable.',
                    'For payslip releases, open Payrolls from Documents.',
                    'Use payroll tools to generate and publish payslips.'
                ],
                note: 'Finance is for analysis; Payrolls is for operational payslip release management.'
            });
        }

        if (hasAny(q, ['announcement', 'bulletin', 'notice'])) {
            return makeResponse({
                title: 'Announcements',
                route: '/admin/announcements',
                navPath: 'Communication -> Bulletin',
                steps: [
                    'Open Bulletin from Communication.',
                    'Enter title and message content.',
                    'Save to publish the announcement.',
                    'Verify announcement appears in admin overview and employee views.'
                ],
                note: 'Keep title short and message action-oriented for best visibility.'
            });
        }

        if (hasAny(q, ['where can i', 'how to', 'where is', 'which page'])) {
            return {
                text: `### Admin Navigation Quick Guide\n\nHere are direct pages you can open:\n\n1. Add/Edit Employee: \`/admin/dashboard\`\n2. Add Holiday: \`/admin/calendar\`\n3. Leave Approvals: \`/admin/leaves\`\n4. Salary Reports: \`/admin/finance\`\n5. Payroll Release: \`/admin/payroll\`\n6. Announcements: \`/admin/announcements\`\n\nAsk in this format for full steps: \"How to add employee\" or \"How to add holiday\".`,
                actions: [
                    { label: 'Open Workforce', path: '/admin/dashboard' },
                    { label: 'Open Holiday Calendar', path: '/admin/calendar' },
                    { label: 'Open Leave Mgmt', path: '/admin/leaves' }
                ],
                autoOpen: false
            };
        }

        return null;
    };

    const filteredEmployees = useMemo(() => employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [employees, searchTerm]);

    const lastUpdated = useMemo(() => {
        if (chat.length === 0) return 'Now';
        const last = chat[chat.length - 1];
        return new Date(last.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [chat]);

    const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const copyMessage = async (messageId, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(messageId);
            setTimeout(() => setCopiedId(null), 1200);
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    };

    const exportConversation = () => {
        const content = chat.map((msg) => {
            const who = msg.role === 'user' ? displayName : 'HR Intelligence';
            return `## ${who} (${formatTime(msg.createdAt)})\n\n${msg.text}`;
        }).join('\n\n---\n\n');

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hr-intelligence-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearConversation = () => {
        setChat([createMessage('agent', initialWelcome)]);
        setFocusedEmployee(null);
    };

    const openAdminPage = (path) => {
        if (!path) return;
        navigate(path);
    };

    const handleSend = async (e, customQuery = null) => {
        if (e) e.preventDefault();
        const finalQuery = customQuery || query;
        if (!finalQuery.trim()) return;

        const contextPrefix = focusedEmployee
            ? `Focus Employee: ${focusedEmployee.name} (${focusedEmployee.employee_id}). Prioritize this employee in your answer.\n\n`
            : '';
        const userMsg = createMessage('user', finalQuery);
        setChat(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        const guideResponse = buildGuideResponse(finalQuery);
        if (guideResponse) {
            setChat(prev => [...prev, createMessage('agent', guideResponse.text, { actions: guideResponse.actions || [] })]);
            if (guideResponse.autoOpen && guideResponse.actions?.[0]?.path) {
                openAdminPage(guideResponse.actions[0].path);
            }
            setLoading(false);
            return;
        }

        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await fetch(`${API_URL}/admin/copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `${contextPrefix}${finalQuery}` }),
                signal: controller.signal
            });

            const data = await response.json();
            setChat(prev => [...prev, createMessage('agent', data.answer || 'No intelligence retrieved.')]);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setChat(prev => [...prev, createMessage('agent', 'Critical connection error. Ensure the backend intelligence engine is running.')]);
            }
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
                <div className="card shadow-sm" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', background: '#ffffff' }}>
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
                                {action.icon || <Sparkles size={14} className="text-primary" />} {action.label}
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
                            <div style={{ fontSize: '0.75rem', color: '#000000', textAlign: 'center', padding: '1rem' }}>Loading directory...</div>
                        ) : filteredEmployees.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#000000', textAlign: 'center', padding: '1rem' }}>No matches found</div>
                        ) : (
                            filteredEmployees.map((emp, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setFocusedEmployee(emp)}
                                    className="employee-select-btn"
                                    style={{
                                        textAlign: 'left',
                                        padding: '0.75rem',
                                        background: focusedEmployee?.employee_id === emp.employee_id ? '#fff7ed' : 'white',
                                        border: focusedEmployee?.employee_id === emp.employee_id ? '1px solid #fdba74' : '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.2rem'
                                    }}
                                >
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000000' }}>{emp.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#000000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CircleDot size={10} /> {emp.employee_id}
                                    </div>
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
                <div className="card shadow-sm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid var(--border-color)', background: '#ffffff' }}>
                    <div style={{ padding: '0.75rem 1.2rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#eef2ff', color: '#4338ca', borderRadius: '999px', padding: '0.25rem 0.55rem' }}>Messages: {chat.length}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f0fdf4', color: '#166534', borderRadius: '999px', padding: '0.25rem 0.55rem' }}>
                                <Clock3 size={12} style={{ marginRight: '0.3rem', verticalAlign: 'text-bottom' }} /> Updated: {lastUpdated}
                            </span>
                            {focusedEmployee && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '0.25rem 0.55rem' }}>
                                    Focus: {focusedEmployee.name}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button onClick={exportConversation} type="button" style={{ border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '10px', padding: '0.45rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                                <Download size={14} /> Export
                            </button>
                            <button onClick={clearConversation} type="button" style={{ border: '1px solid #fee2e2', background: '#fff1f2', borderRadius: '10px', padding: '0.45rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                    </div>

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
                                    {msg.role === 'user' ? displayName.charAt(0) : <BrainCircuit size={24} />}
                                </div>
                                <div style={{ 
                                    padding: '1.25rem', 
                                    background: msg.role === 'user' ? 'var(--primary)' : 'white', 
                                    color: msg.role === 'user' ? 'white' : '#000000',
                                    borderRadius: msg.role === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    border: msg.role === 'agent' ? '1px solid #e2e8f0' : 'none'
                                }}>
                                    {msg.role === 'user' && (
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem', opacity: 0.8, color: '#e0e7ff', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <span>{displayName} • {displayId}</span>
                                            <span>{formatTime(msg.createdAt)}</span>
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                    ) : (
                                        <div className="markdown-content full-page" style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>HR Intelligence • {formatTime(msg.createdAt)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyMessage(msg.id, msg.text)}
                                                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700 }}
                                                >
                                                    {copiedId === msg.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                                                    {copiedId === msg.id ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                            {msg.role === 'agent' && Array.isArray(msg.actions) && msg.actions.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                                                    {msg.actions.map((action, actionIndex) => (
                                                        <button
                                                            key={`${msg.id}-action-${actionIndex}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (action.path) openAdminPage(action.path);
                                                                if (action.prompt) setQuery(action.prompt);
                                                            }}
                                                            style={{
                                                                border: '1px solid #dbe4f0',
                                                                background: '#f8fafc',
                                                                borderRadius: '10px',
                                                                padding: '0.4rem 0.65rem',
                                                                cursor: 'pointer',
                                                                fontSize: '0.74rem',
                                                                fontWeight: 700,
                                                                color: '#334155'
                                                            }}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
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
                                <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '4px 20px 20px 20px', color: '#000000', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    <span className="scanning-glow">Aggregating intelligence, ranking evidence, building recommendation...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        {focusedEmployee && (
                            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.7rem', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                                <div style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 700 }}>
                                    Focused employee: {focusedEmployee.name} ({focusedEmployee.employee_id})
                                </div>
                                <button type="button" onClick={() => setFocusedEmployee(null)} style={{ border: 'none', background: 'transparent', color: '#9a3412', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700 }}>
                                    Clear Focus
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                            <input 
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask for salary, leaves, growth, attrition, risk, or employee-level insights..."
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
                                disabled={loading}
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    opacity: loading ? 0.7 : 1
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
                .employee-select-btn:hover {
                    transform: translateX(3px);
                    border-color: #fb923c !important;
                    background: #fff7ed !important;
                }
                .scanning-glow {
                    background: linear-gradient(90deg, #000000 0%, #4A90E2 50%, #000000 100%);
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
                .markdown-content.full-page p {
                    margin: 0.35rem 0;
                }
                .markdown-content.full-page ul,
                .markdown-content.full-page ol {
                    margin: 0.5rem 0;
                    padding-left: 1.25rem;
                }
                @media (max-width: 1100px) {
                    .intelligence-container {
                        flex-direction: column;
                        height: auto !important;
                    }
                    .intelligence-sidebar {
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default IntelligenceAgent;
