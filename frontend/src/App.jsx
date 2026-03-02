import React, { useState } from 'react';
import './index.css';

// Components
import HomeDashboard from './pages/HomeDashboard';
import AttendanceScan from './pages/AttendanceScan';
import AttendanceInfo from './pages/AttendanceInfo';
import Leaves from './pages/Leaves';
import AICopilot from './pages/AICopilot';
import LoginRegister from './pages/LoginRegister';
import AdminDashboard from './pages/AdminDashboard';
import EngageModule from './pages/EngageModule';
import MyWorkLife from './pages/MyWorkLife';
import SalaryModule from './pages/SalaryModule';
import DocumentCenter from './pages/DocumentCenter';

function App() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('home');

  // Set default admin menu if user is admin
  React.useEffect(() => {
    if (user?.role === 'admin' && activeMenu === 'home') {
      setActiveMenu('onboarding');
    }
  }, [user]);

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
            <>
              <div className="nav-item active" style={{ backgroundColor: 'var(--primary)', color: 'white', fontWeight: 'bold' }}>
                🛡️ Admin Workspace
              </div>
              <div
                className={`nav-item ${activeMenu === 'onboarding' ? 'active' : ''}`}
                onClick={() => setActiveMenu('onboarding')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📋 Pending Approvals
              </div>
              <div
                className={`nav-item ${activeMenu === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveMenu('employees')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                👥 Employee Directory
              </div>
              <div
                className={`nav-item ${activeMenu === 'leaves' ? 'active' : ''}`}
                onClick={() => setActiveMenu('leaves')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                🌴 Leave Management
              </div>
              <div
                className={`nav-item ${activeMenu === 'holidays' ? 'active' : ''}`}
                onClick={() => setActiveMenu('holidays')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📅 Holiday Calendar
              </div>
              <div
                className={`nav-item ${activeMenu === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveMenu('reports')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📊 Company Reports
              </div>
              <div
                className={`nav-item ${activeMenu === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveMenu('notifications')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                🔔 Notifications
              </div>
              <div
                className={`nav-item ${activeMenu === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveMenu('announcements')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📢 Announcements
              </div>
              <div
                className={`nav-item ${activeMenu === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveMenu('attendance')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📸 Attendance Logs
              </div>
              <div
                className={`nav-item ${activeMenu === 'payroll' ? 'active' : ''}`}
                onClick={() => setActiveMenu('payroll')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                💰 Payslip Release
              </div>
              <div
                className={`nav-item ${activeMenu === 'copilot' ? 'active' : ''}`}
                onClick={() => setActiveMenu('copilot')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                🤖 HR AI Copilot
              </div>
            </>
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
              <div
                className={`nav-item ${activeMenu === 'attendance-info' ? 'active' : ''}`}
                onClick={() => setActiveMenu('attendance-info')}
                style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
              >
                ↳ Attendance Info
              </div>
              <div
                className={`nav-item ${activeMenu === 'engage' ? 'active' : ''}`}
                onClick={() => setActiveMenu('engage')}
              >
                💬 Engage Module
              </div>
              <div
                className={`nav-item ${activeMenu === 'worklife' ? 'active' : ''}`}
                onClick={() => setActiveMenu('worklife')}
              >
                ❤️ My Work Life
              </div>
              <div
                className={`nav-item ${activeMenu === 'salary' ? 'active' : ''}`}
                onClick={() => setActiveMenu('salary')}
              >
                💰 Salary Module
              </div>
              <div
                className={`nav-item ${activeMenu === 'leaves' ? 'active' : ''}`}
                onClick={() => setActiveMenu('leaves')}
              >
                🌴 Leaves
              </div>
              <div
                className={`nav-item ${activeMenu === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveMenu('docs')}
              >
                📂 Document Center
              </div>
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
            <AdminDashboard activeTab={activeMenu} />
          ) : (
            <>
              {activeMenu === 'home' && <HomeDashboard user={user} setUser={setUser} />}
              {activeMenu === 'attendance' && <AttendanceScan userId={user.employee_id} />}
              {activeMenu === 'attendance-info' && <AttendanceInfo userId={user.employee_id} />}
              {activeMenu === 'leaves' && <Leaves userId={user.employee_id} />}
              {activeMenu === 'copilot' && <AICopilot />}
              {activeMenu === 'engage' && <EngageModule />}
              {activeMenu === 'worklife' && <MyWorkLife userId={user.employee_id} />}
              {activeMenu === 'salary' && <SalaryModule userId={user.employee_id} />}
              {activeMenu === 'docs' && <DocumentCenter />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
