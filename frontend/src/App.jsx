import React, { useState } from 'react';
import './index.css';

// Components
import HomeDashboard from './pages/HomeDashboard';
import AttendanceScan from './pages/AttendanceScan';
import Leaves from './pages/Leaves';
import AICopilot from './pages/AICopilot';
import LoginRegister from './pages/LoginRegister';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('home');

  if (!user) {
    return <LoginRegister onLoginSuccess={setUser} />;
  }

  const handleLogout = () => {
    setUser(null);
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span style={{ fontSize: '1.5rem' }}>🌊</span>
          <span>AI Workforce OS</span>
        </div>
        <nav className="nav-menu">
          {user.role === 'admin' ? (
            <div
              className={`nav-item active`}
            >
              🛡️ Admin Workspace
            </div>
          ) : (
            <>
              <div
                className={`nav-item ${activeMenu === 'home' ? 'active' : ''}`}
                onClick={() => setActiveMenu('home')}
              >
                📊 Home Dashboard
              </div>
              <div
                className={`nav-item ${activeMenu === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveMenu('attendance')}
              >
                ⏱️ Attendance Scan
              </div>
              <div className="nav-item">💬 Engage Module</div>
              <div className="nav-item">❤️ My Work Life</div>
              <div className="nav-item">💰 Salary Module</div>
              <div
                className={`nav-item ${activeMenu === 'leaves' ? 'active' : ''}`}
                onClick={() => setActiveMenu('leaves')}
              >
                🌴 Leaves
              </div>
              <div className="nav-item">📂 Document Center</div>
              <div
                className={`nav-item ${activeMenu === 'copilot' ? 'active' : ''}`}
                onClick={() => setActiveMenu('copilot')}
              >
                🧠 AI HR Copilot
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="user-profile">
            <div className="user-info" style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleLogout}>Logout</div>
            </div>
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-container">
          {user.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <>
              {activeMenu === 'home' && <HomeDashboard />}
              {activeMenu === 'attendance' && <AttendanceScan userId={user.id} />}
              {activeMenu === 'leaves' && <Leaves userId={user.id} />}
              {activeMenu === 'copilot' && <AICopilot />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
