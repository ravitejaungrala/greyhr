import React from 'react';

const HomeDashboard = () => {
    return (
        <div className="home-dashboard">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>
                Good Evening, Ravi Teja! 👋
            </h1>

            <div className="grid-3">
                {/* Daily Assistant Agent */}
                <div className="card glass-panel" style={{ borderColor: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Smart Daily Assistant</h2>
                    </div>

                    <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                            <strong>Insight:</strong> You worked 2 hrs extra this week. Great job! Consider taking a break tomorrow.
                        </p>
                    </div>

                    <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Today's Highlights</h3>
                    <ul style={{ listStyle: 'none', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--secondary)' }}>✓</span> 10:00 AM - Sprint Planning
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>•</span> 2:30 PM - 1:1 with Manager
                        </li>
                    </ul>
                </div>

                {/* AI Workforce Insights */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>📊</span>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Workforce Insights</h2>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>92%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Productivity Score</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>100%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            <span>Burnout Risk</span>
                            <span style={{ color: 'var(--secondary)' }}>Low (12%)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '12%', backgroundColor: 'var(--secondary)', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="card-title">Quick Access</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                            📄 View Latest Payslip
                        </button>
                        <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                            🌴 Apply for Leave
                        </button>
                        <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                            🎉 Give Kudos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeDashboard;
