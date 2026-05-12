import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { 
  ClipboardCheck, Users, Settings, Calendar, BarChart3, Bell, Megaphone, 
  Camera, CreditCard, PieChart, FileText, History, Layout, Timer, 
  MessageSquare, Heart, Wallet, Palmtree, Folder, Package, LogOut,
  ChevronDown, ChevronRight, Activity, BrainCircuit, UserPlus
} from 'lucide-react';

// Pages
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
import EmployeeAssistant from './pages/EmployeeAssistant';
import LandingPage from './pages/LandingPage';
import LeavePolicy from './pages/LeavePolicy';

// Helper component for dynamic document titles
const DynamicTitle = () => {
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname;
    let title = 'NeuzenAI HRMS';
    
    if (path === '/login') title = 'Login | NeuzenAI';
    else if (path === '/admin/dashboard') title = 'Admin Dashboard | NeuzenAI';
    else if (path === '/employee/pulse') title = 'Pulse Dashboard | NeuzenAI';
    else if (path === '/employee/attendance') title = 'Attendance | NeuzenAI';
    else if (path === '/employee/salary') title = 'Salary | NeuzenAI';
    else if (path === '/employee/leaves' || path === '/employee/leaves/apply' || path === '/employee/leaves/balance') title = 'Leaves | NeuzenAI';
    else if (path === '/admin/intelligence') title = 'HR Intelligence | NeuzenAI';
    else if (path.includes('admin/')) title = 'Admin | NeuzenAI';
    
    document.title = title;
  }, [location]);
  
  return null;
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state from sessionStorage
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isManagementExpanded, setIsManagementExpanded] = useState(() => {
    return sessionStorage.getItem('isMgmtExpanded') === 'true';
  });

  const [isCommExpanded, setIsCommExpanded] = useState(() => {
    return sessionStorage.getItem('isCommExpanded') === 'true';
  });

  const [isAnalyExpanded, setIsAnalyExpanded] = useState(() => {
    return sessionStorage.getItem('isAnalyExpanded') === 'true';
  });

  const [isDocExpanded, setIsDocExpanded] = useState(() => {
    return sessionStorage.getItem('isDocExpanded') === 'true';
  });

  const [isAttendExpanded, setIsAttendExpanded] = useState(() => {
    return sessionStorage.getItem('isAttendExpanded') === 'true';
  });

  const [isReqExpanded, setIsReqExpanded] = useState(() => {
    return sessionStorage.getItem('isReqExpanded') === 'true';
  });

  // Sync state changes to sessionStorage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    sessionStorage.setItem('isMgmtExpanded', isManagementExpanded);
  }, [isManagementExpanded]);

  useEffect(() => {
    sessionStorage.setItem('isCommExpanded', isCommExpanded);
  }, [isCommExpanded]);

  useEffect(() => {
    sessionStorage.setItem('isAnalyExpanded', isAnalyExpanded);
  }, [isAnalyExpanded]);

  useEffect(() => {
    sessionStorage.setItem('isDocExpanded', isDocExpanded);
  }, [isDocExpanded]);

  useEffect(() => {
    sessionStorage.setItem('isAttendExpanded', isAttendExpanded);
  }, [isAttendExpanded]);

  useEffect(() => {
    sessionStorage.setItem('isReqExpanded', isReqExpanded);
  }, [isReqExpanded]);

  const handleLogout = () => {
    setUser(null);
    sessionStorage.clear();
    navigate('/login');
  }

  const navigateTo = (path) => {
    navigate(path);
  };

  const NavItem = ({ path, icon: Icon, title, subtitle, isSub = false }) => {
    const isActive = location.pathname === path;
    return (
      <div
        className={`nav-item ${isActive ? 'active' : ''} ${isSub ? 'sub-item' : ''}`}
        onClick={() => navigateTo(path)}
      >
        <div className="nav-icon-wrapper">
          <Icon className="nav-icon-img" size={20} />
        </div>
        <div className="nav-text-group">
          <span className="nav-title">{title}</span>
          {subtitle && <span className="nav-subtitle">{subtitle}</span>}
        </div>
        {isActive && !isSub && <div className="active-dot" />}
      </div>
    );
  };

  const NavGroup = ({ id, icon: Icon, title, subtitle, isExpanded, setIsExpanded, children }) => {
    const isInside = location.pathname.includes(id);
    return (
      <>
        <div
          className={`nav-item has-sub ${isExpanded ? 'active group-expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="nav-icon-wrapper">
             <Icon className="nav-icon-img" size={20} />
          </div>
          <div className="nav-text-group">
             <span className="nav-title">{title}</span>
             <span className="nav-subtitle">{subtitle}</span>
          </div>
          <span className="arrow">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </div>
        {isExpanded && (
          <div className="sub-menu">
             {children}
          </div>
        )}
      </>
    );
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginRegister onLoginSuccess={(u) => { setUser(u); navigate(u.role?.includes('admin') ? '/admin/dashboard' : '/employee/pulse'); }} />} />
        <Route path="*" element={<LandingPage onLoginClick={() => navigate('/login')} />} />
      </Routes>
    );
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="app-container">
      <DynamicTitle />
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo-container">
             <div className="brand-logo-icon">
                <img src="/icon (2).png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
             </div>
             <div className="brand-text-group">
                <div className="brand-main">NeuzenAI</div>
                <div className="brand-sub" style={{ color: 'var(--primary)' }}>HRMS SOLUTIONS</div>
             </div>
          </div>
        </div>
        
        <nav className="nav-menu">
          {isAdmin ? (
            <>
              <NavItem path="/admin/overview" icon={Layout} title="Insight" subtitle="OVERVIEW" />
              
              <NavGroup 
                id="management" 
                icon={Settings} 
                title="Management" 
                subtitle="CONTROL"
                isExpanded={isManagementExpanded}
                setIsExpanded={setIsManagementExpanded}
              >
                <NavItem path="/admin/dashboard" icon={Users} title="Workforce" subtitle="DIRECTORY" isSub />
                <NavItem path="/admin/leaves" icon={Palmtree} title="Leave Mgmt" subtitle="TIME OFF" isSub />
                                <NavItem path="/admin/leave-policy" icon={ClipboardCheck} title="Leave Policy" subtitle="DEFAULTS" isSub />
                <NavItem path="/admin/items" icon={Package} title="Item Requests" subtitle="REQUISITIONS" isSub />
              </NavGroup>
              
              <NavItem path="/admin/calendar" icon={Calendar} title="Calendar" subtitle="SCHEDULE" />
              
              <NavGroup 
                id="communication" 
                icon={Megaphone} 
                title="Communication" 
                subtitle="REACH OUT"
                isExpanded={isCommExpanded}
                setIsExpanded={setIsCommExpanded}
              >
                <NavItem path="/admin/announcements" icon={Megaphone} title="Bulletin" subtitle="ANNOUNCEMENTS" isSub />
                <NavItem path="/admin/notifications" icon={Bell} title="Alerts" subtitle="NOTIFICATIONS" isSub />
              </NavGroup>
              
              <NavGroup 
                id="analytics" 
                icon={BarChart3} 
                title="Analytics" 
                subtitle="INSIGHTS"
                isExpanded={isAnalyExpanded}
                setIsExpanded={setIsAnalyExpanded}
              >
                <NavItem path="/admin/reports" icon={BarChart3} title="Reports" subtitle="COMPREHENSIVE" isSub />
                <NavItem path="/admin/finance" icon={PieChart} title="Finance" subtitle="REPORTS" isSub />
                <NavItem path="/admin/monitoring" icon={Camera} title="Monitoring" subtitle="LOGS" isSub />
              </NavGroup>
              
              <NavItem path="/admin/intelligence" icon={BrainCircuit} title="Intelligence" subtitle="AI SPECIALIST" />
              
              
              <NavGroup 
                id="documents" 
                icon={Folder} 
                title="Documents" 
                subtitle="RECORDS"
                isExpanded={isDocExpanded}
                setIsExpanded={setIsDocExpanded}
              >
                <NavItem path="/admin/archive" icon={History} title="Archive" subtitle="HISTORY" isSub />
                <NavItem path="/admin/templates" icon={FileText} title="Offer Docs" subtitle="ONBOARDING" isSub />
                <NavItem path="/admin/payroll" icon={CreditCard} title="Payrolls" subtitle="PAYSLIPS" isSub />
              </NavGroup>
            </>
          ) : (
            <>
              <NavItem path="/employee/pulse" icon={Layout} title="Pulse" subtitle="OVERVIEW" />
              
              <NavGroup 
                id="attendance" 
                icon={Timer} 
                title="Attendance" 
                subtitle="PRESENCE"
                isExpanded={isAttendExpanded}
                setIsExpanded={setIsAttendExpanded}
              >
                <NavItem path="/employee/attendance" icon={Timer} title="Check-in" subtitle="SCAN" isSub />
                <NavItem path="/employee/activity" icon={Activity} title="Activity" subtitle="STATS" isSub />
              </NavGroup>

              <NavItem path="/employee/engage" icon={MessageSquare} title="Engage" subtitle="COMMUNITY" />
              <NavItem path="/employee/wellbeing" icon={Heart} title="Wellbeing" subtitle="WORK LIFE" />
              <NavItem path="/employee/salary" icon={Wallet} title="Earnings" subtitle="SALARY" />
              
               <NavGroup 
                id="requests" 
                icon={ClipboardCheck} 
                title="Requests" 
                subtitle="LEAVES & ITEMS"
                isExpanded={isReqExpanded}
                setIsExpanded={setIsReqExpanded}
              >
                <NavItem path="/employee/leaves/apply" icon={UserPlus} title="Leave Apply" subtitle="LEAVES" isSub />
                <NavItem path="/employee/leaves/balance" icon={Palmtree} title="Leave Balances" subtitle="LEAVES" isSub />
                <NavItem path="/employee/items" icon={Package} title="Equipment" subtitle="REQUESTS" isSub />
              </NavGroup>

              <NavItem path="/employee/docs" icon={Folder} title="Collection" subtitle="DOCUMENTS" />
              <NavItem path="/employee/assistant" icon={BrainCircuit} title="AI Assistant" subtitle="NEUZENAI SPECIALIST" />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
           <div className="user-profile-card">
              <div className="user-avatar-orange" style={{ background: 'var(--accent-blue)', color: 'var(--primary)' }}>
                 {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                 <div className="user-name-bold">{user.name}</div>
                  <div className="user-company-sub" style={{ color: 'var(--primary)' }}>
                   {user.role === 'super_admin'
                    ? 'ALL COMPANIES'
                    : (user.accessible_companies?.length > 1 ? 'MULTI-COMPANY ACCESS' : (user.company_name || 'COMPANY ACCESS')).toUpperCase()}
                  </div>
              </div>
              <div className="logout-btn-wrapper" onClick={handleLogout}>
                 <LogOut size={20} className="logout-icon-gray" />
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-container">
          <Routes>
            <Route path="/admin/overview" element={<AdminDashboard activeTab="overview" user={user} />} />
            <Route path="/admin/dashboard" element={<AdminDashboard activeTab="employees" user={user} />} />
            <Route path="/admin/add-employee" element={<Navigate to="/admin/onboarding" replace />} />
            <Route path="/admin/onboarding" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/approvals" element={<Navigate to="/admin/onboarding" replace />} />
            <Route path="/admin/leaves" element={<AdminDashboard activeTab="leaves" user={user} />} />
            <Route path="/admin/items" element={<AdminDashboard activeTab="items" user={user} />} />
            <Route path="/admin/calendar" element={<AdminDashboard activeTab="holidays" user={user} />} />
            <Route path="/admin/announcements" element={<AdminDashboard activeTab="announcements" user={user} />} />
            <Route path="/admin/notifications" element={<AdminDashboard activeTab="notifications" user={user} />} />
            <Route path="/admin/reports" element={<AdminDashboard activeTab="reports" user={user} />} />
            <Route path="/admin/finance" element={<AdminDashboard activeTab="salary_report" user={user} />} />
            <Route path="/admin/monitoring" element={<AdminDashboard activeTab="attendance" user={user} />} />
            <Route path="/admin/archive" element={<AdminDashboard activeTab="historical_docs" user={user} />} />
            <Route path="/admin/templates" element={<AdminDashboard activeTab="templates" user={user} />} />
            <Route path="/admin/payroll" element={<AdminDashboard activeTab="payroll" user={user} />} />
            <Route path="/admin/intelligence" element={<AdminDashboard activeTab="intelligence" user={user} />} />
                        <Route path="/admin/leave-policy" element={<LeavePolicy user={user} />} />
            
            <Route path="/employee/pulse" element={<HomeDashboard user={user} setUser={setUser} />} />
            <Route path="/employee/attendance" element={<AttendanceScan userId={user.employee_id} user={user} />} />
            <Route path="/employee/activity" element={<AttendanceInfo userId={user.employee_id} user={user} />} />
            <Route path="/employee/leaves" element={<Navigate to="/employee/leaves/balance" replace />} />
            <Route path="/employee/leaves/apply" element={<Leaves userId={user.employee_id} user={user} mode="apply" />} />
            <Route path="/employee/leaves/balance" element={<Leaves userId={user.employee_id} user={user} mode="balance" />} />
            <Route path="/employee/engage" element={<EngageModule />} />
            <Route path="/employee/wellbeing" element={<MyWorkLife userId={user.employee_id} user={user} setActiveMenu={navigateTo} />} />
            <Route path="/employee/salary" element={<SalaryModule userId={user.employee_id} user={user} />} />
            <Route path="/employee/docs" element={<DocumentCenter user={user} />} />
            <Route path="/employee/items" element={<ItemRequests userId={user.employee_id} user={user} />} />
            <Route path="/employee/assistant" element={<EmployeeAssistant user={user} />} />
            <Route path="*" element={<Navigate to={isAdmin ? "/admin/overview" : "/employee/pulse"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
