import React, { useState } from 'react';
import './index.css';

// Components
import HomeDashboard from './pages/HomeDashboard';
import AttendanceScan from './pages/AttendanceScan';
import AttendanceInfo from './pages/AttendanceInfo';
import Leaves from './pages/Leaves';
import LoginRegister from './pages/LoginRegister';
import AdminDashboard from './pages/AdminDashboard';
import EngageModule from './pages/EngageModule';
import MyWorkLife from './pages/MyWorkLife';
import SalaryModule from './pages/SalaryModule';
import DocumentCenter from './pages/DocumentCenter';
import ItemRequests from './pages/ItemRequests';
import ChatbotBubble from './components/ChatbotBubble';
import LandingPage from './pages/LandingPage';

function App() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('home');
  const [isManagementExpanded, setIsManagementExpanded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Set default admin menu if user is admin or super_admin
  React.useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'super_admin') && activeMenu === 'home') {
      setActiveMenu('onboarding');
    }
  }, [user]);

  if (!user) {
    if (showLogin) {
      return <LoginRegister onLoginSuccess={(u) => { setUser(u); setShowLogin(false); }} />;
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />;
  }

  const handleLogout = () => {
    setUser(null);
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/icon (2).png" alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }} />
          <span className="logo-text" style={{ fontSize: '1.25rem', fontWeight: '900' }}>Dhanadurga HRMS</span>
        </div>
        <nav className="nav-menu">
          {(user.role === 'admin' || user.role === 'super_admin') ? (
            <>
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
                className={`nav-item ${activeMenu === 'leaves' || activeMenu === 'items' ? 'active' : ''}`}
                onClick={() => {
                  setIsManagementExpanded(!isManagementExpanded);
                  // If opening and not on a sub-item, default to leaves
                  if (!isManagementExpanded && activeMenu !== 'leaves' && activeMenu !== 'items') {
                    setActiveMenu('leaves');
                  }
                }}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-color)', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>🛠️ Management</span>
                <span style={{ fontSize: '0.7rem', marginRight: '1rem' }}>{isManagementExpanded ? '▼' : '▶'}</span>
              </div>
              {isManagementExpanded && (
                <>
                  <div
                    className={`nav-item ${activeMenu === 'leaves' ? 'active' : ''}`}
                    onClick={() => setActiveMenu('leaves')}
                    style={{ paddingLeft: '3.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', margin: '2px 0' }}
                  >
                    ↳ 🌴 Leave Management
                  </div>
                  <div
                    className={`nav-item ${activeMenu === 'items' ? 'active' : ''}`}
                    onClick={() => setActiveMenu('items')}
                    style={{ paddingLeft: '3.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', margin: '2px 0' }}
                  >
                    ↳ 📦 Item Requests
                  </div>
                </>
              )}
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
                className={`nav-item ${activeMenu === 'salary_report' ? 'active' : ''}`}
                onClick={() => setActiveMenu('salary_report')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📊 Monthly Salary Report
              </div>
              <div
                className={`nav-item ${activeMenu === 'templates' ? 'active' : ''}`}
                onClick={() => setActiveMenu('templates')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📄 Offer Letter Templates
              </div>
              <div
                className={`nav-item ${activeMenu === 'historical_docs' ? 'active' : ''}`}
                onClick={() => setActiveMenu('historical_docs')}
                style={{ paddingLeft: '2rem', fontSize: '0.9rem' }}
              >
                📜 Historical Docs
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
                className={`nav-item ${activeMenu === 'items' ? 'active' : ''}`}
                onClick={() => setActiveMenu('items')}
              >
                📦 Item Requests
              </div>
            </>
          )}
        </nav>
      </aside >

      {/* Main Content Area */}
      < main className="main-content" >
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
          {(user.role === 'admin' || user.role === 'super_admin') ? (
            <AdminDashboard activeTab={activeMenu} user={user} />
          ) : (
            <>
              {activeMenu === 'home' && <HomeDashboard user={user} setUser={setUser} />}
              {activeMenu === 'attendance' && <AttendanceScan userId={user.employee_id} />}
              {activeMenu === 'attendance-info' && <AttendanceInfo userId={user.employee_id} />}
              {activeMenu === 'leaves' && <Leaves userId={user.employee_id} />}
              {activeMenu === 'engage' && <EngageModule />}
              {activeMenu === 'worklife' && <MyWorkLife userId={user.employee_id} setActiveMenu={setActiveMenu} />}
              {activeMenu === 'salary' && <SalaryModule userId={user.employee_id} />}
              {activeMenu === 'docs' && <DocumentCenter user={user} />}
              {activeMenu === 'items' && <ItemRequests userId={user.employee_id} />}
            </>
          )}
        </div>
      </main >
      <ChatbotBubble />
    </div >
  );
}

export default App;
