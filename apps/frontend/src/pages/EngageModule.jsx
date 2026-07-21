import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Megaphone, Lightbulb, Send, Award, Heart, Search, History, User, ChevronDown, Check, Sparkles } from 'lucide-react';
import { API_URL } from '../config';

const categories = [
    { key: 'achiever', icon: '⭐', title: 'Achiever', ribbonA: '#3A86FF', ribbonB: '#E63946', discA: '#FFCE54', discB: '#E8A317' },
    { key: 'star', icon: '⭐', title: 'Star Performer', ribbonA: '#8338EC', ribbonB: '#FFB703', discA: '#C77DFF', discB: '#8338EC' },
    { key: 'team', icon: '🤝', title: 'Team Player', ribbonA: '#2A9D8F', ribbonB: '#264653', discA: '#57C4B7', discB: '#2A9D8F' },
    { key: 'innovator', icon: '💡', title: 'Innovator', ribbonA: '#003566', ribbonB: '#FFD60A', discA: '#FFE066', discB: '#F4A300' },
    { key: 'leader', icon: '👑', title: 'Leadership', ribbonA: '#1B2A4A', ribbonB: '#6A4C93', discA: '#8D7BC9', discB: '#4B3E8C' },
    { key: 'rising', icon: '🌟', title: 'Rising Star', ribbonA: '#4ECDC4', ribbonB: '#FF6B6B', discA: '#FF9EAA', discB: '#FF6B6B' },
    { key: 'consistent', icon: '🔥', title: 'Consistency', ribbonA: '#F94144', ribbonB: '#F3722C', discA: '#FFA45C', discB: '#F3722C' },
    { key: 'customer', icon: '🎯', title: 'Customer Champ', ribbonA: '#277DA1', ribbonB: '#43AA8B', discA: '#6FC3D9', discB: '#277DA1' },
    { key: 'newcomer', icon: '🌱', title: 'Newcomer', ribbonA: '#90BE6D', ribbonB: '#43AA8B', discA: '#B5E48C', discB: '#5AA469' },
    { key: 'mentor', icon: '📘', title: 'Mentor', ribbonA: '#577590', ribbonB: '#277DA1', discA: '#8FA6C9', discB: '#3E5C82' }
];

const PraiseBadge = ({ category, size = 36 }) => {
    if (!category) return null;
    const gradientId = `grad-${category.key}-${size}`;
    return (
        <svg width={size} height={Math.round(size * 1.3)} viewBox="0 0 120 156" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={category.discA} />
                    <stop offset="100%" stopColor={category.discB} />
                </linearGradient>
            </defs>
            <polygon points="46,86 30,152 60,132" fill={category.ribbonA} />
            <polygon points="74,86 90,152 60,132" fill={category.ribbonB} />
            <circle cx="60" cy="58" r="50" fill="#FFFFFF" />
            <circle cx="60" cy="58" r="42" fill={`url(#${gradientId})`} />
            <text x="60" y="71" fontSize="36" textAnchor="middle" dominantBaseline="central">
                {category.icon}
            </text>
        </svg>
    );
};

const getRelativeTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const defaultEmployees = [
    { id: 'raviteja', name: 'Raviteja Ungarala', title: 'Software Engineer', initials: 'RU' },
    { id: 'subbarami', name: 'Subbarami Badireddy', title: 'Product Manager', initials: 'SB' },
    { id: 'salman', name: 'Salman Shaik', title: 'QA Engineer', initials: 'SS' },
    { id: 'priya', name: 'Priya Sharma', title: 'UX Designer', initials: 'PS' },
    { id: 'rohit', name: 'Rohit Verma', title: 'Team Lead', initials: 'RV' },
    { id: 'ananya', name: 'Ananya Reddy', title: 'Data Analyst', initials: 'AR' },
    { id: 'kiran', name: 'Kiran Kumar', title: 'DevOps Engineer', initials: 'KK' }
];

const EngageModule = ({ user: propUser }) => {
    const [user] = useState(propUser || (() => {
        const savedUser = sessionStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    }));

    const [activeTab, setActiveTab] = useState('announcements');
    const [announcement, setAnnouncement] = useState({ title: 'Loading...', content: '' });
    const [suggestionText, setSuggestionText] = useState('');
    const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

    // Praise states
    const [employees, setEmployees] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedCatKey, setSelectedCatKey] = useState('achiever');
    const [praiseMessage, setPraiseMessage] = useState('');
    const [sendingPraise, setSendingPraise] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [receivedList, setReceivedList] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [recommendations, setRecommendations] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '' });

    const pickerRef = useRef(null);
    const apiUrl = API_URL;

    // Toast triggers
    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    // Load Announcements
    useEffect(() => {
        fetch(`${apiUrl}/announcement`)
            .then(res => res.json())
            .then(data => setAnnouncement(data))
            .catch(err => console.error("Error fetching announcement:", err));
    }, [apiUrl]);

    // Load Employees list & Praise History
    useEffect(() => {
        if (!user) return;

        // Fetch Employees
        fetch(`${apiUrl}/praise/employees`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setEmployees(data);
                } else {
                    setEmployees(defaultEmployees);
                }
            })
            .catch(err => {
                console.error("Error fetching employees:", err);
                setEmployees(defaultEmployees);
            });

        // Fetch Praise History
        fetch(`${apiUrl}/praise/history?employee_id=${user.employee_id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.history) {
                    setHistoryList(data.history);
                }
            })
            .catch(err => console.error("Error fetching history:", err));

        // Fetch Received Praise
        fetch(`${apiUrl}/praise/received?employee_id=${user.employee_id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.received) {
                    setReceivedList(data.received);
                }
            })
            .catch(err => console.error("Error fetching received praise:", err));
    }, [apiUrl, user, activeTab]);

    // Generate recommendations dynamically from actual employee list
    useEffect(() => {
        if (employees.length > 0 && user) {
            const otherEmployees = employees.filter(e => e.id !== user.employee_id);
            if (otherEmployees.length > 0) {
                const shuffled = [...otherEmployees].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, Math.min(3, shuffled.length));
                const reasons = [
                    "Thank them for their incredible collaboration and support last week.",
                    "Wrapped up the critical dashboard improvements ahead of schedule.",
                    "Quickly debugged and resolved the production database issue.",
                    "Helped pairing and mentoring on the team deployment pipelines.",
                    "Delivered key project goals with consistency and great performance."
                ];
                const recs = selected.map((emp, idx) => ({
                    employee: emp,
                    reason: reasons[idx % reasons.length]
                }));
                setRecommendations(recs);
            }
        }
    }, [employees, user]);

    // Click outside handler for picker
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Handle suggestion submit
    const handleSuggestionSubmit = () => {
        if (!suggestionText.trim()) return;
        setSubmittingSuggestion(true);
        setTimeout(() => {
            showToast("Suggestion submitted anonymously!");
            setSuggestionText('');
            setSubmittingSuggestion(false);
        }, 800);
    };

    // Handle Send Praise
    const handleSendPraise = () => {
        if (!selectedEmployee || !user) return;
        setSendingPraise(true);

        const payload = {
            sender_id: user.employee_id,
            receiver_id: selectedEmployee.id,
            badge_key: selectedCatKey,
            message: praiseMessage.trim() || `Appreciated your hard work as a ${categories.find(c => c.key === selectedCatKey)?.title}!`
        };

        fetch(`${apiUrl}/praise/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast(`Praise sent to ${selectedEmployee.name}!`);
                    setPraiseMessage('');
                    setSelectedEmployee(null);
                    setPickerSearch('');
                    // Refresh history
                    fetch(`${apiUrl}/praise/history?employee_id=${user.employee_id}`)
                        .then(res => res.json())
                        .then(d => {
                            if (d && d.history) setHistoryList(d.history);
                        });
                } else {
                    showToast(`Failed: ${data.message || 'Error occurred'}`);
                }
            })
            .catch(err => {
                console.error("Error sending praise:", err);
                showToast("Server error sending praise.");
            })
            .finally(() => {
                setSendingPraise(false);
            });
    };

    // Reco shortcut helper
    const handleStartRecommendation = (emp) => {
        setSelectedEmployee(emp);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!user) {
        return (
            <div className="card shadow-sm" style={{ padding: '2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '500px' }}>
                <Info size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h2 className="card-title">Session Expired</h2>
                <p style={{ color: 'var(--text-muted)' }}>Please log in to access the community features.</p>
            </div>
        );
    }

    // Stats calculations
    const totalPraiseCount = receivedList.length;
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = receivedList.filter(r => r.timestamp && r.timestamp.startsWith(currentMonthPrefix)).length;
    const uniqueSendersCount = new Set(receivedList.map(r => r.sender_id)).size;

    const counts = {};
    receivedList.forEach(r => {
        counts[r.badge_key] = (counts[r.badge_key] || 0) + 1;
    });
    const topBadgeKey = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const topCategory = categories.find(c => c.key === topBadgeKey) || categories[0];

    // Filter received list
    const filteredReceived = activeFilter === 'all'
        ? receivedList
        : receivedList.filter(r => r.badge_key === activeFilter);

    // Get selected category info for Send tab
    const currentCategory = categories.find(c => c.key === selectedCatKey);

    // Filter employees in picker list
    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        emp.title.toLowerCase().includes(pickerSearch.toLowerCase())
    );

    return (
        <div className="engage-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="card-title" style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MessageSquare size={36} color="var(--primary)" /> Engage & Connect
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                        Stay informed, share suggestions anonymously, or send positive recognition to your colleagues.
                    </p>
                </div>
                
                {/* Tabs bar */}
                <div style={{ display: 'flex', background: '#fff', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xs)' }}>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        style={{
                            padding: '0.6rem 1.2rem',
                            border: 'none',
                            background: activeTab === 'announcements' ? 'var(--main-gradient)' : 'none',
                            color: activeTab === 'announcements' ? '#fff' : 'var(--text-strong)',
                            fontWeight: '700',
                            borderRadius: '9px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Megaphone size={16} /> Bulletins
                    </button>
                    <button
                        onClick={() => setActiveTab('send-praise')}
                        style={{
                            padding: '0.6rem 1.2rem',
                            border: 'none',
                            background: activeTab === 'send-praise' ? 'var(--main-gradient)' : 'none',
                            color: activeTab === 'send-praise' ? '#fff' : 'var(--text-strong)',
                            fontWeight: '700',
                            borderRadius: '9px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Heart size={16} /> Send Praise
                    </button>
                    <button
                        onClick={() => setActiveTab('my-praise')}
                        style={{
                            padding: '0.6rem 1.2rem',
                            border: 'none',
                            background: activeTab === 'my-praise' ? 'var(--main-gradient)' : 'none',
                            color: activeTab === 'my-praise' ? '#fff' : 'var(--text-strong)',
                            fontWeight: '700',
                            borderRadius: '9px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Award size={16} /> My Praise
                    </button>
                </div>
            </div>

            {/* TAB 1: ANNOUNCEMENTS & SUGGESTIONS */}
            {activeTab === 'announcements' && (
                <div className="grid-2 animate-fade-in">
                    {/* Announcements Card */}
                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <Megaphone size={24} color="var(--primary)" /> Active Announcements
                        </h2>
                        <div style={{ padding: '1.25rem', background: '#fffaf5', borderRadius: '12px', borderLeft: '5px solid var(--primary)', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', flex: 1, marginTop: '1rem' }}>
                            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--primary-deep)', marginBottom: '0.5rem' }}>
                                {announcement.title}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', margin: '0.5rem 0', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                                {announcement.content}
                            </p>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Sparkles size={12} color="var(--primary)" /> Updated recently
                            </div>
                        </div>
                    </div>

                    {/* Suggestions Card */}
                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <Lightbulb size={24} color="var(--secondary)" /> Anonymous Suggestions
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '1rem 0 1.25rem', lineHeight: '1.5' }}>
                            Have an idea to improve workplace culture, office layout, or sprint structures? Submit it anonymously to help build a better environment.
                        </p>
                        
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.5rem' }}>YOUR FEEDBACK</label>
                            <textarea
                                value={suggestionText}
                                onChange={(e) => setSuggestionText(e.target.value)}
                                style={{ width: '100%', minHeight: '140px', resize: 'vertical' }}
                                placeholder="Write down your suggestion in detail here..."
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleSuggestionSubmit}
                            disabled={submittingSuggestion || !suggestionText.trim()}
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            {submittingSuggestion ? "Submitting..." : "Submit Suggestion"}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: SEND PRAISE */}
            {activeTab === 'send-praise' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.75rem', alignItems: 'start' }}>
                    {/* Compose Card */}
                    <div className="card shadow-sm" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h2 className="card-title" style={{ margin: 0 }}>Give Recognition</h2>
                                <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem', margin: 0 }}>Choose a team member, write an appreciation, and select a badge.</p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendPraise}
                                disabled={sendingPraise || !selectedEmployee}
                                style={{ padding: '0.7rem 1.4rem' }}
                            >
                                <Send size={15} /> {sendingPraise ? "Sending..." : "Send praise"}
                            </button>
                        </div>

                        {/* Colleague and Message Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* Employee Picker */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Colleague</label>
                                <div ref={pickerRef} style={{ position: 'relative' }}>
                                    <div
                                        onClick={() => setPickerOpen(!pickerOpen)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: '1.5px solid var(--border-color)',
                                            borderRadius: '10px',
                                            padding: '0.75rem 0.9rem',
                                            cursor: 'pointer',
                                            background: '#ffffff',
                                            boxShadow: 'var(--shadow-xs)',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        {selectedEmployee ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-orange-100)', color: 'var(--primary-deep)', fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selectedEmployee.initials}
                                                </div>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{selectedEmployee.name}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>Select a colleague...</span>
                                        )}
                                        <ChevronDown size={16} style={{ color: 'var(--text-soft)', transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                    </div>

                                    {/* Picker dropdown */}
                                    {pickerOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '6px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '12px',
                                            backgroundColor: '#ffffff',
                                            boxShadow: 'var(--shadow-lg)',
                                            maxHeight: '260px',
                                            overflowY: 'auto',
                                            zIndex: 100
                                        }}>
                                            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: '#fff' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>
                                                    <Search size={14} style={{ color: 'var(--text-soft)' }} />
                                                    <input
                                                        type="text"
                                                        value={pickerSearch}
                                                        onChange={(e) => setPickerSearch(e.target.value)}
                                                        placeholder="Search people..."
                                                        style={{ border: 'none !important', outline: 'none', padding: 0, fontSize: '0.85rem', boxShadow: 'none', width: '100%', minHeight: 'auto', borderStyle: 'none' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ padding: '0.25rem' }}>
                                                {filteredEmployees.length === 0 ? (
                                                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-soft)' }}>No colleagues found</div>
                                                ) : (
                                                    filteredEmployees.map(emp => (
                                                        <div
                                                            key={emp.id}
                                                            onClick={() => {
                                                                setSelectedEmployee(emp);
                                                                setPickerOpen(false);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                padding: '0.6rem 0.75rem',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            className="nav-item-row"
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-orange-50)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-orange-100)', color: 'var(--primary-deep)', fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {emp.initials}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-strong)' }}>{emp.name}</span>
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>{emp.title}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Message Block */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Personal Note</label>
                                <textarea
                                    value={praiseMessage}
                                    onChange={(e) => setPraiseMessage(e.target.value)}
                                    placeholder="Write a brief thank-you message detailing what they achieved..."
                                    style={{ width: '100%', resize: 'none', height: '48px', minHeight: '48px', padding: '0.65rem 0.9rem' }}
                                />
                            </div>
                        </div>

                        {/* Badges block */}
                        <div>
                            <label style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-soft)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Select Praise Badge</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.75rem' }}>
                                {categories.map(c => {
                                    const isActive = selectedCatKey === c.key;
                                    return (
                                        <div
                                            key={c.key}
                                            onClick={() => setSelectedCatKey(c.key)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                padding: '0.65rem 0.35rem',
                                                borderRadius: '12px',
                                                border: isActive ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
                                                backgroundColor: isActive ? 'var(--accent-orange-50)' : '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) e.currentTarget.style.borderColor = 'var(--text-soft)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.borderColor = 'var(--border-color)';
                                            }}
                                        >
                                            <PraiseBadge category={c} size={34} />
                                            <span style={{ fontSize: '0.62rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'var(--primary-deep)' : 'var(--text-soft)', textAlign: 'center', lineHeight: '1.2' }}>{c.title}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Live Preview Card */}
                        <div className="card shadow-sm" style={{ padding: '1.5rem', background: '#fff' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 0.25rem' }}>Card Preview</h3>
                            <p style={{ color: 'var(--text-soft)', fontSize: '0.75rem', margin: '0 0 1rem' }}>What they will see in their feed</p>
                            
                            <div style={{ border: '1.5px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                                <div style={{
                                    padding: '1.75rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${currentCategory.ribbonA}22 0%, ${currentCategory.ribbonB}22 100%)`,
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.1))' }}>
                                        <PraiseBadge category={currentCategory} size={64} />
                                    </div>
                                </div>
                                <div style={{ padding: '1.25rem 1rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{currentCategory.title}</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', margin: '0.25rem 0 0.5rem', color: 'var(--text-strong)' }}>{selectedEmployee ? selectedEmployee.name : 'Select Colleague'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>From You (Just now)</div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginTop: '0.75rem', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                                        {praiseMessage.trim() || 'Your recognition message will show here...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Collaboration Recommendations */}
                        <div className="card shadow-sm" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 0.25rem' }}>Suggestions</h3>
                            <p style={{ color: 'var(--text-soft)', fontSize: '0.75rem', margin: '0 0 1rem' }}>Recent collaboration candidates</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recommendations.map((rec, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-orange-100)', color: 'var(--primary-deep)', fontWeight: '800', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {rec.employee.initials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-strong)' }}>{rec.employee.name}</div>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-soft)', margin: '0.15rem 0 0.35rem', lineHeight: '1.4' }}>{rec.reason}</p>
                                            <button
                                                onClick={() => handleStartRecommendation(rec.employee)}
                                                style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem', padding: 0, cursor: 'pointer' }}
                                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                Start praise
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Collapsible Sent/Received History */}
                        <div className="card shadow-sm" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1rem' }}>History Logs</h3>
                            <button
                                onClick={() => setHistoryOpen(!historyOpen)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem',
                                    borderRadius: '8px',
                                    border: '1.5px solid var(--border-color)',
                                    backgroundColor: '#fafafa',
                                    fontWeight: '700',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <History size={14} /> {historyOpen ? "Hide Praise History" : `Show Praise History (${historyList.length})`}
                            </button>

                            {historyOpen && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {historyList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-soft)', fontSize: '0.75rem' }}>No history items found.</div>
                                    ) : (
                                        historyList.map((item, idx) => {
                                            const cat = categories.find(c => c.key === item.badge_key) || categories[0];
                                            const isSent = item.sender_id === user.employee_id;
                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '8px', backgroundColor: '#fcfcfc', border: '1px solid var(--border-color)' }}>
                                                    <PraiseBadge category={cat} size={24} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-strong)' }}>{cat.title}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isSent ? `To ${item.receiver_name}` : `From ${item.sender_name}`}</div>
                                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-soft)' }}>{isSent ? "Sent praise" : "Received praise"}</div>
                                                    </div>
                                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>{getRelativeTime(item.timestamp)}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: MY RECEIVED PRAISES */}
            {activeTab === 'my-praise' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {/* Stats Dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <div className="card shadow-sm" style={{ padding: '1.25rem 1.5rem', background: '#fff', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-deep)', lineHeight: 1 }}>{totalPraiseCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.4rem', fontWeight: '700' }}>Total praises received</div>
                        </div>
                        <div className="card shadow-sm" style={{ padding: '1.25rem 1.5rem', background: '#fff', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{thisMonthCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.4rem', fontWeight: '700' }}>This month</div>
                        </div>
                        <div className="card shadow-sm" style={{ padding: '1.25rem 1.5rem', background: '#fff', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#8338ec', lineHeight: 1 }}>{uniqueSendersCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.4rem', fontWeight: '700' }}>Colleagues who praised you</div>
                        </div>
                        <div className="card shadow-sm" style={{ padding: '1.25rem 1.5rem', background: '#fff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flexShrink: 0 }}>
                                <PraiseBadge category={topCategory} size={28} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-strong)', lineHeight: 1.2 }}>{topCategory.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.2rem', fontWeight: '700' }}>Most received badge</div>
                            </div>
                        </div>
                    </div>

                    {/* Praise grid and filter */}
                    <div className="card shadow-sm" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>Received Praise Feed</h3>
                            
                            {/* Category Filter Chips */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    style={{
                                        padding: '0.4rem 0.9rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        borderRadius: '999px',
                                        cursor: 'pointer',
                                        border: '1.5px solid var(--border-color)',
                                        backgroundColor: activeFilter === 'all' ? 'var(--primary-soft)' : '#fff',
                                        borderColor: activeFilter === 'all' ? 'var(--primary)' : 'var(--border-color)',
                                        color: activeFilter === 'all' ? 'var(--primary-deep)' : 'var(--text-soft)',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    All Categories
                                </button>
                                
                                {/* Dynamically list only categories user has actually received */}
                                {[...new Set(receivedList.map(r => r.badge_key))].map(key => {
                                    const cat = categories.find(c => c.key === key);
                                    if (!cat) return null;
                                    const isActive = activeFilter === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setActiveFilter(key)}
                                            style={{
                                                padding: '0.4rem 0.9rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                borderRadius: '999px',
                                                cursor: 'pointer',
                                                border: '1.5px solid var(--border-color)',
                                                backgroundColor: isActive ? 'var(--primary-soft)' : '#fff',
                                                borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                                                color: isActive ? 'var(--primary-deep)' : 'var(--text-soft)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Praises Grid */}
                        {filteredReceived.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-soft)' }}>
                                <Award size={36} color="var(--text-faint)" style={{ marginBottom: '0.75rem' }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>No praises received in this category</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {filteredReceived.map((item, idx) => {
                                    const cat = categories.find(c => c.key === item.badge_key) || categories[0];
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                border: '1.5px solid var(--border-color)',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                backgroundColor: '#ffffff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                boxShadow: 'var(--shadow-xs)',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                                e.currentTarget.style.borderColor = 'var(--border-orange)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                            }}
                                        >
                                            <div style={{
                                                padding: '1.25rem 1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                background: `linear-gradient(135deg, ${cat.ribbonA}15 0%, ${cat.ribbonB}15 40%, #ffffff 100%)`,
                                                borderBottom: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ flexShrink: 0 }}>
                                                    <PraiseBadge category={cat} size={42} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '800' }}>Praise received</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--text-strong)' }}>{cat.title}</div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-orange-100)', color: 'var(--primary-deep)', fontWeight: '800', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {item.sender_initials}
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-strong)' }}>From {item.sender_name}</span>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: '1.5', flex: 1, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                                                    {item.message}
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '1.25rem', fontSize: '0.7rem', color: 'var(--text-soft)' }}>
                                                    <span>{getRelativeTime(item.timestamp)}</span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{formatDate(item.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Toast Alert */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1f2937',
                    color: '#ffffff',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '9999px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    animation: 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <Check size={16} color="#10b981" /> {toast.message}
                </div>
            )}
        </div>
    );
};

export default EngageModule;
