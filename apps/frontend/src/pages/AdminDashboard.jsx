import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Calendar, CheckCircle2, X, Plus, Trash2, Edit3,
    Globe, Clock, BarChart3, FileText, Megaphone, AlertTriangle, UserPlus,
    ChevronLeft, ChevronRight, ShieldCheck, TrendingUp, ClipboardList, Users,
    TreePalm, Bell, Camera, Brain, Gift, CalendarDays, Settings, Rocket,
    Banknote, LogOut, FolderOpen, Sparkles, Building2, Package, BrainCircuit, Tag,
    GraduationCap, ClipboardCheck, MoreVertical, UserMinus, Activity, Mail
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { API_URL } from '../config';
import DocumentGeneratorModal from '../components/DocumentGeneratorModal';
import EnhancedDocumentGenerator from '../components/EnhancedDocumentGenerator';
import HistoricalDocGenerator from '../components/HistoricalDocGenerator';
import { PLACEHOLDER_IMAGE } from '../utils';
import IntelligenceAgent from './IntelligenceAgent';

const AdminDashboard = ({ activeTab, user }) => {
    const isSuperAdmin = user?.role === 'super_admin';
    const normalizeCompanyKey = (value) => {
        if (!value) return '';
        const cleaned = String(value).trim().toLowerCase();
        if (!cleaned) return '';
        if (cleaned === 'all') return 'all';
        if (cleaned.includes('@')) return cleaned.split('@').pop();
        return cleaned;
    };
    const companyLabel = (value) => {
        const normalized = normalizeCompanyKey(value);
        if (!normalized || normalized === 'all') return 'All Companies';
        const base = normalized.split('.')[0].replace(/[-_]+/g, ' ').trim();
        return (base || normalized)
            .split(' ')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };
    const getEmployeeCompanyKey = (employee) => normalizeCompanyKey(employee?.company_key || employee?.email || employee?.company_name);
    const getEmployeeCompanyName = (employee) => employee?.company_name || companyLabel(getEmployeeCompanyKey(employee));
    const filterableTabs = ['overview', 'employees', 'items', 'leaves', 'reports', 'notifications', 'attendance', 'payroll', 'salary_report'];
    const userCompanyKeys = Array.from(new Set(
        [...(user?.accessible_companies || []), user?.company_key || user?.email]
            .map(normalizeCompanyKey)
            .filter((value) => value && value !== 'all')
    ));
    // Data States
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [approvedEmployees, setApprovedEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewedEmp, setViewedEmp] = useState(null);
    const [selectedApprovedEmp, setSelectedApprovedEmp] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [payrollStatus, setPayrollStatus] = useState([]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [announcementMsg, setAnnouncementMsg] = useState({ title: '', content: '' });
    const [payslipTemplate, setPayslipTemplate] = useState(null);
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [templateAnalysis, setTemplateAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [itemRequests, setItemRequests] = useState([]);
    const [salaryReport, setSalaryReport] = useState([]);
    const [salaryReportMonth, setSalaryReportMonth] = useState(`${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`);
    const [isOfferLetterModalOpen, setIsOfferLetterModalOpen] = useState(false);
    const [offerLetterParams, setOfferLetterParams] = useState({
        employment_type: 'Intern',
        date: new Date().toISOString().split('T')[0],
        role: '',
        role_description: '',
        stipend: '',
        duration: '',
        annual_ctc: 0,
        notice_period: '30 Days',
        has_pf: false,
        pf_amount: 0,
        in_hand_salary: 0,
        annexure_details: ''
    });
    const [isGeneratingOL, setIsGeneratingOL] = useState(false);
    const [offerLetterTemplates, setOfferLetterTemplates] = useState([]);
    const [selectedTemplateType, setSelectedTemplateType] = useState('Intern');
    const [uploadingTemplate, setUploadingTemplate] = useState(false);
    const [previewTimestamp, setPreviewTimestamp] = useState(Date.now());
    const [isRelievingLetterModalOpen, setIsRelievingLetterModalOpen] = useState(false);
    const [relievingLetterParams, setRelievingLetterParams] = useState({
        employee_id: '',
        relieving_date: new Date().toISOString().split('T')[0],
        joining_date: '',
        last_working_day: new Date().toISOString().split('T')[0],
        designation: '',
        reason_for_leaving: 'Personal reasons'
    });
    const [isGeneratingRL, setIsGeneratingRL] = useState(false);
    const [experienceCertificateParams, setExperienceCertificateParams] = useState({
        employee_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        joining_date: '',
        last_working_day: new Date().toISOString().split('T')[0],
        designation: '',
        performance_summary: 'Good'
    });
    const [isGeneratingEC, setIsGeneratingEC] = useState(false);
    const [previewActiveTemplate, setPreviewActiveTemplate] = useState(null);

    // AI Document Generator states
    const [isDocGenModalOpen, setIsDocGenModalOpen] = useState(false);
    const [docGenType, setDocGenType] = useState('');
    const [docGenInitialData, setDocGenInitialData] = useState({});
    const [docGenEmployee, setDocGenEmployee] = useState(null);

    // Enhanced Document Generator states
    const [isEnhancedDocGenOpen, setIsEnhancedDocGenOpen] = useState(false);

    // Payslip Manager states
    const [isPayslipManagerOpen, setIsPayslipManagerOpen] = useState(false);
    const [payslipManagerMonth, setPayslipManagerMonth] = useState('');
    const [selectedPayslipEmployees, setSelectedPayslipEmployees] = useState([]);
    const [isBatchSending, setIsBatchSending] = useState(false);

    // Add Employee Modal State
    const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
    const [addEmpForm, setAddEmpForm] = useState({
        name: '',
        email: '',
        password: '',
        employment_type: 'Full-Time',
        position: '',
        monthly_salary: 0
    });
    const [addEmpLoading, setAddEmpLoading] = useState(false);

    // Form states
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public Holiday' });
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [empRoleSetup, setEmpRoleSetup] = useState({
        employment_type: 'Full-Time',
        position: 'Software Engineer',
        monthly_salary: 50000,
        privilege_leave_rate: 0.0,
        sick_leave_rate: 0.5,
        casual_leave_rate: 1.0,
        role: 'employee',
        in_hand_salary: 0,
        internship_end_date: '',
        internship_completed: false,
        pan_no: '',
        pf_no: '',
        bank_name: '',
        bank_account: '',
        bank_ifsc: '',
        accessible_companies: [],
        tax_deduction_rate: 0,
        pf_deduction_rate: 0,
        tenth: { school: '', board: '', percentage: '', year_of_passing: '' },
        inter: { college: '', board: '', stream: '', percentage: '', year_of_passing: '' },
        ug: { college: '', university: '', degree: '', branch: '', cgpa: '', year_of_passing: '' },
        pg: { college: '', university: '', degree: '', branch: '', cgpa: '', year_of_passing: '' },
        phone: '',
        gender: '',
        address: '',
        prev_company: '',
        prev_role: '',
        prev_years: '',
        prev_reason: '',
        prev_ctc: '',
        prev_notice: ''
    });
    const [workdayOverrides, setWorkdayOverrides] = useState([]);
    const [compOffRequests, setCompOffRequests] = useState([]);
    const [weekendWorkRequests, setWeekendWorkRequests] = useState([]);
    const [isProcessingCompOff, setIsProcessingCompOff] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [salarySettings, setSalarySettings] = useState({ enable_tax: true, enable_pf: true, tax_rate: 8.0, pf_rate: 5.0 });
    const [isSavingSalarySettings, setIsSavingSalarySettings] = useState(false);
    const [overviewData, setOverviewData] = useState(null);

    // Leave Management Filter States
    const [leaveFilterName, setLeaveFilterName] = useState('');
    const [leaveFilterType, setLeaveFilterType] = useState('All');
    const [leaveFilterDate, setLeaveFilterDate] = useState('');
    const [inspectingLeave, setInspectingLeave] = useState(null);
        const [showManualLeavePanel, setShowManualLeavePanel] = useState(false);
        const [manualLeaveForm, setManualLeaveForm] = useState({ employee_id: '', leave_type: 'Casual Leave', start_date: '', end_date: '', start_session: 'Full Day', end_session: 'Full Day', reason: '', remarks: '' });
        const [manualLeaveStatus, setManualLeaveStatus] = useState('');
    const [inspectingEmpHistory, setInspectingEmpHistory] = useState(null);
    const [analyticsTrend, setAnalyticsTrend] = useState([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [workforceSubTab, setWorkforceSubTab] = useState('directory');
    const [onboardingStep, setOnboardingStep] = useState(1);
    const [salaryRowMenu, setSalaryRowMenu] = useState(null);
    const [inspectingBankDetails, setInspectingBankDetails] = useState(null);

    // Holiday Fetch States
    const [fetchedHolidays, setFetchedHolidays] = useState([]);
    const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
    const [selectedHolidays, setSelectedHolidays] = useState([]);
    const [companyFilter, setCompanyFilter] = useState(() => {
        if (isSuperAdmin) return 'all';
        return userCompanyKeys.length === 1 ? userCompanyKeys[0] : 'all';
    });

    const apiUrl = API_URL;
    const editLabelStyle = {
        fontSize: '0.72rem',
        color: '#64748b',
        display: 'block',
        marginBottom: '0.45rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
    };
    const editInputStyle = {
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '14px',
        border: '1px solid #dbe4f0',
        background: '#ffffff',
        color: '#0f172a',
        fontSize: '0.92rem',
        fontWeight: 600,
        outline: 'none',
        boxSizing: 'border-box'
    };
    const editSectionStyle = {
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
        border: '1px solid #e5edf6',
        borderRadius: '22px',
        padding: '1.35rem'
    };
    const dataDrivenCompanyKeys = Array.from(new Set(
        [
            ...approvedEmployees.map(getEmployeeCompanyKey),
            ...pendingEmployees.map(getEmployeeCompanyKey)
        ].filter((value) => value && value !== 'all')
    ));
    const availableCompanyKeys = Array.from(new Set([...userCompanyKeys, ...dataDrivenCompanyKeys]));
    const canFilterCompanies = filterableTabs.includes(activeTab) && (isSuperAdmin || availableCompanyKeys.length > 1);
    const buildAdminUrl = (path, extraParams = {}) => {
        const url = new URL(`${apiUrl}${path}`);
        if (filterableTabs.includes(activeTab)) {
            if (user?.email) url.searchParams.set('admin_email', user.email);
            if (companyFilter && companyFilter !== 'all') url.searchParams.set('company', companyFilter);
        }
        Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        return url.toString();
    };

    useEffect(() => {
        if (isSuperAdmin) {
            return;
        }
        if (availableCompanyKeys.length === 1 && companyFilter !== availableCompanyKeys[0]) {
            setCompanyFilter(availableCompanyKeys[0]);
            return;
        }
        if (companyFilter !== 'all' && availableCompanyKeys.length > 0 && !availableCompanyKeys.includes(companyFilter)) {
            setCompanyFilter(availableCompanyKeys[0] || 'all');
        }
    }, [availableCompanyKeys, companyFilter, isSuperAdmin]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const fetchWithCheck = async (url) => {
                const res = await fetch(url);
                if (!res.ok) {
                    const text = await res.text();
                    console.error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`, text);
                    return null;
                }
                return await res.json();
            };

            if (activeTab === 'overview') {
                const [overviewRes, trendRes, employeesRes, pendingRes, leavesRes, salaryRes] = await Promise.all([
                    fetchWithCheck(buildAdminUrl('/admin/overview')),
                    fetchWithCheck(buildAdminUrl('/admin/analytics/trend')),
                    fetchWithCheck(buildAdminUrl('/auth/admin/employees')),
                    fetchWithCheck(buildAdminUrl('/auth/admin/pending')),
                    fetchWithCheck(buildAdminUrl('/admin/leaves')),
                    fetchWithCheck(buildAdminUrl(`/admin/salary-report/${salaryReportMonth}`))
                ]);

                if (overviewRes) setOverviewData(overviewRes);
                if (trendRes) setAnalyticsTrend(trendRes.trend || []);
                if (employeesRes) setApprovedEmployees(employeesRes.employees || []);
                if (pendingRes) setPendingEmployees(pendingRes.employees || []);
                if (leavesRes) setLeaves(leavesRes.leaves || []);
                if (salaryRes) setSalaryReport(salaryRes.report || []);
            } else if (activeTab === 'employees') {
                const data = await fetchWithCheck(buildAdminUrl('/auth/admin/employees'));
                if (data) setApprovedEmployees(data.employees || []);
                const pData = await fetchWithCheck(buildAdminUrl('/auth/admin/pending'));
                if (pData) {
                    setPendingEmployees(pData.employees || []);
                    setViewedEmp(prev => prev && pData.employees?.some(e => e.employee_id === prev.employee_id) ? pData.employees.find(e => e.employee_id === prev.employee_id) : null);
                }
            } else if (activeTab === 'items') {
                const data = await fetchWithCheck(buildAdminUrl('/admin/items/all'));
                if (data) setItemRequests(data.requests || []);
            } else if (activeTab === 'leaves') {
                const data = await fetchWithCheck(buildAdminUrl('/admin/leaves'));
                if (data) setLeaves(data.leaves || []);
            } else if (activeTab === 'holidays') {
                const data = await fetchWithCheck(`${apiUrl}/admin/holidays`);
                if (data) setHolidays(data.holidays || []);
                const oData = await fetchWithCheck(`${apiUrl}/admin/workday-overrides`);
                if (oData) setWorkdayOverrides(oData.overrides || []);
            } else if (activeTab === 'reports') {
                const data = await fetchWithCheck(buildAdminUrl('/admin/reports'));
                if (data) setReports(data);
                const trendData = await fetchWithCheck(buildAdminUrl('/admin/analytics/trend'));
                if (trendData) setAnalyticsTrend(trendData.trend || []);
            } else if (activeTab === 'notifications') {
                const data = await fetchWithCheck(buildAdminUrl('/admin/notifications'));
                if (data) setNotifications(data.notifications || []);
                const eData = await fetchWithCheck(buildAdminUrl('/auth/admin/employees'));
                if (eData) setApprovedEmployees(eData.employees || []);
            } else if (activeTab === 'attendance') {
                const data = await fetchWithCheck(buildAdminUrl('/admin/attendance'));
                if (data) setAttendanceLogs(data.logs || []);
                const cData = await fetchWithCheck(buildAdminUrl('/admin/comp-off-requests'));
                if (cData) setCompOffRequests(cData.requests || []);
                const wwData = await fetchWithCheck(buildAdminUrl('/admin/weekend-work/requests'));
                if (wwData) setWeekendWorkRequests(wwData.requests || []);
            } else if (activeTab === 'payroll') {
                const pData = await fetchWithCheck(`${apiUrl}/admin/payslips/status`);
                if (pData) setPayrollStatus(pData.releases || []);
                const sData = await fetchWithCheck(`${apiUrl}/admin/salary/settings`);
                if (sData) setSalarySettings(sData);
                const eData = await fetchWithCheck(buildAdminUrl('/auth/admin/employees'));
                if (eData) setApprovedEmployees(eData.employees || []);
            } else if (activeTab === 'announcements') {
                const data = await fetchWithCheck(`${apiUrl}/announcement`);
                if (data) setAnnouncementMsg(data);
            } else if (activeTab === 'salary_report') {
                const data = await fetchWithCheck(buildAdminUrl(`/admin/salary-report/${salaryReportMonth}`));
                if (data) setSalaryReport(data.report || []);
            } else if (activeTab === 'templates') {
                const data = await fetchWithCheck(`${apiUrl}/admin/templates`);
                if (data) setOfferLetterTemplates(data || []);
            }
        } catch (err) {
            console.error("Fetch Data Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // If route is /admin/add-employee, open the Add Employee modal
        if (activeTab === 'add-employee') {
            setIsAddEmpModalOpen(true);
        } else {
            setIsAddEmpModalOpen(false);
        }
    }, [activeTab, companyFilter]);

    const handleApproval = async (empId, action) => {
        try {
            const response = await fetch(`${apiUrl}/auth/admin/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: empId,
                    action,
                    employment_type: empRoleSetup.employment_type,
                    position: empRoleSetup.position,
                    monthly_salary: parseInt(empRoleSetup.monthly_salary),
                    privilege_leave_rate: parseFloat(empRoleSetup.privilege_leave_rate),
                    sick_leave_rate: parseFloat(empRoleSetup.sick_leave_rate),
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate),
                    role: empRoleSetup.role,
                    accessible_companies: empRoleSetup.accessible_companies,
                    internship_end_date: empRoleSetup.internship_end_date || null,
                    tax_deduction_rate: parseFloat(empRoleSetup.tax_deduction_rate || 0),
                    pf_deduction_rate: parseFloat(empRoleSetup.pf_deduction_rate || 0)
                })
            });
            if (response.ok) {
                setPendingEmployees(prev => prev.filter(emp => emp.employee_id !== empId));
                setViewedEmp(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleLeaveStatus = async (leaveId, status) => {
        try {
            const response = await fetch(`${apiUrl}/admin/leaves/${leaveId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleItemAction = async (requestId, status) => {
        try {
            const res = await fetch(`${apiUrl}/admin/items/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                alert(`Item request ${status.toLowerCase()}ed!`);
                fetchData();
            }
        } catch (err) {
            console.error("Action failed", err);
        }
    };

    const handleUpdateEmployee = async (employee_id) => {
        try {
            const response = await fetch(`${apiUrl}/admin/employee/${employee_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employment_type: empRoleSetup.employment_type,
                    position: empRoleSetup.position,
                    monthly_salary: parseInt(empRoleSetup.monthly_salary),
                    privilege_leave_rate: parseFloat(empRoleSetup.privilege_leave_rate),
                    sick_leave_rate: parseFloat(empRoleSetup.sick_leave_rate),
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate),
                    internship_end_date: empRoleSetup.internship_end_date || null,
                    internship_completed: empRoleSetup.internship_completed,
                    pan_no: empRoleSetup.pan_no,
                    pf_no: empRoleSetup.pf_no,
                    bank_name: empRoleSetup.bank_name,
                    bank_account: empRoleSetup.bank_account,
                    in_hand_salary: parseInt(empRoleSetup.in_hand_salary || 0),
                    accessible_companies: empRoleSetup.accessible_companies,
                    tax_deduction_rate: parseFloat(empRoleSetup.tax_deduction_rate || 0),
                    pf_deduction_rate: parseFloat(empRoleSetup.pf_deduction_rate || 0)
                })
            });
            if (response.ok) {
                // Now assign role if changed
                if (isSuperAdmin) {
                    await fetch(`${apiUrl}/admin/assign-role`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employee_id: employee_id,
                            role: empRoleSetup.role
                        })
                    });
                }
                alert("Employee profile updated successfully!");
                fetchData(); // Refresh list
                setSelectedApprovedEmp(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openEmployeeEditor = (emp) => {
        setSelectedApprovedEmp(emp);
        setEmpRoleSetup({
            employment_type: emp.employment_type || 'Full-Time',
            position: emp.position || 'Software Engineer',
            monthly_salary: emp.monthly_salary || 0,
            privilege_leave_rate: emp.privilege_leave_rate || 0,
            sick_leave_rate: emp.sick_leave_rate || 0.5,
            casual_leave_rate: emp.casual_leave_rate || 1.0,
            role: emp.role || 'employee',
            in_hand_salary: emp.in_hand_salary || 0,
            pan_no: emp.pan_no || '',
            pf_no: emp.pf_no || '',
            bank_name: emp.bank_details?.bank_name || '',
            bank_account: emp.bank_details?.account_number || '',
            accessible_companies: emp.accessible_companies || (getEmployeeCompanyKey(emp) ? [getEmployeeCompanyKey(emp)] : []),
            tax_deduction_rate: emp.tax_deduction_rate || 0,
            pf_deduction_rate: emp.pf_deduction_rate || 0
        });
    };

    const handleDeleteEmployee = async (employeeId, employeeName) => {
        const confirmed = window.confirm(`Delete ${employeeName || employeeId}? This cannot be undone.`);
        if (!confirmed) return;
        try {
            const response = await fetch(`${apiUrl}/admin/employee/${employeeId}`, { method: 'DELETE' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.error) {
                alert(data.error || 'Failed to delete employee');
                return;
            }
            if (selectedApprovedEmp?.employee_id === employeeId) {
                setSelectedApprovedEmp(null);
            }
            setApprovedEmployees((prev) => prev.filter((emp) => emp.employee_id !== employeeId));
            alert(data.message || 'Employee deleted successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to delete employee');
        }
    };

    const handleAddEmployee = async (e, shouldGenDoc = false) => {
        if (e) e.preventDefault();
        setAddEmpLoading(true);
        try {
            const payload = {
                name: addEmpForm.name,
                email: addEmpForm.email || '',
                password: addEmpForm.password || '',
                employment_type: addEmpForm.employment_type || 'Full-Time',
                position: addEmpForm.position || 'Employee',
                monthly_salary: parseInt(addEmpForm.monthly_salary || 0, 10)
            };

            const response = await fetch(`${apiUrl}/admin/create-employee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("Create Employee Failed:", text);
                alert("Failed to create employee. See console for details.");
                return;
            }

            const data = await response.json();
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(`Employee ${data.employee_id} created successfully!`);

                    // Fetch the newly created employee from both approved and pending lists
                    try {
                        const [approvedRes, pendingRes] = await Promise.all([
                            fetch(buildAdminUrl('/auth/admin/employees')),
                            fetch(buildAdminUrl('/auth/admin/pending'))
                        ]);

                        let createdEmp = null;

                        if (approvedRes && approvedRes.ok) {
                            const empListData = await approvedRes.json();
                            createdEmp = (empListData.employees || []).find(e => e.employee_id === data.employee_id) || null;
                        }

                        if (!createdEmp && pendingRes && pendingRes.ok) {
                            const pendData = await pendingRes.json();
                            createdEmp = (pendData.employees || []).find(e => e.employee_id === data.employee_id) || null;
                            if (createdEmp) {
                                // Ensure the pending list in UI shows the new entry immediately
                                setPendingEmployees(prev => [createdEmp, ...prev.filter(x => x.employee_id !== createdEmp.employee_id)]);
                                setViewedEmp(createdEmp);
                            }
                        }

                        if (createdEmp && createdEmp.status === 'approved') {
                            // Prefill edit form state for approved employees
                            setSelectedApprovedEmp(createdEmp);
                            setEmpRoleSetup({
                                employment_type: createdEmp.employment_type || 'Full-Time',
                                position: createdEmp.position || '',
                                monthly_salary: createdEmp.monthly_salary || 0,
                                privilege_leave_rate: createdEmp.leave_rates?.privilege || 1.5,
                                sick_leave_rate: createdEmp.leave_rates?.sick || 1.0,
                                casual_leave_rate: createdEmp.leave_rates?.casual || 1.0,
                                role: createdEmp.role || 'employee',
                                in_hand_salary: createdEmp.in_hand_salary || createdEmp.monthly_salary || 0,
                                internship_end_date: createdEmp.internship_end_date || '',
                                internship_completed: createdEmp.internship_completed || false,
                                pan_no: createdEmp.pan_no || '',
                                pf_no: createdEmp.pf_no || '',
                                bank_name: createdEmp.bank_details?.bank_name || '',
                                bank_account: createdEmp.bank_details?.account_number || '',
                                accessible_companies: createdEmp.accessible_companies || (getEmployeeCompanyKey(createdEmp) ? [getEmployeeCompanyKey(createdEmp)] : [])
                            });
                        }

                    } catch (err) {
                        console.error('Failed to fetch created employee:', err);
                    }

                    setIsAddEmpModalOpen(false);

                if (shouldGenDoc) {
                    const isIntern = addEmpForm.employment_type === 'Intern';
                    setDocGenType(isIntern ? 'internship_offer' : 'full_time_offer');
                    setDocGenEmployee({
                        ...addEmpForm,
                        employee_id: data.employee_id,
                        full_name: addEmpForm.name
                    });
                    setDocGenInitialData({
                        emp_name: addEmpForm.name,
                        employee_id: data.employee_id,
                        designation: addEmpForm.position,
                        doj: new Date().toISOString().split('T')[0],
                        total_ctc_annual: parseInt(addEmpForm.monthly_salary) * 12,
                        inhand_amount: parseInt(addEmpForm.monthly_salary)
                    });
                    setIsDocGenModalOpen(true);
                }

                setAddEmpForm({
                    name: '',
                    email: '',
                    password: '',
                    employment_type: 'Full-Time',
                    position: '',
                    monthly_salary: 0
                });
                fetchData();
            }
        } catch (err) {
            alert("Connection error occurred.");
        } finally {
            setAddEmpLoading(false);
        }
    };

    const handleUpdateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${apiUrl}/admin/announcement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementMsg)
            });
            if (response.ok) {
                alert("Announcement updated successfully!");
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredEmployees = approvedEmployees.filter(emp =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(employeeSearch.toLowerCase())
    );

    const toSafeDate = (value) => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const approvedLeavesCount = leaves.filter((leave) => String(leave?.status || '').toLowerCase().includes('approved')).length;
    const leaveApprovalRate = leaves.length ? Math.round((approvedLeavesCount / leaves.length) * 100) : 0;
    const leavesTodayFallback = leaves.filter((leave) => {
        const status = String(leave?.status || '').toLowerCase();
        if (!status.includes('approved')) return false;
        const startDate = toSafeDate(leave?.start_date || leave?.from_date || leave?.leave_start || leave?.date);
        const endDate = toSafeDate(leave?.end_date || leave?.to_date || leave?.leave_end || leave?.date);
        if (!startDate || !endDate) return false;
        const today = new Date(currentYear, currentMonth, now.getDate()).getTime();
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        return today >= start && today <= end;
    }).length;
    const totalEmployeesKpi = Number(overviewData?.metrics?.total_employees ?? approvedEmployees.length ?? 0);
    const pendingApprovalsKpi = Number(overviewData?.metrics?.pending_approvals ?? pendingEmployees.length ?? 0);
    const activeLeavesTodayKpi = Number(overviewData?.metrics?.active_leaves_today ?? leavesTodayFallback ?? 0);
    const companiesKpi = (() => {
        const companyCount = new Set(approvedEmployees.map(getEmployeeCompanyKey).filter(Boolean)).size;
        if (companyCount > 0) return companyCount;
        return companyFilter && companyFilter !== 'all' ? 1 : 0;
    })();
    const newJoineesThisMonth = approvedEmployees.filter((employee) => {
        const joinDate = toSafeDate(employee?.joining_date || employee?.date_of_joining || employee?.created_at);
        return joinDate && joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    const salaryNetPayout = salaryReport.reduce((sum, row) => sum + Number(row?.net_salary || 0), 0)
        || approvedEmployees.reduce((sum, emp) => sum + Number(emp?.in_hand_salary || emp?.monthly_salary || 0), 0);
    const averageSalary = totalEmployeesKpi > 0 ? Math.round(salaryNetPayout / totalEmployeesKpi) : 0;
    const formatInr = (value) => `Rs ${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
    const hasLeftCompany = (employee) => {
        const status = String(employee?.status || '').toLowerCase();
        if (['left', 'resigned', 'terminated', 'inactive', 'exited', 'relieved'].some((token) => status.includes(token))) {
            return true;
        }
        return Boolean(employee?.relieving_date || employee?.last_working_day || employee?.exit_date);
    };

    const monthLabel = (monthIndex, yearValue) => {
        const d = new Date(yearValue, monthIndex, 1);
        return d.toLocaleString('default', { month: 'short' });
    };
    const fallbackTrendData = (() => {
        const months = [];
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(currentYear, currentMonth - i, 1);
            months.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                month: monthLabel(d.getMonth(), d.getFullYear()),
                joins: 0,
                leaves: 0,
                exits: 0,
                salary: 0
            });
        }
        const indexByKey = Object.fromEntries(months.map((m, idx) => [m.key, idx]));

        approvedEmployees.forEach((employee) => {
            const joinDate = toSafeDate(employee?.joining_date || employee?.date_of_joining || employee?.created_at);
            if (!joinDate) return;
            const key = `${joinDate.getFullYear()}-${joinDate.getMonth()}`;
            if (indexByKey[key] !== undefined) months[indexByKey[key]].joins += 1;
        });

        approvedEmployees.forEach((employee) => {
            if (!hasLeftCompany(employee)) return;
            const exitDate = toSafeDate(employee?.relieving_date || employee?.last_working_day || employee?.exit_date);
            if (!exitDate) return;
            const key = `${exitDate.getFullYear()}-${exitDate.getMonth()}`;
            if (indexByKey[key] !== undefined) months[indexByKey[key]].exits += 1;
        });

        leaves.forEach((leave) => {
            const leaveDate = toSafeDate(leave?.start_date || leave?.from_date || leave?.date || leave?.created_at);
            if (!leaveDate) return;
            const key = `${leaveDate.getFullYear()}-${leaveDate.getMonth()}`;
            if (indexByKey[key] !== undefined) months[indexByKey[key]].leaves += 1;
        });

        if (months.length > 0) {
            months[months.length - 1].salary = salaryNetPayout;
        }

        return months;
    })();

    const overviewTrendData = analyticsTrend.length > 0
        ? analyticsTrend.map((row, index) => ({
            month: row?.month || row?.label || row?.month_name || `M${index + 1}`,
            joins: Number(row?.joins || row?.new_joins || row?.new_joiners || 0),
            exits: Number(row?.exits || row?.left || row?.leaving || row?.attrition || 0),
            leaves: Number(row?.leaves || row?.approved_leaves || row?.leave_count || 0),
            salary: Number(row?.salary || row?.net_salary || row?.net_payout || 0)
        }))
        : fallbackTrendData;

    const companyGrowthData = (() => {
        const grouped = approvedEmployees.reduce((acc, employee) => {
            const key = getEmployeeCompanyName(employee);
            if (!acc[key]) {
                acc[key] = { company: key, joinees: 0, leaving: 0 };
            }
            acc[key].joinees += 1;
            if (hasLeftCompany(employee)) {
                acc[key].leaving += 1;
            }
            return acc;
        }, {});
        return Object.values(grouped)
            .sort((a, b) => (b.joinees + b.leaving) - (a.joinees + a.leaving))
            .slice(0, 7);
    })();

    const leavesTrendData = overviewTrendData.map((row) => ({ month: row.month, leaves: Number(row.leaves || 0) }));
    const salaryTrendData = overviewTrendData.map((row) => ({ month: row.month, salary: Number(row.salary || 0) }));
    const employeeGrowthData = (() => {
        const totalNetChange = overviewTrendData.reduce((sum, row) => sum + Number(row.joins || 0) - Number(row.exits || 0), 0);
        let headcount = Math.max(0, totalEmployeesKpi - totalNetChange);
        return overviewTrendData.map((row) => {
            headcount += Number(row.joins || 0) - Number(row.exits || 0);
            return {
                month: row.month,
                employees: Math.max(0, headcount),
                joins: Number(row.joins || 0),
                exits: Number(row.exits || 0)
            };
        });
    })();

    const handleGenerateOfferLetter = async (empId) => {
        setIsGeneratingOL(true);
        try {
            const res = await fetch(`${apiUrl}/admin/interns/generate-offer-letter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: empId,
                    ...offerLetterParams
                })
            });
            if (res.ok) {
                alert("Offer letter draft generated! Review it below.");
                setPreviewTimestamp(Date.now());
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingOL(false);
        }
    };

    const handleFinalizeOfferLetter = async (empId) => {
        try {
            const res = await fetch(`${apiUrl}/admin/interns/send-offer-letter/${empId}`, { method: 'POST' });
            if (res.ok) {
                alert(`Offer letter finalized and sent to ${offerLetterParams.employment_type === 'Intern' ? 'intern' : 'employee'}!`);
                setIsOfferLetterModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateRelievingLetter = async (empId) => {
        setIsGeneratingRL(true);
        try {
            const res = await fetch(`${apiUrl}/admin/employee/generate-relieving-letter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relievingLetterParams)
            });
            if (res.ok) {
                alert("Relieving letter draft generated! Review it below.");
                setPreviewTimestamp(Date.now());
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingRL(false);
        }
    };

    const handleFinalizeRelievingLetter = async (empId) => {
        try {
            const res = await fetch(`${apiUrl}/admin/employee/finalize-relieving-letter/${empId}`, { method: 'POST' });
            if (res.ok) {
                alert("Relieving letter finalized and released to employee!");
                setIsRelievingLetterModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateExperienceCertificate = async (empId) => {
        setIsGeneratingEC(true);
        try {
            const res = await fetch(`${apiUrl}/admin/employee/generate-experience-certificate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(experienceCertificateParams)
            });
            if (res.ok) {
                alert("Experience certificate draft generated! Review it below.");
                setPreviewTimestamp(Date.now());
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingEC(false);
        }
    };

    const handleFinalizeExperienceCertificate = async (empId) => {
        try {
            const res = await fetch(`${apiUrl}/admin/employee/finalize-experience-certificate/${empId}`, { method: 'POST' });
            if (res.ok) {
                alert("Experience certificate finalized and released to employee!");
                setIsRelievingLetterModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSetOverride = async (date, type, reason = "") => {
        try {
            const res = await fetch(`${apiUrl}/admin/workday-overrides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, type, reason })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteOverride = async (date) => {
        try {
            const res = await fetch(`${apiUrl}/admin/workday-overrides/${date}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCompOffAction = async (requestId, status) => {
        setIsProcessingCompOff(true);
        try {
            const res = await fetch(`${apiUrl}/admin/comp-off-requests/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, status })
            });
            if (res.ok) {
                alert(`Comp-Off request ${status}`);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessingCompOff(false);
        }
    };

    const handleWeekendWorkAction = async (requestId, status) => {
        try {
            const res = await fetch(`${apiUrl}/admin/weekend-work/requests/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, status })
            });
            if (res.ok) {
                alert(`Work request ${status}`);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };


    const submitHoliday = async (e) => {
        e.preventDefault();
        try {
            const url = editingHoliday ? `${apiUrl}/admin/holidays/${editingHoliday.originalDate}` : `${apiUrl}/admin/holidays`;
            const method = editingHoliday ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHoliday)
            });

            if (!response.ok) {
                const msg = await response.text();
                alert("Failed to save holiday: " + msg);
                return;
            }

            const data = await response.json();
            if (editingHoliday) {
                setHolidays(prev => prev.map(h => h.date === editingHoliday.originalDate ? { ...newHoliday } : h));
            } else {
                setHolidays(prev => [...prev, data.record]);
            }
            setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
            setEditingHoliday(null);
            fetchData();
        } catch (err) {
            console.error("Error saving holiday: ", err);
            alert("Connection error.");
        }
    };

    const handleDeleteHoliday = async (date) => {
        if (!window.confirm("Are you sure you want to delete this holiday?")) return;
        try {
            const response = await fetch(`${apiUrl}/admin/holidays/${date}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setHolidays(prev => prev.filter(h => h.date !== date));
                setEditingHoliday(null);
                setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
                fetchData();
            } else {
                alert("Failed to delete holiday.");
            }
        } catch (err) {
            console.error("Error deleting holiday: ", err);
        }
    };

    const handleEditClick = (holiday) => {
        setEditingHoliday({ ...holiday, originalDate: holiday.date });
        setNewHoliday({ name: holiday.name, date: holiday.date, type: holiday.type });
    };

    const handleTemplateUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target.result;
            // Extract base64 part
            const base64Content = result.split(',')[1];
            const fileType = file.name.endsWith('.pdf') ? 'pdf' : 'html';

            setUploadingTemplate(true);
            try {
                const res = await fetch(`${apiUrl}/admin/templates/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employment_type: selectedTemplateType,
                        content_base64: base64Content,
                        file_type: fileType
                    })
                });
                const data = await res.json();
                if (data.html_template || data.placeholders) {
                    setTemplateAnalysis({ ...data, original_type: fileType }); // Store the full analysis object
                } else if (data.message) {
                    alert(data.message);
                    fetchData();
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                console.error("Upload Error Details:", err);
                alert(`Upload failed! Could not connect to ${apiUrl}/admin/templates/upload. Please ensure the backend server is running.`);
            } finally {
                setUploadingTemplate(false);
                // After upload, trigger a re-fetch of templates to show in the list
                fetchData();
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUpdateSalarySettings = async () => {
        setIsSavingSalarySettings(true);
        try {
            const res = await fetch(`${apiUrl}/admin/salary/settings?enable_tax=${salarySettings.enable_tax}&enable_pf=${salarySettings.enable_pf}&tax_rate=${salarySettings.tax_rate}&pf_rate=${salarySettings.pf_rate}`, {
                method: 'POST'
            });
            if (res.ok) {
                alert("Salary configuration updated successfully!");
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingSalarySettings(false);
        }
    };

    const fetchExternalHolidays = async () => {
        setIsFetchingHolidays(true);
        try {
            // Fetching from our own AI backend endpoint for better reliability
            const res = await fetch(`${apiUrl}/admin/holidays/ai-fetch?year=${calYear}`);
            if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
                const data = await res.json();
                setFetchedHolidays(data);
                // Initially select all
                setSelectedHolidays(data.map(h => h.date));
                setIsHolidayModalOpen(true);
            } else {
                const text = await res.text().catch(() => "Unknown error");
                console.error("Holiday Fetch Failure:", text);
                alert("Failed to fetch official holidays from AI service. Adding manually is recommended.");
            }
        } catch (err) {
            console.error("Fetch Holidays Error:", err);
            alert("Error connecting to holiday service.");
        } finally {
            setIsFetchingHolidays(false);
        }
    };

    const submitBulkHolidays = async () => {
        const toAdd = fetchedHolidays
            .filter(h => selectedHolidays.includes(h.date))
            .map(h => ({
                name: h.name,
                date: h.date,
                type: 'Public Holiday'
            }));

        if (toAdd.length === 0) return;

        try {
            const res = await fetch(`${apiUrl}/admin/holidays/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toAdd)
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || "Bulk holidays added successfully!");
                setIsHolidayModalOpen(false);
                fetchData();
            } else {
                const text = await res.text();
                console.error("Bulk Add Failed:", text);
                alert("Failed to add bulk holidays. See console.");
            }
        } catch (err) {
            console.error("Bulk Add Error:", err);
            alert("Connection error during bulk add.");
        }
    };

    const HolidayFetchModal = () => {
        if (!isHolidayModalOpen) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="card" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', position: 'relative', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                    <button onClick={() => setIsHolidayModalOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = '#f3f4f6'} onMouseLeave={e => e.target.style.background = 'none'}>
                        <X size={20} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ color: 'var(--secondary)', display: 'flex' }}>
                            <Calendar size={28} />
                        </div>
                        <h3 style={{ margin: 0, color: 'var(--text-light)', fontSize: '1.5rem', fontWeight: '800' }}>Official Holidays {calYear}</h3>
                    </div>

                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>We found {fetchedHolidays.length} official Indian holidays. Select the ones you want to add to your company calendar.</p>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => setSelectedHolidays(fetchedHolidays.map(h => h.date))}>Select All</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => setSelectedHolidays([])}>Deselect All</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                        {fetchedHolidays.map((h, i) => {
                            const isAlreadyAdded = holidays.some(exist => exist.date === h.date);
                            return (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #f1f5f9',
                                    background: isAlreadyAdded ? '#f8fafc' : '#ffffff',
                                    opacity: isAlreadyAdded ? 0.7 : 1
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedHolidays.includes(h.date)}
                                            disabled={isAlreadyAdded}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedHolidays([...selectedHolidays, h.date]);
                                                else setSelectedHolidays(selectedHolidays.filter(d => d !== h.date));
                                            }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1f2937' }}>{h.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{h.date}</div>
                                        </div>
                                    </div>
                                    {isAlreadyAdded && <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#22c55e', fontWeight: '800', background: '#f0fdf4', padding: '0.25rem 0.5rem', borderRadius: '20px' }}><CheckCircle2 size={12} /> ADDED</div>}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                        <button onClick={() => setIsHolidayModalOpen(false)} className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={submitBulkHolidays}
                            className="btn btn-primary"
                            style={{ background: 'var(--secondary)' }}
                            disabled={selectedHolidays.filter(d => !holidays.some(e => e.date === d)).length === 0}
                        >
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    {/* Helper component for document thumbnails */ }
    const DocThumbnail = ({ fileKey, title, apiUrl, setPreviewDoc, icon, bgColor, borderColor, textColor }) => {
        const [isPdf, setIsPdf] = useState(fileKey?.toLowerCase().endsWith('.pdf'));
        const [loadError, setLoadError] = useState(false);

        if (isPdf || loadError) {
            return (
                <div
                    onClick={() => setPreviewDoc({ title, url: `${apiUrl}/admin/photos/${fileKey}`, isPDF: true })}
                    style={{ width: '100%', aspectRatio: '4/3', borderRadius: '12px', border: `1px solid ${borderColor}`, background: bgColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '0.5rem' }}
                >
                    {icon}
                    <span style={{ fontSize: '0.6rem', color: textColor, fontWeight: 'bold' }}>VIEW DOC</span>
                </div>
            );
        }

        return (
            <img
                src={`${apiUrl}/admin/photos/${fileKey}`}
                alt={title}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                onClick={() => setPreviewDoc({ title, url: `${apiUrl}/admin/photos/${fileKey}` })}
                onError={() => setLoadError(true)}
            />
        );
    };

    const DocPreviewModal = ({ doc, onClose }) => {
        if (!doc) return null;

        // Robust PDF detection: check extension OR if we've flagged it as PDF
        const isActuallyPDF = doc.url.toLowerCase().endsWith('.pdf') || doc.isPDF;

        return (
            <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                <div className="modal-content animate-zoom-in" style={{ width: '90%', maxWidth: '1000px', height: '90vh', background: '#ffffff', borderRadius: '32px', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#000000', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    <h3 style={{ marginBottom: '1.5rem', color: '#000000', fontWeight: 'bold' }}>{doc.title}</h3>
                    <div style={{ overflow: 'auto', flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {isActuallyPDF ? (
                            <iframe src={doc.url} style={{ width: '100%', height: '70vh', border: 'none' }} title="PDF Preview"></iframe>
                        ) : (
                            <img src={doc.url} alt="Document" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #eee' }} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const LeaveDetailModal = ({ leave, onClose }) => {
        if (!leave) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="card" style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', position: 'relative', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', color: '#1f2937' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#6b7280', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <div style={{ color: 'var(--primary)' }}><TreePalm size={32} /></div>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem' }}>{leave.leave_type}</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Requested by <b>{leave.employee_name} ({leave.employee_id})</b></p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 'bold' }}>Start Date</label>
                            <div style={{ fontSize: '1rem', fontWeight: '600' }}>{leave.start_date}</div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 'bold' }}>End Date</label>
                            <div style={{ fontSize: '1rem', fontWeight: '600' }}>{leave.end_date}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Reason / Explanation</label>
                        <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic', lineHeight: '1.5' }}>
                            "{leave.reason}"
                        </div>
                    </div>

                    {leave.employee_balance && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>Employee Leave Balance</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                {leave.employee_balance.types?.map((t, i) => (
                                    <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: t.remaining <= 0 ? '#FEF2F2' : '#F0F9FF', border: `1px solid ${t.remaining <= 0 ? '#FEE2E2' : '#E0F2FE'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>{t.name}</span>
                                        <span style={{ fontWeight: 'bold', color: t.remaining <= 0 ? '#EF4444' : '#0369A1' }}>{t.remaining} Days</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.875rem' }}>
                            Status: <span style={{ fontWeight: 'bold', color: leave.status.includes('Approved') ? '#22C55E' : leave.status.includes('Rejected') ? '#EF4444' : '#F59E0B' }}>{leave.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {leave.status.includes('Pending') && (
                                <>
                                    <button onClick={() => { handleLeaveStatus(leave.id, 'Rejected'); onClose(); }} className="btn btn-secondary">Reject</button>
                                    <button onClick={() => { handleLeaveStatus(leave.id, 'Approved by Admin'); onClose(); }} className="btn btn-primary" style={{ background: '#ff4500' }}>Approve</button>
                                </>
                            )}
                            <button onClick={onClose} className="btn btn-secondary" style={{ border: 'none' }}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const NotificationDetailModal = ({ employeeId, notifications, onClose }) => {
        if (!employeeId) return null;

        const empHistory = notifications.filter(n => n.employee_id === employeeId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const employeeName = approvedEmployees.find(e => e.employee_id === employeeId)?.name || employeeId;

        return (
            <div
                className="modal-overlay"
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(16px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}
                onClick={onClose}
            >
                <div
                    className="modal-content animate-zoom-in"
                    style={{
                        width: '100%',
                        maxWidth: '550px',
                        maxHeight: '85vh',
                        background: '#ffffff',
                        borderRadius: '32px',
                        padding: '2.5rem',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1.5rem',
                            right: '1.5rem',
                            color: '#94a3b8',
                            background: '#f1f5f9',
                            border: 'none',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >✕</button>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Activity Timeline</h3>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontWeight: '600' }}>{employeeName} • {employeeId}</p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {empHistory.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                <p>No historical activity found for this period.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {(() => {
                                    const groups = empHistory.reduce((acc, n) => {
                                        const date = new Date(n.created_at).toLocaleDateString('en-US', {
                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                        });
                                        if (!acc[date]) acc[date] = [];
                                        acc[date].push(n);
                                        return acc;
                                    }, {});

                                    return Object.entries(groups).map(([date, items]) => (
                                        <div key={date}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {date}
                                                <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid #f1f5f9' }}>
                                                {items.map((n, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                backgroundColor: n.action ? (n.action === 'sign_in' ? '#22c55e' : '#f59e0b') : (n.message.toLowerCase().includes('signed in') ? '#22c55e' : '#f59e0b')
                                                            }}></div>
                                                            <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
                                                                {n.action ? (n.action === 'sign_in' ? 'Clocked In' : 'Clocked Out') : (n.message.toLowerCase().includes('signed in') ? 'Clocked In' : 'Clocked Out')}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            marginTop: '2rem',
                            padding: '1rem',
                            borderRadius: '20px',
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            fontWeight: '800',
                            cursor: 'pointer'
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-dashboard">
            <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
            <LeaveDetailModal leave={inspectingLeave} onClose={() => setInspectingLeave(null)} />
            <NotificationDetailModal employeeId={inspectingEmpHistory} notifications={notifications} onClose={() => setInspectingEmpHistory(null)} />
            <HolidayFetchModal />
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSuperAdmin ? <ShieldCheck size={28} /> : <ShieldCheck size={28} />} {isSuperAdmin ? 'Super Admin' : 'Admin'} - {activeTab === 'overview' && <TrendingUp size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'overview' && 'Insight Dashboard'}
                {activeTab === 'employees' && <Users size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'employees' && 'Workforce'}
                {activeTab === 'leaves' && <TreePalm size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'leaves' && 'Leave Management'}
                {activeTab === 'holidays' && <Calendar size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'holidays' && 'Holiday Calendar'}
                {activeTab === 'reports' && <BarChart3 size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'reports' && 'Company Reports'}
                {activeTab === 'notifications' && <Bell size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'notifications' && 'Admin Notifications'}
                {activeTab === 'attendance' && <Camera size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'attendance' && 'Attendance Logs'}
                {activeTab === 'intelligence' && <Brain size={24} style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }} />}
                {activeTab === 'intelligence' && 'HR Intelligence Specialist'}
            </h1>

            {canFilterCompanies && (
                <div
                    className="card shadow-sm"
                    style={{
                        marginBottom: '1rem',
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.8rem',
                        flexWrap: 'wrap',
                        padding: '0.85rem 1rem',
                        borderRadius: '16px',
                        minHeight: '68px',
                        overflow: 'visible',
                        position: 'relative',
                        zIndex: 30
                    }}
                >
                    <div style={{ paddingRight: '0.5rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company Scope</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.2rem', fontSize: '0.9rem', lineHeight: 1.2 }}>Switch between one company or all accessible companies.</div>
                    </div>
                    <div style={{ position: 'relative', zIndex: 40 }}>
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            style={{
                                minWidth: '220px',
                                height: '42px',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '12px',
                                border: '1px solid #dbe4f0',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                lineHeight: 1.2,
                                position: 'relative',
                                zIndex: 50,
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Accessible Companies</option>
                            {availableCompanyKeys.map((companyKey) => (
                                <option key={companyKey} value={companyKey}>{companyLabel(companyKey)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {loading && <p style={{ color: '#000000', textAlign: 'center' }}>Loading data...</p>}
            {!loading && (
                <>
                    <div className="grid-3">
                        {/* TAB: OVERVIEW */}

                        {activeTab === 'overview' && (
                            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                    {[
                                        { label: 'Total Employees', value: totalEmployeesKpi, note: 'Active workforce', icon: <Users size={18} />, accent: '#6366f1' },
                                        { label: 'Companies', value: companiesKpi, note: 'Within selected scope', icon: <Building2 size={18} />, accent: '#0ea5e9' },
                                        { label: 'New Joinees', value: newJoineesThisMonth, note: 'Joined this month', icon: <UserPlus size={18} />, accent: '#10b981' },
                                        { label: 'Active Leaves', value: activeLeavesTodayKpi, note: 'On leave today', icon: <CalendarDays size={18} />, accent: '#f59e0b' },
                                        { label: 'Net Salary Payout', value: formatInr(salaryNetPayout), note: 'Current month', icon: <Banknote size={18} />, accent: '#ff4500' },
                                        { label: 'Leave Approval Rate', value: `${leaveApprovalRate}%`, note: `Pending approvals: ${pendingApprovalsKpi}`, icon: <ClipboardCheck size={18} />, accent: '#ef4444' }
                                    ].map((metric) => (
                                        <div key={metric.label} className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderLeft: `4px solid ${metric.accent}`, padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{metric.label}</div>
                                                <div style={{ color: metric.accent, background: `${metric.accent}18`, padding: '0.3rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>{metric.icon}</div>
                                            </div>
                                            <div style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.1rem 0', color: '#1f2937', lineHeight: 1.2 }}>{metric.value}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{metric.note}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TreePalm size={18} /> Leaves Trend
                                        </h2>
                                        <div style={{ height: '290px', width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={leavesTrendData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                    <Line type="monotone" dataKey="leaves" name="Leaves" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={18} /> Employee Growth
                                        </h2>
                                        <div style={{ height: '290px', width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={employeeGrowthData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                    <Legend iconType="circle" />
                                                    <Line yAxisId="left" type="monotone" dataKey="employees" name="Total Employees" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
                                                    <Line yAxisId="right" type="monotone" dataKey="joins" name="Joinees" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                                    <Line yAxisId="right" type="monotone" dataKey="exits" name="Leaving" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Banknote size={18} /> Salary Trend
                                        </h2>
                                        <div style={{ height: '290px', width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={salaryTrendData}>
                                                    <defs>
                                                        <linearGradient id="salaryTrendFill" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.22} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                    <Area type="monotone" dataKey="salary" name="Net Salary" stroke="#6366f1" fill="url(#salaryTrendFill)" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                                            Average salary per employee: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatInr(averageSalary)}</span>
                                        </div>
                                    </div>

                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Building2 size={18} /> Company Growth (Joinees vs Leaving)
                                        </h2>
                                        <div style={{ height: '290px', width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={companyGrowthData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="company" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-12} textAnchor="end" height={60} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                    <Legend iconType="circle" />
                                                    <Bar dataKey="joinees" name="Joinees" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
                                                    <Bar dataKey="leaving" name="Leaving" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={18} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Bell size={18} /> Recent Activity & Announcement
                                        </h2>
                                        {overviewData?.announcement ? (
                                            <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                                                <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#1e3a8a' }}>{overviewData.announcement.title}</div>
                                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b' }}>{overviewData.announcement.content}</p>
                                            </div>
                                        ) : (
                                            <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.82rem' }}>
                                                No active announcement.
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                            {(overviewData?.recent_activity || []).slice(0, 8).map((act, i) => (
                                                <div key={i} style={{ padding: '0.55rem 0.7rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{act?.name || 'Employee'}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {act?.employee_id || 'N/A'}</div>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '0.2rem 0.45rem',
                                                        borderRadius: '999px',
                                                        background: String(act?.status || '').toLowerCase().includes('approved') ? '#dcfce7' : '#fef3c7',
                                                        color: String(act?.status || '').toLowerCase().includes('approved') ? '#166534' : '#92400e',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {act?.status || 'Update'}
                                                    </span>
                                                </div>
                                            ))}
                                            {(overviewData?.recent_activity || []).length === 0 && (
                                                <div style={{ padding: '0.9rem', borderRadius: '10px', border: '1px dashed #cbd5e1', fontSize: '0.82rem', color: '#64748b' }}>
                                                    No recent activity found for the selected company scope.
                                                </div>
                                            )}
                                        </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: INTELLIGENCE */}
                        {activeTab === 'intelligence' && (
                            <div style={{ gridColumn: 'span 3' }}>
                                <IntelligenceAgent user={user} />
                            </div>
                        )}

                        {/* TAB: WORKFORCE (Employees + Onboarding) */}
                        {activeTab === 'employees' && (
                            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Header with sub-tabs */}
                                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1rem 1.5rem', borderRadius: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', borderRadius: '12px', padding: '0.25rem' }}>
                                            <button onClick={() => setWorkforceSubTab('directory')} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: workforceSubTab === 'directory' ? '#ffffff' : 'transparent', color: workforceSubTab === 'directory' ? '#0f172a' : '#64748b', boxShadow: workforceSubTab === 'directory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Users size={16} /> Directory <span style={{ background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem' }}>{approvedEmployees.length}</span>
                                            </button>
                                            <button onClick={() => setWorkforceSubTab('pending')} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: workforceSubTab === 'pending' ? '#ffffff' : 'transparent', color: workforceSubTab === 'pending' ? '#0f172a' : '#64748b', boxShadow: workforceSubTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <ClipboardList size={16} /> Pending <span style={{ background: pendingEmployees.length > 0 ? '#fef3c7' : '#e2e8f0', color: pendingEmployees.length > 0 ? '#92400e' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem' }}>{pendingEmployees.length}</span>
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            {workforceSubTab === 'directory' && (
                                                <div style={{ position: 'relative' }}>
                                                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                                                    <input type="text" placeholder="Search..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)}
                                                        style={{ padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.85rem', outline: 'none', width: '220px' }}
                                                    />
                                                </div>
                                            )}
                                            <button onClick={() => setIsAddEmpModalOpen(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ff4500 0%, #e63e00 100%)', border: 'none', borderRadius: '10px', padding: '0.5rem 1.25rem', fontWeight: '700', fontSize: '0.85rem' }}>
                                                <Plus size={16} /> Add Employee
                                            </button>
                                            <button onClick={() => setIsEnhancedDocGenOpen(true)} className="btn btn-secondary" style={{ background: '#ffffff', border: '1.5px solid #6366f1', color: '#6366f1', borderRadius: '10px', padding: '0.5rem 1rem', fontWeight: '700', fontSize: '0.85rem' }}>
                                                <Sparkles size={16} /> Docs
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-tab: Directory */}
                                {workforceSubTab === 'directory' && (
                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '18px', overflow: 'hidden', padding: 0 }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                                <thead>
                                                    <tr style={{ background: '#fff7f2', borderBottom: '1px solid #fde5d2' }}>
                                                        {['Employee', 'ID', 'Company', 'Email', 'Type', 'Position', ''].map((heading, i) => (
                                                            <th key={i} style={{ padding: '0.6rem 0.85rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                                                {heading}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredEmployees.map((emp) => (
                                                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedApprovedEmp?.employee_id === emp.employee_id ? '#fffaf5' : '#ffffff' }}>
                                                            <td style={{ padding: '0.45rem 0.85rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                    <img src={emp.id_card_photo_key ? `${apiUrl}/admin/photos/${emp.id_card_photo_key}` : (emp.reference_image_key ? `${apiUrl}/admin/photos/${emp.reference_image_key}` : PLACEHOLDER_IMAGE)} alt={emp.name}
                                                                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #fff1e8' }} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', lineHeight: 1.2 }}>{emp.name}</div>
                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span> Active
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.85rem', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>{emp.employee_id}</td>
                                                            <td style={{ padding: '0.45rem 0.85rem' }}>
                                                                <span style={{ display: 'inline-flex', padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                                    {getEmployeeCompanyName(emp)}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.85rem', color: '#475569', fontSize: '0.82rem' }}>{emp.email}</td>
                                                            <td style={{ padding: '0.45rem 0.85rem', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem' }}>{emp.employment_type || 'Full-Time'}</td>
                                                            <td style={{ padding: '0.45rem 0.85rem', color: '#475569', fontSize: '0.82rem' }}>{emp.position || 'Software Engineer'}</td>
                                                            <td style={{ padding: '0.45rem 0.85rem' }}>
                                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                    <button onClick={() => openEmployeeEditor(emp)} title="Edit" style={{ padding: '0.35rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteEmployee(emp.employee_id, emp.name)} title="Delete" style={{ padding: '0.35rem', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {filteredEmployees.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#ffffff' }}>
                                                <Users size={36} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
                                                <h3 style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>No employees found.</h3>
                                                <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Try another search or add a new employee.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Sub-tab: Pending Onboarding */}
                                {workforceSubTab === 'pending' && !viewedEmp && (
                                    <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '18px' }}>
                                        <h2 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Pending Approvals ({pendingEmployees.length})</h2>
                                        {pendingEmployees.length === 0 ? (
                                            <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px dashed var(--primary)' }}>
                                                <CheckCircle2 size={40} color="var(--primary)" style={{ marginBottom: '0.75rem' }} />
                                                <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>All Clear</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>No pending profiles to review.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                                                {pendingEmployees.map(emp => (
                                                    <div key={emp.employee_id} onClick={() => {
                                                        setViewedEmp(emp);
                                                        setOnboardingStep(1);
                                                        setEmpRoleSetup(prev => ({
                                                            ...prev,
                                                            employment_type: emp.employment_type || 'Full-Time',
                                                            position: emp.position || 'Software Engineer',
                                                            monthly_salary: emp.monthly_salary || 50000,
                                                            in_hand_salary: emp.in_hand_salary || 0,
                                                            role: emp.role || 'employee',
                                                            pan_no: emp.pan_no || '',
                                                            pf_no: emp.pf_no || '',
                                                            bank_name: emp.bank_details?.bank_name || '',
                                                            bank_account: emp.bank_details?.account_number || '',
                                                            bank_ifsc: emp.bank_details?.ifsc || '',
                                                            phone: emp.phone || emp.mobile || '',
                                                            gender: emp.gender || '',
                                                            address: emp.address || '',
                                                            tenth: emp.education?.tenth || emp.academics?.tenth || { school: '', board: '', percentage: '', year_of_passing: '' },
                                                            inter: emp.education?.inter || emp.education?.diploma || emp.academics?.inter || { college: '', board: '', stream: '', percentage: '', year_of_passing: '' },
                                                            ug: emp.education?.ug || emp.academics?.ug || { college: '', university: '', degree: '', branch: '', cgpa: '', year_of_passing: '' },
                                                            pg: emp.education?.pg || emp.academics?.pg || { college: '', university: '', degree: '', branch: '', cgpa: '', year_of_passing: '' },
                                                            prev_company: emp.experience?.prev_company || '',
                                                            prev_role: emp.experience?.prev_role || '',
                                                            prev_years: emp.experience?.years || '',
                                                            prev_reason: emp.experience?.reason_for_leaving || '',
                                                            prev_ctc: emp.experience?.last_ctc || '',
                                                            prev_notice: emp.experience?.notice_period || '',
                                                            privilege_leave_rate: emp.privilege_leave_rate || 0,
                                                            sick_leave_rate: emp.sick_leave_rate || 0.5,
                                                            casual_leave_rate: emp.casual_leave_rate || 1.0,
                                                            accessible_companies: emp.accessible_companies || (getEmployeeCompanyKey(emp) ? [getEmployeeCompanyKey(emp)] : []),
                                                            tax_deduction_rate: emp.tax_deduction_rate || 0,
                                                            pf_deduction_rate: emp.pf_deduction_rate || 0
                                                        }));
                                                    }}
                                                        style={{ padding: '1rem', background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.85rem' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff4500'; e.currentTarget.style.background = '#fff8f5'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafbfc'; }}>
                                                        <img src={emp.reference_image_key ? `${apiUrl}/admin/photos/${emp.reference_image_key}` : PLACEHOLDER_IMAGE} alt={emp.name}
                                                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff1e8' }} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{emp.name}</div>
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>{emp.employee_id} · {emp.email}</div>
                                                            <span style={{ display: 'inline-flex', marginTop: '0.3rem', padding: '0.12rem 0.4rem', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', fontSize: '0.65rem', fontWeight: 700 }}>{getEmployeeCompanyName(emp)}</span>
                                                        </div>
                                                        <ChevronRight size={18} color="#94a3b8" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Full-screen Onboarding Stepper Modal */}
                                {workforceSubTab === 'pending' && viewedEmp && (
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '1.5rem 1rem' }}>
                                        <div style={{ width: '100%', maxWidth: '1000px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 3rem)' }}>

                                            {/* Stepper Header */}
                                            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', borderRadius: '24px 24px 0 0', flexShrink: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                                        <img src={viewedEmp.reference_image_key ? `${apiUrl}/admin/photos/${viewedEmp.reference_image_key}` : PLACEHOLDER_IMAGE} alt={viewedEmp.name}
                                                            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff1e8' }} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Onboarding: {viewedEmp.name}</h3>
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{viewedEmp.employee_id} · {getEmployeeCompanyName(viewedEmp)}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setViewedEmp(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', borderRadius: '10px', padding: '0.5rem', display: 'flex' }} title="Close"><X size={20} /></button>
                                                </div>

                                                {/* Step Indicators */}
                                                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                                    {[
                                                        { num: 1, label: 'Personal', icon: '👤' },
                                                        { num: 2, label: 'Academic', icon: '🎓' },
                                                        { num: 3, label: 'Bank & ID', icon: '🏦' },
                                                        { num: 4, label: 'Experience', icon: '💼' },
                                                        { num: 5, label: 'Position', icon: '📋' },
                                                        { num: 6, label: 'Leaves & Final', icon: '✅' }
                                                    ].map((step, i) => (
                                                        <React.Fragment key={step.num}>
                                                            {i > 0 && <div style={{ flex: 1, height: '2px', background: onboardingStep > step.num - 1 ? '#ff4500' : '#e2e8f0', borderRadius: '1px', transition: 'background 0.3s' }} />}
                                                            <button onClick={() => setOnboardingStep(step.num)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 0.2s',
                                                                    background: onboardingStep === step.num ? '#ff4500' : onboardingStep > step.num ? '#fff1ec' : '#f1f5f9',
                                                                    color: onboardingStep === step.num ? '#ffffff' : onboardingStep > step.num ? '#ff4500' : '#94a3b8'
                                                                }}>
                                                                <span style={{ fontSize: '0.85rem' }}>{step.icon}</span> {step.label}
                                                            </button>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Step Content */}
                                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem' }}>

                                                {/* STEP 1: Personal Details */}
                                                {onboardingStep === 1 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👤 Personal Details</h4>
                                                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Employee Photo</div>
                                                                <img src={viewedEmp.reference_image_key ? `${apiUrl}/admin/photos/${viewedEmp.reference_image_key}` : PLACEHOLDER_IMAGE} alt="Photo"
                                                                    style={{ width: '140px', height: '140px', borderRadius: '20px', objectFit: 'cover', border: '3px solid #fff1e8', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                                                            </div>
                                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', minWidth: '300px' }}>
                                                                <div><label style={editLabelStyle}>Full Name</label><div style={{ ...editInputStyle, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>{viewedEmp.name}</div></div>
                                                                <div><label style={editLabelStyle}>Email Address</label><div style={{ ...editInputStyle, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>{viewedEmp.email}</div></div>
                                                                <div><label style={editLabelStyle}>Employee ID</label><div style={{ ...editInputStyle, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>{viewedEmp.employee_id}</div></div>
                                                                <div><label style={editLabelStyle}>Company</label><div style={{ ...editInputStyle, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>{getEmployeeCompanyName(viewedEmp)}</div></div>
                                                                <div><label style={editLabelStyle}>Date of Birth</label><div style={{ ...editInputStyle, background: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}>{viewedEmp.dob || '—'}</div></div>
                                                                <div><label style={editLabelStyle}>Phone Number</label><input type="text" value={empRoleSetup.phone} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, phone: e.target.value })} placeholder="Enter phone number" style={editInputStyle} /></div>
                                                                <div><label style={editLabelStyle}>Gender</label>
                                                                    <select value={empRoleSetup.gender} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, gender: e.target.value })} style={editInputStyle}>
                                                                        <option value="">Select Gender</option>
                                                                        <option value="Male">Male</option>
                                                                        <option value="Female">Female</option>
                                                                        <option value="Other">Other</option>
                                                                    </select>
                                                                </div>
                                                                <div><label style={editLabelStyle}>Address</label><input type="text" value={empRoleSetup.address} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, address: e.target.value })} placeholder="Enter address" style={editInputStyle} /></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* STEP 2: Academic Details */}
                                                {onboardingStep === 2 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎓 Academic Details</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                            {/* 10th / SSC */}
                                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e5edf6' }}>
                                                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>10th / SSC</h5>
                                                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                                    <div><label style={editLabelStyle}>School Name</label><input type="text" value={empRoleSetup.tenth?.school || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tenth: { ...empRoleSetup.tenth, school: e.target.value } })} style={editInputStyle} placeholder="Enter school name" /></div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>Board</label><input type="text" value={empRoleSetup.tenth?.board || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tenth: { ...empRoleSetup.tenth, board: e.target.value } })} style={editInputStyle} placeholder="e.g. CBSE" /></div>
                                                                        <div><label style={editLabelStyle}>Percentage / CGPA</label><input type="text" value={empRoleSetup.tenth?.percentage || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tenth: { ...empRoleSetup.tenth, percentage: e.target.value } })} style={editInputStyle} placeholder="e.g. 85%" /></div>
                                                                    </div>
                                                                    <div><label style={editLabelStyle}>Year of Passing</label><input type="text" value={empRoleSetup.tenth?.year_of_passing || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tenth: { ...empRoleSetup.tenth, year_of_passing: e.target.value } })} style={editInputStyle} placeholder="e.g. 2018" /></div>
                                                                </div>
                                                            </div>

                                                            {/* Inter / Diploma */}
                                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e5edf6' }}>
                                                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>Inter / Diploma</h5>
                                                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                                    <div><label style={editLabelStyle}>College Name</label><input type="text" value={empRoleSetup.inter?.college || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, inter: { ...empRoleSetup.inter, college: e.target.value } })} style={editInputStyle} placeholder="Enter college name" /></div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>Board</label><input type="text" value={empRoleSetup.inter?.board || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, inter: { ...empRoleSetup.inter, board: e.target.value } })} style={editInputStyle} placeholder="e.g. State Board" /></div>
                                                                        <div><label style={editLabelStyle}>Stream</label><input type="text" value={empRoleSetup.inter?.stream || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, inter: { ...empRoleSetup.inter, stream: e.target.value } })} style={editInputStyle} placeholder="e.g. MPC" /></div>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>Percentage / CGPA</label><input type="text" value={empRoleSetup.inter?.percentage || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, inter: { ...empRoleSetup.inter, percentage: e.target.value } })} style={editInputStyle} placeholder="e.g. 78%" /></div>
                                                                        <div><label style={editLabelStyle}>Year of Passing</label><input type="text" value={empRoleSetup.inter?.year_of_passing || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, inter: { ...empRoleSetup.inter, year_of_passing: e.target.value } })} style={editInputStyle} placeholder="e.g. 2020" /></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* UG */}
                                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e5edf6' }}>
                                                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>Under Graduation (UG)</h5>
                                                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                                    <div><label style={editLabelStyle}>College Name</label><input type="text" value={empRoleSetup.ug?.college || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, college: e.target.value } })} style={editInputStyle} placeholder="Enter college name" /></div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>University</label><input type="text" value={empRoleSetup.ug?.university || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, university: e.target.value } })} style={editInputStyle} placeholder="e.g. JNTUK" /></div>
                                                                        <div><label style={editLabelStyle}>Degree</label><input type="text" value={empRoleSetup.ug?.degree || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, degree: e.target.value } })} style={editInputStyle} placeholder="e.g. B.Tech" /></div>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>Branch</label><input type="text" value={empRoleSetup.ug?.branch || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, branch: e.target.value } })} style={editInputStyle} placeholder="e.g. CSE" /></div>
                                                                        <div><label style={editLabelStyle}>CGPA / %</label><input type="text" value={empRoleSetup.ug?.cgpa || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, cgpa: e.target.value } })} style={editInputStyle} placeholder="e.g. 8.5" /></div>
                                                                        <div><label style={editLabelStyle}>Year</label><input type="text" value={empRoleSetup.ug?.year_of_passing || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, ug: { ...empRoleSetup.ug, year_of_passing: e.target.value } })} style={editInputStyle} placeholder="2024" /></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* PG */}
                                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e5edf6' }}>
                                                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>Post Graduation / Higher</h5>
                                                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                                    <div><label style={editLabelStyle}>College Name</label><input type="text" value={empRoleSetup.pg?.college || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, college: e.target.value } })} style={editInputStyle} placeholder="Enter college name (if applicable)" /></div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>University</label><input type="text" value={empRoleSetup.pg?.university || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, university: e.target.value } })} style={editInputStyle} placeholder="University" /></div>
                                                                        <div><label style={editLabelStyle}>Degree</label><input type="text" value={empRoleSetup.pg?.degree || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, degree: e.target.value } })} style={editInputStyle} placeholder="e.g. M.Tech" /></div>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                                        <div><label style={editLabelStyle}>Branch</label><input type="text" value={empRoleSetup.pg?.branch || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, branch: e.target.value } })} style={editInputStyle} placeholder="Branch" /></div>
                                                                        <div><label style={editLabelStyle}>CGPA / %</label><input type="text" value={empRoleSetup.pg?.cgpa || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, cgpa: e.target.value } })} style={editInputStyle} placeholder="CGPA" /></div>
                                                                        <div><label style={editLabelStyle}>Year</label><input type="text" value={empRoleSetup.pg?.year_of_passing || ''} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pg: { ...empRoleSetup.pg, year_of_passing: e.target.value } })} style={editInputStyle} placeholder="Year" /></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ marginTop: '1.25rem' }}>
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Uploaded Certificates</div>
                                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                                <DocThumbnail fileKey={viewedEmp.education?.cert_key} title="Academic Certificate" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<GraduationCap size={22} color="#0284c7" />} bgColor="#f0f9ff" borderColor="#e0f2fe" textColor="#0284c7" />
                                                                <DocThumbnail fileKey={viewedEmp.education?.tenth_cert_key} title="10th Certificate" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#7c3aed" />} bgColor="#f5f3ff" borderColor="#ede9fe" textColor="#7c3aed" />
                                                                <DocThumbnail fileKey={viewedEmp.education?.inter_cert_key || viewedEmp.education?.diploma_cert_key} title="Inter/Diploma Cert" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#0d9488" />} bgColor="#f0fdfa" borderColor="#ccfbf1" textColor="#0d9488" />
                                                                <DocThumbnail fileKey={viewedEmp.education?.ug_cert_key} title="UG Certificate" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<GraduationCap size={22} color="#ea580c" />} bgColor="#fff7ed" borderColor="#fed7aa" textColor="#ea580c" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* STEP 3: Bank & ID Details */}
                                                {onboardingStep === 3 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏦 Bank & Identity Documents</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                            <div>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>PAN Card</div>
                                                                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                                                    <div><label style={editLabelStyle}>PAN Number</label><input type="text" value={empRoleSetup.pan_no} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pan_no: e.target.value })} placeholder="Enter PAN number" style={editInputStyle} /></div>
                                                                    <div><label style={editLabelStyle}>PF Number</label><input type="text" value={empRoleSetup.pf_no} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_no: e.target.value })} placeholder="Enter PF number" style={editInputStyle} /></div>
                                                                </div>
                                                                <DocThumbnail fileKey={viewedEmp.pan_card_key || viewedEmp.pan_photo_key} title="PAN Card Photo" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#dc2626" />} bgColor="#fef2f2" borderColor="#fecaca" textColor="#dc2626" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Bank Details</div>
                                                                <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                                                    <div><label style={editLabelStyle}>Bank Name</label><input type="text" value={empRoleSetup.bank_name} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_name: e.target.value })} placeholder="Enter bank name" style={editInputStyle} /></div>
                                                                    <div><label style={editLabelStyle}>Account Number</label><input type="text" value={empRoleSetup.bank_account} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_account: e.target.value })} placeholder="Enter account number" style={editInputStyle} /></div>
                                                                    <div><label style={editLabelStyle}>IFSC Code</label><input type="text" value={empRoleSetup.bank_ifsc} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_ifsc: e.target.value })} placeholder="Enter IFSC code" style={editInputStyle} /></div>
                                                                </div>
                                                                <DocThumbnail fileKey={viewedEmp.bank_details?.bank_photo_key} title="Bank Passbook/Card" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#ea580c" />} bgColor="#fff7ed" borderColor="#fed7aa" textColor="#ea580c" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* STEP 4: Previous Experience */}
                                                {onboardingStep === 4 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💼 Previous Employment</h4>
                                                        <div style={{ padding: '1rem 1.25rem', background: viewedEmp.is_experienced ? '#f0fdf4' : '#f8fafc', borderRadius: '14px', border: `1px solid ${viewedEmp.is_experienced ? '#bbf7d0' : '#e2e8f0'}`, marginBottom: '1.25rem' }}>
                                                            <div style={{ fontSize: '0.75rem', color: viewedEmp.is_experienced ? '#16a34a' : '#64748b', fontWeight: 800 }}>
                                                                {viewedEmp.is_experienced ? '✓ Experienced Candidate' : 'ℹ Fresher Candidate — you can still add details if needed'}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                                            <div><label style={editLabelStyle}>Previous Company</label><input type="text" value={empRoleSetup.prev_company} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_company: e.target.value })} placeholder="Company name" style={editInputStyle} /></div>
                                                            <div><label style={editLabelStyle}>Last Designation</label><input type="text" value={empRoleSetup.prev_role} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_role: e.target.value })} placeholder="e.g. Software Engineer" style={editInputStyle} /></div>
                                                            <div><label style={editLabelStyle}>Years of Experience</label><input type="text" value={empRoleSetup.prev_years} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_years: e.target.value })} placeholder="e.g. 2" style={editInputStyle} /></div>
                                                            <div><label style={editLabelStyle}>Last CTC (₹)</label><input type="text" value={empRoleSetup.prev_ctc} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_ctc: e.target.value })} placeholder="e.g. 500000" style={editInputStyle} /></div>
                                                            <div><label style={editLabelStyle}>Reason for Leaving</label><input type="text" value={empRoleSetup.prev_reason} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_reason: e.target.value })} placeholder="e.g. Career growth" style={editInputStyle} /></div>
                                                            <div><label style={editLabelStyle}>Notice Period</label><input type="text" value={empRoleSetup.prev_notice} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, prev_notice: e.target.value })} placeholder="e.g. 30 days" style={editInputStyle} /></div>
                                                        </div>
                                                        {viewedEmp.is_experienced && (
                                                            <div style={{ marginTop: '1.25rem' }}>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Uploaded Documents</div>
                                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                                    <DocThumbnail fileKey={viewedEmp.experience?.relieving_letter_key} title="Relieving Letter" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#7c3aed" />} bgColor="#f5f3ff" borderColor="#ede9fe" textColor="#7c3aed" />
                                                                    <DocThumbnail fileKey={viewedEmp.experience?.experience_letter_key} title="Experience Letter" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<FileText size={22} color="#0284c7" />} bgColor="#f0f9ff" borderColor="#e0f2fe" textColor="#0284c7" />
                                                                    <DocThumbnail fileKey={viewedEmp.experience?.payslip_key} title="Last Payslip" apiUrl={apiUrl} setPreviewDoc={setPreviewDoc} icon={<Banknote size={22} color="#ea580c" />} bgColor="#fff7ed" borderColor="#fed7aa" textColor="#ea580c" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* STEP 5: Position & Employment Type */}
                                                {onboardingStep === 5 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📋 Position & Employment</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            <div>
                                                                <label style={editLabelStyle}>Employment Type</label>
                                                                <select value={empRoleSetup.employment_type} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })} style={editInputStyle}>
                                                                    <option value="Full-Time">Full-Time Employee</option>
                                                                    <option value="Part-Time">Part-Time Employee</option>
                                                                    <option value="Contract">Contract</option>
                                                                    <option value="Intern">Internship</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>Designation / Position</label>
                                                                <input type="text" value={empRoleSetup.position} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })} placeholder="e.g. Frontend Developer" style={editInputStyle} />
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>Monthly Gross Salary (₹)</label>
                                                                <input type="number" value={empRoleSetup.monthly_salary} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })} style={editInputStyle} />
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>In-hand Take Home (₹)</label>
                                                                <input type="number" value={empRoleSetup.in_hand_salary} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, in_hand_salary: e.target.value })} style={{ ...editInputStyle, borderColor: '#fdba74' }} />
                                                            </div>
                                                            {empRoleSetup.employment_type === 'Intern' && (
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <label style={{ ...editLabelStyle, color: '#f97316' }}>Internship End Date</label>
                                                                    <input type="date" value={empRoleSetup.internship_end_date} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, internship_end_date: e.target.value })} style={{ ...editInputStyle, borderColor: '#fdba74' }} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <label style={editLabelStyle}>Tax Deduction (%)</label>
                                                                <input type="number" step="0.1" value={empRoleSetup.tax_deduction_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tax_deduction_rate: e.target.value })} style={editInputStyle} />
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>PF Deduction (%)</label>
                                                                <input type="number" step="0.1" value={empRoleSetup.pf_deduction_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_deduction_rate: e.target.value })} style={editInputStyle} />
                                                            </div>
                                                            {isSuperAdmin && (
                                                                <div>
                                                                    <label style={editLabelStyle}>Platform Role</label>
                                                                    <select value={empRoleSetup.role} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, role: e.target.value })} style={editInputStyle}>
                                                                        <option value="employee">Standard Employee</option>
                                                                        <option value="admin">System Administrator</option>
                                                                        <option value="hr">HR Personnel</option>
                                                                    </select>
                                                                </div>
                                                            )}
                                                            {isSuperAdmin && ['admin', 'hr'].includes(empRoleSetup.role) && (
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <label style={editLabelStyle}>Managed Companies</label>
                                                                    <input type="text" value={(empRoleSetup.accessible_companies || []).join(', ')} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, accessible_companies: e.target.value.split(',').map((v) => normalizeCompanyKey(v)).filter(Boolean) })} placeholder="companyone.com, companytwo.com" style={editInputStyle} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* STEP 6: Leave Policy & Final Approval */}
                                                {onboardingStep === 6 && (
                                                    <div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✅ Leave Policy & Final Review</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                                            <div>
                                                                <label style={editLabelStyle}>Privilege Leave / Month</label>
                                                                <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>Sick Leave / Month</label>
                                                                <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                                            </div>
                                                            <div>
                                                                <label style={editLabelStyle}>Casual Leave / Month</label>
                                                                <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                                            </div>
                                                        </div>

                                                        {/* Summary */}
                                                        <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e5edf6' }}>
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.85rem' }}>Onboarding Summary</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                                                                {[
                                                                    { label: 'Name', value: viewedEmp.name },
                                                                    { label: 'Type', value: empRoleSetup.employment_type },
                                                                    { label: 'Position', value: empRoleSetup.position },
                                                                    { label: 'Salary', value: `₹${empRoleSetup.in_hand_salary || empRoleSetup.monthly_salary}` },
                                                                    { label: 'Company', value: getEmployeeCompanyName(viewedEmp) },
                                                                    { label: 'Role', value: empRoleSetup.role },
                                                                    { label: 'Experience', value: viewedEmp.is_experienced ? 'Yes' : 'Fresher' },
                                                                    { label: 'Leaves/Mo', value: `P:${empRoleSetup.privilege_leave_rate} S:${empRoleSetup.sick_leave_rate} C:${empRoleSetup.casual_leave_rate}` }
                                                                ].map((item) => (
                                                                    <div key={item.label} style={{ padding: '0.5rem 0.7rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5edf6' }}>
                                                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                                                        <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, marginTop: '0.1rem' }}>{item.value}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Navigation */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc', borderRadius: '0 0 24px 24px', flexShrink: 0, flexWrap: 'wrap', gap: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {onboardingStep > 1 && (
                                                        <button onClick={() => setOnboardingStep(onboardingStep - 1)} className="btn btn-secondary" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <ChevronLeft size={16} /> Previous
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {onboardingStep === 6 && (
                                                        <>
                                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'reject')} className="btn btn-secondary" style={{ color: '#EF4444', borderColor: '#EF4444', fontSize: '0.82rem' }}>Reject</button>
                                                            <button
                                                                onClick={() => {
                                                                    const isIntern = empRoleSetup.employment_type === 'Intern';
                                                                    setDocGenType(isIntern ? 'internship_offer' : 'full_time_offer');
                                                                    setDocGenEmployee(viewedEmp);
                                                                    setDocGenInitialData({
                                                                        emp_name: viewedEmp.name, employee_id: viewedEmp.employee_id,
                                                                        designation: empRoleSetup.position || (isIntern ? 'Full Stack Intern' : 'Software Engineer'),
                                                                        role: empRoleSetup.position || 'Full Stack Intern',
                                                                        doj: new Date().toISOString().split('T')[0], date: new Date().toISOString().split('T')[0], offer_date: new Date().toISOString().split('T')[0],
                                                                        total_ctc_annual: empRoleSetup.monthly_salary ? empRoleSetup.monthly_salary * 12 : 0,
                                                                        fixed_ctc_annual: empRoleSetup.monthly_salary ? empRoleSetup.monthly_salary * 12 : 0,
                                                                        inhand_amount: empRoleSetup.monthly_salary || 0,
                                                                        annual_basic: empRoleSetup.monthly_salary ? Math.round((empRoleSetup.monthly_salary * 12) * 0.4) : 0,
                                                                        monthly_basic: empRoleSetup.monthly_salary ? Math.round(empRoleSetup.monthly_salary * 0.4) : 0
                                                                    });
                                                                    setIsDocGenModalOpen(true);
                                                                }}
                                                                className="btn btn-secondary" style={{ color: '#ff7a00', borderColor: '#ff7a00', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                                                                <Sparkles size={14} /> AI Offer Letter
                                                            </button>
                                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'approve')} className="btn btn-primary" style={{ backgroundColor: '#ff4500', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                                                                <CheckCircle2 size={16} /> Approve Onboarding
                                                            </button>
                                                        </>
                                                    )}
                                                    {onboardingStep < 6 && (
                                                        <button onClick={() => setOnboardingStep(onboardingStep + 1)} className="btn btn-primary" style={{ backgroundColor: '#ff4500', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            Next <ChevronRight size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'employees' && selectedApprovedEmp && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}>
                                <div style={{ width: '100%', maxWidth: '1100px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', borderRadius: '24px 24px 0 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img
                                                src={selectedApprovedEmp.id_card_photo_key ? `${apiUrl}/admin/photos/${selectedApprovedEmp.id_card_photo_key}` : (selectedApprovedEmp.reference_image_key ? `${apiUrl}/admin/photos/${selectedApprovedEmp.reference_image_key}` : PLACEHOLDER_IMAGE)}
                                                alt={selectedApprovedEmp.name}
                                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff1e8' }}
                                                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                                            />
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{selectedApprovedEmp.name}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                                                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{selectedApprovedEmp.employee_id}</span>
                                                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>{getEmployeeCompanyName(selectedApprovedEmp)}</span>
                                                    <span style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', background: '#ecfdf5', color: '#10b981', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>{empRoleSetup.role || 'employee'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedApprovedEmp(null)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', borderRadius: '10px', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Close"><X size={20} /></button>
                                    </div>

                                    {/* Body */}
                                    <div style={{ padding: '1.5rem 1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        {/* Employment & Payroll Section */}
                                        <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <Activity size={16} color="#f97316" />
                                            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', fontWeight: 800 }}>Employment & Payroll</h4>
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Employment Type</label>
                                            <select value={empRoleSetup.employment_type} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })} style={editInputStyle}>
                                                <option>Full-Time</option>
                                                <option>Intern</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Designation / Position</label>
                                            <input type="text" value={empRoleSetup.position} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Monthly Gross Salary (₹)</label>
                                            <input type="number" value={empRoleSetup.monthly_salary} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>In-hand Salary (₹)</label>
                                            <input type="number" value={empRoleSetup.in_hand_salary} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, in_hand_salary: e.target.value })} style={{ ...editInputStyle, borderColor: '#fdba74' }} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Tax Deduction (%)</label>
                                            <input type="number" step="0.1" value={empRoleSetup.tax_deduction_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, tax_deduction_rate: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>PF Deduction (%)</label>
                                            <input type="number" step="0.1" value={empRoleSetup.pf_deduction_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_deduction_rate: e.target.value })} style={editInputStyle} />
                                        </div>

                                        {/* Compliance & Access Section */}
                                        <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                            <ShieldCheck size={16} color="#2563eb" />
                                            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', fontWeight: 800 }}>Compliance & Access</h4>
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>PAN Number</label>
                                            <input type="text" value={empRoleSetup.pan_no} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pan_no: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>PF Number</label>
                                            <input type="text" value={empRoleSetup.pf_no} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_no: e.target.value })} style={editInputStyle} />
                                        </div>
                                        {isSuperAdmin && (
                                            <div>
                                                <label style={editLabelStyle}>Platform Role</label>
                                                <select value={empRoleSetup.role} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, role: e.target.value })} style={editInputStyle}>
                                                    <option value="employee">Employee</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="hr">HR</option>
                                                    <option value="hr_responsible">HR Responsible</option>
                                                </select>
                                            </div>
                                        )}
                                        {isSuperAdmin && ['admin', 'hr', 'hr_responsible'].includes(empRoleSetup.role) && (
                                            <div style={{ gridColumn: 'span 3' }}>
                                                <label style={editLabelStyle}>Managed Companies</label>
                                                <input
                                                    type="text"
                                                    value={(empRoleSetup.accessible_companies || []).join(', ')}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, accessible_companies: e.target.value.split(',').map((value) => normalizeCompanyKey(value)).filter(Boolean) })}
                                                    placeholder="companyone.com, companytwo.com"
                                                    style={editInputStyle}
                                                />
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>Comma-separated company email domains for cross-company access.</div>
                                            </div>
                                        )}

                                        {/* Banking & Leave Section */}
                                        <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '0.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                            <Building2 size={16} color="#7c3aed" />
                                            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.88rem', fontWeight: 800 }}>Banking & Leave Policy</h4>
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Bank Name</label>
                                            <input type="text" value={empRoleSetup.bank_name} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_name: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Bank Account Number</label>
                                            <input type="text" value={empRoleSetup.bank_account} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_account: e.target.value })} style={editInputStyle} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Privilege Leave / Month</label>
                                            <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Sick Leave / Month</label>
                                            <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                        </div>
                                        <div>
                                            <label style={editLabelStyle}>Casual Leave / Month</label>
                                            <input type="number" step="0.1" disabled={empRoleSetup.employment_type === 'Intern'} value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate} onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })} style={{ ...editInputStyle, opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }} />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', flexWrap: 'wrap', padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc', borderRadius: '0 0 24px 24px' }}>
                                        <button onClick={() => setSelectedApprovedEmp(null)} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>Cancel</button>
                                        <button
                                            onClick={() => {
                                                setDocGenType('relieving');
                                                setDocGenEmployee(selectedApprovedEmp);
                                                setDocGenInitialData({
                                                    emp_name: selectedApprovedEmp.name,
                                                    employee_id: selectedApprovedEmp.employee_id,
                                                    designation: selectedApprovedEmp.position || 'Software Engineer',
                                                    joining_date: selectedApprovedEmp.joining_date ? selectedApprovedEmp.joining_date.split('T')[0] : '',
                                                    last_working_day: new Date().toISOString().split('T')[0],
                                                    relieving_date: new Date().toISOString().split('T')[0]
                                                });
                                                setIsDocGenModalOpen(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.82rem' }}
                                        >
                                            <Sparkles size={14} /> Relieving
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDocGenType('experience');
                                                setDocGenEmployee(selectedApprovedEmp);
                                                setDocGenInitialData({
                                                    emp_name: selectedApprovedEmp.name,
                                                    employee_id: selectedApprovedEmp.employee_id,
                                                    designation: selectedApprovedEmp.position || 'Software Engineer',
                                                    joining_date: selectedApprovedEmp.joining_date ? selectedApprovedEmp.joining_date.split('T')[0] : '',
                                                    last_working_day: new Date().toISOString().split('T')[0],
                                                    issue_date: new Date().toISOString().split('T')[0]
                                                });
                                                setIsDocGenModalOpen(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.82rem' }}
                                        >
                                            <Sparkles size={14} /> Experience
                                        </button>
                                        {selectedApprovedEmp.employment_type === 'Intern' && (
                                            <button
                                                onClick={() => {
                                                    setDocGenType('internship_completion');
                                                    setDocGenEmployee(selectedApprovedEmp);
                                                    setDocGenInitialData({
                                                        emp_name: selectedApprovedEmp.name,
                                                        employee_id: selectedApprovedEmp.employee_id,
                                                        designation: selectedApprovedEmp.position || 'Software Engineer',
                                                        start_date: selectedApprovedEmp.joining_date ? selectedApprovedEmp.joining_date.split('T')[0] : '',
                                                        end_date: new Date().toISOString().split('T')[0],
                                                        current_date: new Date().toISOString().split('T')[0]
                                                    });
                                                    setIsDocGenModalOpen(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ color: '#c84cff', borderColor: '#c84cff', fontSize: '0.82rem' }}
                                            >
                                                <GraduationCap size={14} /> Intern Cert
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setDocGenType('payslip');
                                                setDocGenEmployee(selectedApprovedEmp);
                                                const monthlySalary = selectedApprovedEmp.monthly_salary || 50000;
                                                const basicSalary = Math.round(monthlySalary * 0.4);
                                                const hra = Math.round(monthlySalary * 0.2);
                                                const specialAllowance = monthlySalary - basicSalary - hra;
                                                setDocGenInitialData({
                                                    emp_name: selectedApprovedEmp.name,
                                                    employee_id: selectedApprovedEmp.employee_id,
                                                    designation: selectedApprovedEmp.position || 'Software Engineer',
                                                    department: selectedApprovedEmp.department || '',
                                                    doj: selectedApprovedEmp.joining_date ? selectedApprovedEmp.joining_date.split('T')[0] : '',
                                                    month_year: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                                                    bank_name: selectedApprovedEmp.bank_name || '',
                                                    bank_account: selectedApprovedEmp.bank_account || '',
                                                    basic_salary: basicSalary,
                                                    hra: hra,
                                                    special_allowance: specialAllowance,
                                                    total_earnings: monthlySalary,
                                                    net_salary: monthlySalary - 200
                                                });
                                                setIsDocGenModalOpen(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ color: '#ff4500', borderColor: '#ff4500', fontSize: '0.82rem' }}
                                        >
                                            <Banknote size={14} /> Payslip
                                        </button>
                                        <button onClick={() => handleUpdateEmployee(selectedApprovedEmp.employee_id)} className="btn btn-primary" style={{ backgroundColor: '#ff4500', fontSize: '0.82rem' }}>Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
            

                    {/* TAB: LEAVES */}
                    {activeTab === 'leaves' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                <h2 className="card-title" style={{ margin: 0 }}>Leave Management</h2>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <button
                                        onClick={() => { setShowManualLeavePanel(p => !p); setManualLeaveStatus(''); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', borderRadius: '8px', border: 'none', background: showManualLeavePanel ? '#e0f2fe' : '#ff4500', color: showManualLeavePanel ? '#0369a1' : 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /> Post Manual Leave
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Search Employee..."
                                            value={leaveFilterName}
                                            onChange={(e) => setLeaveFilterName(e.target.value)}
                                            style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', width: '200px' }}
                                        />
                                    </div>
                                    <select
                                        value={leaveFilterType}
                                        onChange={(e) => setLeaveFilterType(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                    >
                                        <option value="All">All Types</option>
                                        <option value="Sick Leave">Sick Leave</option>
                                        <option value="Casual Leave">Casual Leave</option>
                                        <option value="Paid Leave">Paid Leave</option>
                                        <option value="Compensatory Off">Compensatory Off</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={leaveFilterDate}
                                        onChange={(e) => setLeaveFilterDate(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                    />
                                    <button
                                        onClick={() => { setLeaveFilterName(''); setLeaveFilterType('All'); setLeaveFilterDate(''); }}
                                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                                        title="Clear Filters"
                                    >
                                        🧹
                                    </button>
                                </div>
                            </div>

                            {/* Manual Leave Entry Panel */}
                            {showManualLeavePanel && (
                            <div style={{ background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Plus size={16} /> Manual Leave Entry
                                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>— Posted as Approved immediately</span>
                                </h3>
                                {manualLeaveStatus && (
                                    <div style={{ padding: '0.6rem 0.9rem', marginBottom: '1rem', borderRadius: '6px', background: manualLeaveStatus.startsWith('✓') ? '#dcfce7' : '#fee2e2', color: manualLeaveStatus.startsWith('✓') ? '#15803d' : '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {manualLeaveStatus}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Employee</label>
                                        <select value={manualLeaveForm.employee_id} onChange={e => setManualLeaveForm(f => ({ ...f, employee_id: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}>
                                            <option value="">Select Employee</option>
                                            {approvedEmployees.map(emp => (<option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Leave Type</label>
                                        <select value={manualLeaveForm.leave_type} onChange={e => setManualLeaveForm(f => ({ ...f, leave_type: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}>
                                            <option>Casual Leave</option>
                                            <option>Sick Leave</option>
                                            <option>Privilege Leave</option>
                                            <option>Compensatory Off</option>
                                            <option>Paid Leave</option>
                                            <option>Unpaid Leave</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Reason</label>
                                        <input type="text" placeholder="e.g. Medical emergency" value={manualLeaveForm.reason} onChange={e => setManualLeaveForm(f => ({ ...f, reason: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>From Date</label>
                                        <input type="date" value={manualLeaveForm.start_date} onChange={e => setManualLeaveForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>To Date</label>
                                        <input type="date" value={manualLeaveForm.end_date} onChange={e => setManualLeaveForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Session</label>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <select value={manualLeaveForm.start_session} onChange={e => setManualLeaveForm(f => ({ ...f, start_session: e.target.value }))} style={{ flex: 1, padding: '0.55rem 0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}>
                                                <option value="Full Day">Full Day</option>
                                                <option value="Session 1">Session 1</option>
                                                <option value="Session 2">Session 2</option>
                                            </select>
                                            <select value={manualLeaveForm.end_session} onChange={e => setManualLeaveForm(f => ({ ...f, end_session: e.target.value }))} style={{ flex: 1, padding: '0.55rem 0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}>
                                                <option value="Full Day">Full Day</option>
                                                <option value="Session 1">Session 1</option>
                                                <option value="Session 2">Session 2</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Remarks (optional)</label>
                                    <input type="text" placeholder="Any admin notes..." value={manualLeaveForm.remarks} onChange={e => setManualLeaveForm(f => ({ ...f, remarks: e.target.value }))} style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={async () => {
                                            if (!manualLeaveForm.employee_id || !manualLeaveForm.start_date || !manualLeaveForm.end_date || !manualLeaveForm.reason) {
                                                setManualLeaveStatus('Please fill all required fields.');
                                                return;
                                            }
                                            setManualLeaveStatus('Posting...');
                                            try {
                                                const res = await fetch(`${apiUrl}/admin/manual-leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manualLeaveForm) });
                                                const data = await res.json();
                                                if (data.message) {
                                                    setManualLeaveStatus('✓ ' + data.message);
                                                    setManualLeaveForm({ employee_id: '', leave_type: 'Casual Leave', start_date: '', end_date: '', start_session: 'Full Day', end_session: 'Full Day', reason: '', remarks: '' });
                                                    const refreshed = await fetch(buildAdminUrl('/admin/leaves'));
                                                    const refreshedData = await refreshed.json();
                                                    if (refreshedData) setLeaves(refreshedData.leaves || []);
                                                } else {
                                                    setManualLeaveStatus('Error: ' + (data.error || 'Failed to post leave.'));
                                                }
                                            } catch {
                                                setManualLeaveStatus('Network error. Please try again.');
                                            }
                                        }}
                                        style={{ padding: '0.55rem 1.5rem', borderRadius: '8px', border: 'none', background: '#ff4500', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                                    >
                                        Post Leave
                                    </button>
                                    <button onClick={() => { setShowManualLeavePanel(false); setManualLeaveStatus(''); }} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                                </div>
                            </div>
                            )}

                            {leaves.length === 0 ? <p style={{ color: '#000000', padding: '1rem' }}>No leave requests found.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {leaves
                                        .filter(l => {
                                            const nameMatch = (l.employee_name || '').toLowerCase().includes(leaveFilterName.toLowerCase()) || (l.employee_id || '').toLowerCase().includes(leaveFilterName.toLowerCase());
                                            const typeMatch = leaveFilterType === 'All' || l.leave_type === leaveFilterType;
                                            const dateMatch = !leaveFilterDate || l.start_date === leaveFilterDate || l.end_date === leaveFilterDate;
                                            return nameMatch && typeMatch && dateMatch;
                                        })
                                        .map((l, idx) => (
                                            <div key={idx} className="hover-shadow-sm" style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                border: '1px solid #f1f5f9',
                                                borderRadius: '8px',
                                                padding: '0.5rem 1rem',
                                                background: '#ffffff',
                                                transition: 'all 0.2s'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: l.status.includes('Approved') ? '#22C55E' : l.status.includes('Rejected') ? '#EF4444' : '#F59E0B' }}></div>

                                                    <div style={{ minWidth: '150px' }}>
                                                        <div style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1f2937' }}>{l.employee_name || 'Employee'}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{l.employee_id}</div>
                                                    </div>

                                                    <div style={{ minWidth: '130px' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--primary)' }}>{l.leave_type}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{l.start_date} ({l.days || 1}d)</div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <span style={{
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: '700',
                                                            backgroundColor: l.status.includes('Approved') ? '#DCFCE7' : l.status.includes('Rejected') ? '#FEE2E2' : '#FEF3C7',
                                                            color: l.status.includes('Approved') ? '#166534' : l.status.includes('Rejected') ? '#991B1B' : '#92400E'
                                                        }}>
                                                            {l.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {l.status.includes('Pending') && !user?.role.includes('hr_responsible') && (
                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                            <button onClick={() => handleLeaveStatus(l.id, 'Rejected')} className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px' }}>Reject</button>
                                                            <button onClick={() => handleLeaveStatus(l.id, 'Approved by Admin')} className="btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', background: '#ff4500', color: 'white', border: 'none', borderRadius: '4px' }}>Approve</button>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => setInspectingLeave(l)}
                                                        style={{
                                                            fontSize: '1.25rem',
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#9ca3af',
                                                            borderRadius: '50%'
                                                        }}
                                                        className="btn-hover-light"
                                                        title="View Full Details"
                                                    >
                                                        ⋮
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                                        {/* TAB: HOLIDAYS */}
                    {activeTab === 'holidays' && (
                        <div className="nz-holidays-grid" style={{ gridColumn: 'span 3' }}>
                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', height: 'fit-content', padding: '1.5rem' }}>
                                <h2 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
                                <form onSubmit={submitHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Holiday Name</label>
                                        <input required type="text" placeholder="Ugadi, New Year..." value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f9fafb', color: '#1f2937' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Date</label>
                                        <input required type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f9fafb', color: '#1f2937' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                                        <select required value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f9fafb', color: '#1f2937', fontWeight: 'bold' }}>
                                            <option>Public Holiday</option>
                                            <option>Optional Holiday</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.75rem', background: 'var(--primary)' }}>{editingHoliday ? "Save Changes" : "Add Holiday"}</button>
                                            <button type="button" className="btn btn-secondary" onClick={() => { setEditingHoliday(null); setNewHoliday({ name: '', date: '', type: 'Public Holiday' }); }} style={{ flex: 1, padding: '0.75rem' }}>{editingHoliday ? "Cancel" : "Clear"}</button>
                                        </div>
                                        {editingHoliday && (
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() => handleDeleteHoliday(editingHoliday.originalDate)}
                                                style={{ padding: '0.75rem', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FEE2E2', fontWeight: 'bold' }}
                                            >
                                                🗑️ Delete Holiday
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title" style={{ margin: 0 }}>Holiday Calendar</h2>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={fetchExternalHolidays}
                                            disabled={isFetchingHolidays}
                                            style={{
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                border: '1px solid #e2e8f0',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '10px',
                                                background: '#ffffff',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {isFetchingHolidays ? (
                                                <><RefreshCw size={14} className="animate-spin" /> Fetching...</>
                                            ) : (
                                                <><Search size={14} /> Fetch {calYear} Holidays</>
                                            )}
                                        </button>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '1rem' }}>
                                            <button className="btn btn-secondary" onClick={() => {
                                                if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                                                else setCalMonth(calMonth - 1);
                                            }} style={{ padding: '0.25rem' }}><ChevronLeft size={16} /></button>
                                            <div style={{ fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
                                                {new Date(calYear, calMonth).toLocaleString('default', { month: 'long' })} {calYear}
                                            </div>
                                            <button className="btn btn-secondary" onClick={() => {
                                                if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                                                else setCalMonth(calMonth + 1);
                                            }} style={{ padding: '0.25rem' }}><ChevronRight size={16} /></button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    {/* DAY HEADERS */}
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} style={{
                                            padding: '0.75rem 0',
                                            background: '#f8fafc',
                                            textAlign: 'center',
                                            fontWeight: '700',
                                            color: '#64748b',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            borderBottom: '1px solid var(--border-color)'
                                        }}>
                                            {day}
                                        </div>
                                    ))}

                                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                                        <div key={`empty-${i}`} style={{ padding: '1rem', background: '#F9FAFB' }}></div>
                                    ))}
                                    {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayHolidays = holidays.filter(h => h.date === dateStr);
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                                        return (
                                            <div key={day} style={{
                                                minHeight: '70px',
                                                padding: '0.6rem',
                                                background: '#ffffff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                position: 'relative',
                                                transition: 'background 0.2s',
                                                cursor: 'default'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                            >
                                                <div style={{
                                                    fontWeight: '700',
                                                    marginBottom: '0.4rem',
                                                    color: isToday ? '#ff4500' : '#475569',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'baseline'
                                                }}>
                                                    {day}
                                                    {isToday && <span style={{ width: '6px', height: '6px', background: '#ff4500', borderRadius: '50%' }}></span>}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                                    {dayHolidays.map((h, hi) => (
                                                        <div key={hi} style={{
                                                            fontSize: '0.65rem',
                                                            background: h.type === 'Public Holiday' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                                            color: h.type === 'Public Holiday' ? '#DC2626' : '#D97706',
                                                            padding: '0.2rem 0.4rem',
                                                            borderRadius: '4px',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            border: `1px solid ${h.type === 'Public Holiday' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
                                                            fontWeight: '600',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }} onClick={() => handleEditClick(h)} title="Click to Edit">
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {h.name}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteHoliday(h.date);
                                                                }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#EF4444',
                                                                    cursor: 'pointer',
                                                                    padding: '0.1rem',
                                                                    fontSize: '0.7rem',
                                                                    opacity: 0.6
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Workday Overrides / Holiday Swapping */}
                            <div className="card shadow-sm" style={{ marginTop: '2rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                <h2 className="card-title">🔄 Holiday Swapping & Workday Overrides</h2>
                                <p style={{ color: '#000000', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Force a specific date to be a **Working Day** (e.g., for deadlines) or a **Holiday** (e.g., as a substitute for a worked holiday).
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <input type="date" id="override-date" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', width: '200px' }} />
                                    <select id="override-type" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', width: '200px' }}>
                                        <option value="forced_working">Mark as Working Day</option>
                                        <option value="forced_holiday">Mark as Holiday</option>
                                    </select>
                                    <input type="text" id="override-reason" placeholder="Reason (e.g., Ugadi Swap)" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', flex: 1 }} />
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: 'var(--primary)' }}
                                        onClick={() => {
                                            const d = document.getElementById('override-date').value;
                                            const t = document.getElementById('override-type').value;
                                            const r = document.getElementById('override-reason').value;
                                            if (d) handleSetOverride(d, t, r);
                                        }}
                                    >
                                        Add Override
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                    {workdayOverrides.map((ov, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: ov.type === 'forced_working' ? '#ff4500' : '#ff7a00' }}>
                                                    {ov.type === 'forced_working' ? '💼 Forced Working' : '🎉 Forced Holiday'}
                                                </div>
                                                <div style={{ fontSize: '0.875rem' }}>{ov.date} {ov.reason && `(${ov.reason})`}</div>
                                            </div>
                                            <button onClick={() => handleDeleteOverride(ov.date)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: REPORTS */}
                    {activeTab === 'reports' && reports && (
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Compact Stats Strip */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                {[
                                    { label: 'Total Employees', value: reports.total_employees, icon: <Users size={20} />, color: '#6366F1' },
                                    { label: 'Present Today', value: reports.present_today, icon: <CheckCircle2 size={20} />, color: '#10B981' },
                                    { label: 'On Leave', value: reports.on_leave, icon: <TreePalm size={20} />, color: '#F59E0B' },
                                    { label: 'Engagement', value: `${reports.average_engagement_score}%`, icon: <Activity size={20} />, color: '#ff4500' }
                                ].map((stat, idx) => (
                                    <div key={idx} className="card shadow-sm" style={{ padding: '1rem', background: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.75rem', background: `${stat.color}10`, borderRadius: '12px', color: stat.color }}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{stat.label}</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{stat.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Charts Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                                {/* Company Growth Chart */}
                                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TrendingUp size={18} color="#6366F1" /> Company Growth
                                        </h3>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last 6 Months</div>
                                    </div>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsTrend}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                    cursor={{ fill: '#f8fafc' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar dataKey="joins" name="New Joins" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
                                                <Bar dataKey="exits" name="Exits" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Attendance Consistency Chart */}
                                <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle2 size={18} color="#10B981" /> Attendance Trend
                                        </h3>
                                    </div>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analyticsTrend}>
                                                <defs>
                                                    <linearGradient id="colorAttend" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                <Area type="monotone" dataKey="attendance" name="Integrity %" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAttend)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Leaves Pattern Chart */}
                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={18} color="#F59E0B" /> Absenteeism & Leaves Pattern
                                    </h3>
                                </div>
                                <div style={{ height: '200px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsTrend}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Legend iconType="circle" />
                                            <Line type="monotone" dataKey="leaves" name="Approved Leaves" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="absentees" name="Unaccounted Absences" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: NOTIFICATIONS -> LIVE STATUS DASHBOARD */}
                    {activeTab === 'notifications' && (
                        <div style={{ gridColumn: 'span 3' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Globe size={28} color="var(--primary)" /> Employee Live Status
                                </h2>
                                <button className="btn btn-secondary" onClick={fetchData} style={{ fontSize: '0.85rem' }}>
                                    <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Sync Status
                                </button>
                            </div>

                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee Profile</th>
                                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Activity</th>
                                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Status</th>
                                            <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {approvedEmployees.map((emp, index) => {
                                            const latestNote = [...notifications]
                                                .filter(n => n.employee_id === emp.employee_id)
                                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                                            const isOnline = latestNote?.action ? (latestNote.action === 'sign_in') : latestNote?.message?.toLowerCase().includes('signed in');

                                            return (
                                                <tr
                                                    key={emp.employee_id}
                                                    style={{ borderBottom: index === approvedEmployees.length - 1 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onClick={() => setInspectingEmpHistory(emp.employee_id)}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <td style={{ padding: '0.6rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{emp.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>{emp.employee_id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                                                                {latestNote ? (isOnline ? 'Clocked In' : 'Clocked Out') : 'No Recent Logs'}
                                                            </span>
                                                            {latestNote && (
                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                                    {new Date(latestNote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1.5rem' }}>
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '100px',
                                                            fontSize: '0.65rem',
                                                            fontWeight: '800',
                                                            background: latestNote ? (isOnline ? '#dcfce7' : '#fef3c7') : '#f1f5f9',
                                                            color: latestNote ? (isOnline ? '#166534' : '#b45309') : '#64748b',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }}></div>
                                                            {latestNote ? (isOnline ? 'Active' : 'Offline') : 'Inactive'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1.5rem', textAlign: 'right' }}>
                                                        <button
                                                            style={{ background: '#f1f5f9', border: 'none', padding: '0.35rem', borderRadius: '6px', color: '#64748b' }}
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: ATTENDANCE LOGS */}
                    {activeTab === 'attendance' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                            <h2 className="card-title">Global Attendance History</h2>
                            {/* ... existing table code ... */}
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {/* TABLE REMOVED FOR BREVITY IN CHUNK BUT IT SHOULD BE THERE */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#000000', fontSize: '0.875rem' }}>
                                            <th style={{ padding: '1rem' }}>Employee</th>
                                            <th style={{ padding: '1rem' }}>Action</th>
                                            <th style={{ padding: '1rem' }}>Time</th>
                                            <th style={{ padding: '1rem' }}>Location</th>
                                            <th style={{ padding: '1rem' }}>Verification Photo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceLogs.map((log, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
                                                <td style={{ padding: '1rem' }}>{log.employee_id}</td>
                                                <td style={{ padding: '1rem' }}>{log.action}</td>
                                                <td style={{ padding: '1rem' }}>{(() => {
                                                    let iso = log.timestamp;
                                                    if (!iso.includes('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(iso)) {
                                                        iso += 'Z';
                                                    }
                                                    return new Date(iso).toLocaleString();
                                                })()}</td>
                                                <td style={{ padding: '1rem' }}>{log.location}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <img
                                                        src={`${apiUrl}/admin/photos/${log.s3_image_key}`}
                                                        alt="Capture"
                                                        style={{ width: '60px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* NEW: Comp-Off Requests Section */}
                            <div style={{ marginTop: '2.5rem', borderTop: '2px solid var(--primary)', paddingTop: '2rem' }}>
                                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Gift size={24} /> Pending Comp-Off Requests
                                </h2>
                                <p style={{ color: '#000000', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Employees who worked on weekends or holidays for more than 9 hours. Approve to credit 1 day to their balance.
                                </p>

                                {compOffRequests.length === 0 ? <p style={{ color: '#000000' }}>No pending requests.</p> : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                        {compOffRequests.map((req, i) => (
                                            <div key={i} className="card shadow-sm" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.employee_id}</div>
                                                        <div style={{ color: '#000000', fontSize: '0.875rem' }}>{new Date(req.date).toDateString()}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#ff4500', fontWeight: 'bold' }}>{req.hours} hrs</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#ff4500' }}>Worked on Holiday</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        disabled={isProcessingCompOff}
                                                        onClick={() => handleCompOffAction(req.request_id, 'Approved')}
                                                        className="btn btn-primary" style={{ flex: 1, backgroundColor: '#ff4500', color: 'white' }}
                                                    >
                                                        {isProcessingCompOff ? '...' : 'Approve Credit'}
                                                    </button>
                                                    <button
                                                        disabled={isProcessingCompOff}
                                                        onClick={() => handleCompOffAction(req.request_id, 'Rejected')}
                                                        className="btn btn-secondary" style={{ flex: 1, color: '#EF4444', borderColor: '#EF4444' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Weekend/Holiday Work Requests Section (Moved here) */}
                            <div style={{ marginTop: '2.5rem', borderTop: '2px solid #ff4500', paddingTop: '2rem' }}>
                                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CalendarDays size={24} /> Weekend/Holiday Work Requests
                                </h2>
                                <p style={{ color: '#000000', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Pre-emptive requests from employees to work on non-working days.
                                </p>

                                {weekendWorkRequests.length === 0 ? <p style={{ color: '#000000' }}>No pending work requests.</p> : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                        {weekendWorkRequests.map((req, i) => (
                                            <div key={i} className="card shadow-sm" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.employee_id}</div>
                                                        <div style={{ color: '#000000', fontSize: '0.875rem' }}>{new Date(req.date).toDateString()}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#ff4500', fontWeight: 'bold' }}>Request to Work</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#000000' }}>Reason: {req.reason || "None"}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleWeekendWorkAction(req.request_id, 'Approved')}
                                                        className="btn btn-primary" style={{ flex: 1, backgroundColor: '#ff4500' }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleWeekendWorkAction(req.request_id, 'Rejected')}
                                                        className="btn btn-secondary" style={{ flex: 1 }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            <div className="card shadow-sm" style={{ borderLeft: '4px solid #10b981', background: '#ffffff', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.25rem' }}>
                                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                    <Settings size={20} /> Global Salary Configuration
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Control which deductions are applied company-wide.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '0.85rem' }}>Enable Tax (TDS)</div>
                                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Global tax toggle</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={salarySettings.enable_tax}
                                                onChange={(e) => setSalarySettings({ ...salarySettings, enable_tax: e.target.checked })}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#000000' }}>Fixed Rate:</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={salarySettings.tax_rate}
                                                onChange={(e) => setSalarySettings({ ...salarySettings, tax_rate: parseFloat(e.target.value) })}
                                                style={{ width: '60px', padding: '0.3rem', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                                            />
                                            <span style={{ fontSize: '0.85rem', color: '#000000' }}>%</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '0.85rem' }}>Enable PF & PT</div>
                                                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Global PF toggle</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={salarySettings.enable_pf}
                                                onChange={(e) => setSalarySettings({ ...salarySettings, enable_pf: e.target.checked })}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#000000' }}>Fixed Rate:</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={salarySettings.pf_rate}
                                                onChange={(e) => setSalarySettings({ ...salarySettings, pf_rate: parseFloat(e.target.value) })}
                                                style={{ width: '60px', padding: '0.3rem', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                                            />
                                            <span style={{ fontSize: '0.85rem', color: '#000000' }}>%</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    disabled={isSavingSalarySettings}
                                    onClick={handleUpdateSalarySettings}
                                    style={{ width: 'fit-content' }}
                                >
                                    {isSavingSalarySettings ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>

                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Rocket size={24} /> Payslip Release Control
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['February 2026', 'March 2026'].map(month => {
                                        const isReleased = payrollStatus.some(p => p.month_year === month && p.released);
                                        return (
                                            <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{month}</div>
                                                    <div style={{ fontSize: '0.8rem', color: isReleased ? '#ff4500' : '#000000' }}>{isReleased ? 'Released to Employees' : 'Not yet released'}</div>
                                                </div>
                                                <button
                                                    className={`btn ${isReleased ? 'btn-secondary' : 'btn-primary'}`}
                                                    onClick={() => {
                                                        setPayslipManagerMonth(month);
                                                        setSelectedPayslipEmployees([]);
                                                        setIsPayslipManagerOpen(true);
                                                    }}
                                                >
                                                    {isReleased ? 'Manage Payslips' : 'Generate & Release Payslips'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>AI Payroll Note:</div>
                                <p style={{ fontSize: '0.875rem', margin: 0 }}>All LOP (Loss of Pay) deductions are automatically calculated based on attendance and leave records for the selected month.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB: SALARY REPORT */}
                    {activeTab === 'salary_report' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart3 size={24} /> Monthly Salary Report
                                </h2>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <select
                                        value={salaryReportMonth}
                                        onChange={(e) => setSalaryReportMonth(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                    >
                                        {['January 2026', 'February 2026', 'March 2026', 'April 2026'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <RefreshCw size={16} /> Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="table-container">
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#0f172a', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Employee</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Exp. Days</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Present</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Leaves</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Absent (LOP)</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Gross</th>
                                            <th style={{ padding: '0.4rem 0.6rem' }}>Deductions</th>
                                            <th style={{ padding: '0.4rem 0.6rem', color: '#ff4500' }}>Net Payable</th>
                                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaryReport.map((row, i) => (
                                            <tr
                                                key={i}
                                                style={{ borderBottom: '1px solid #f1f5f9', background: salaryRowMenu === i ? '#f8fafc' : 'transparent', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => { if (salaryRowMenu !== i) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={(e) => { if (salaryRowMenu !== i) e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <td style={{ padding: '0.4rem 0.6rem' }}>
                                                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{row.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{row.employee_id}</div>
                                                </td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: '#334155', fontWeight: '500' }}>{row.expected_working_days}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: '#0f172a', fontWeight: '600' }}>{row.actual_presence}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: '#6366f1', fontWeight: '600' }}>{row.leaves_taken}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: row.absent_days > 0 ? '#ef4444' : '#334155', fontWeight: '600' }}>{row.absent_days}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: '#334155' }}>₹{row.monthly_salary.toLocaleString()}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', color: '#ef4444', fontWeight: '500' }}>-₹{row.lop_deduction.toLocaleString()}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: '800', color: '#ff4500' }}>₹{row.net_salary.toLocaleString()}</td>
                                                <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', position: 'relative' }}>
                                                    <button
                                                        onClick={() => setSalaryRowMenu(salaryRowMenu === i ? null : i)}
                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {salaryRowMenu === i && (
                                                        <>
                                                            <div
                                                                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                                                onClick={() => setSalaryRowMenu(null)}
                                                            ></div>
                                                            <div style={{
                                                                position: 'absolute',
                                                                right: '100%',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                zIndex: 100,
                                                                background: '#ffffff',
                                                                border: '1px solid #e2e8f0',
                                                                padding: '0.25rem',
                                                                marginRight: '0.5rem',
                                                                textAlign: 'left',
                                                                borderRadius: '8px',
                                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                                            }}>
                                                                <button
                                                                    onClick={() => { setInspectingBankDetails(row); setSalaryRowMenu(null); }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.5rem 0.75rem',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        textAlign: 'left',
                                                                        fontSize: '0.8rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem',
                                                                        color: '#1e293b',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <Building2 size={14} /> View Bank Details
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Bank Details Modal */}
                    {inspectingBankDetails && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <div className="card shadow-sm" style={{ background: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1.5rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '12px' }}>
                                            <Building2 size={24} color="#38bdf8" />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Bank Account Profile</h3>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Employee ID: {inspectingBankDetails.employee_id}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setInspectingBankDetails(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Employee Name</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{inspectingBankDetails.name}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', marginBottom: '0.25rem' }}>BANK NAME</div>
                                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{inspectingBankDetails.bank_details?.bank_name || 'Not Provided'}</div>
                                        </div>
                                        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', marginBottom: '0.25rem' }}>PAN NUMBER</div>
                                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem', fontFamily: 'monospace' }}>{inspectingBankDetails.pan_no || 'Pending'}</div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1.25rem', background: '#eff6ff', borderRadius: '20px', border: '1px solid #dbeafe' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: '800', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <ShieldCheck size={14} /> ACCOUNT VERIFICATION
                                        </div>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700' }}>ACCOUNT NUMBER</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a', letterSpacing: '0.05em' }}>
                                                {inspectingBankDetails.bank_details?.account_number || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700' }}>IFSC CODE</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1e3a8a' }}>{inspectingBankDetails.bank_details?.ifsc_code || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setInspectingBankDetails(null)}
                                        style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', borderRadius: '16px', background: '#0f172a', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
                                    >
                                        Dismiss Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ITEMS */}
                    {activeTab === 'items' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={24} /> Item Requests ({itemRequests.length})
                            </h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#000000', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '1rem' }}>Employee ID</th>
                                        <th style={{ padding: '1rem' }}>Item</th>
                                        <th style={{ padding: '1rem' }}>Qty</th>
                                        <th style={{ padding: '1rem' }}>Reason</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#000000' }}>No item requests found.</td>
                                        </tr>
                                    ) : (
                                        itemRequests.map(req => (
                                            <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{req.employee_id}</td>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{req.item_name}</td>
                                                <td style={{ padding: '1rem' }}>{req.quantity}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', maxWidth: '200px' }}>{req.reason}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : (req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                                                        color: req.status === 'Approved' ? '#10b981' : (req.status === 'Rejected' ? '#ef4444' : '#f59e0b')
                                                    }}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    {req.status === 'Pending' ? (
                                                        (user?.role === 'hr' || user?.role === 'hr_responsible') ? (
                                                            <span style={{ fontSize: '0.8rem', color: '#000000' }}>View Only</span>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button onClick={() => handleItemAction(req.id, 'Approved')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#10b981' }}>Approve</button>
                                                                <button onClick={() => handleItemAction(req.id, 'Rejected')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}>Reject</button>
                                                            </div>
                                                        )
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: TEMPLATES */}
                    {activeTab === 'templates' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                            <h1 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={24} /> AI Document Templates
                            </h1>
                            <p style={{ color: '#000000', marginBottom: '1.25rem', fontSize: '0.9rem' }}>Train our AI on your specific company documents. Upload any PDF/HTML format and we'll convert it into a dynamic system template.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                {/* CARD 1: OFFER LETTERS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileText size={20} /> Offer Letters
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#000000', marginBottom: '0.75rem', flex: 1 }}>Upload layouts for Intern and Full-Time appointment letters.</p>

                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <select
                                            value={selectedTemplateType}
                                            onChange={(e) => setSelectedTemplateType(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                                        >
                                            <option value="Intern">Intern Format</option>
                                            <option value="Full-Time">Full-Time Format</option>
                                            <option value="Internship Certificate">Internship Certificate</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (selectedTemplateType !== 'Intern' && selectedTemplateType !== 'Full-Time') {
                                                setSelectedTemplateType('Intern');
                                            }
                                            document.getElementById('template-upload-input').click();
                                        }}
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#ff4500', fontSize: '0.8rem', padding: '0.6rem' }}
                                    >
                                        Upload Offer Template
                                    </button>
                                </div>

                                {/* CARD 2: PAYSLIPS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Banknote size={20} /> Payslip Design
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#000000', marginBottom: '0.75rem', flex: 1 }}>Train AI to recognize your payslip components and ROI investment fields.</p>

                                    <button
                                        onClick={() => {
                                            setSelectedTemplateType('Payslip');
                                            document.getElementById('template-upload-input').click();
                                        }}
                                        disabled={uploadingTemplate}
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#ff4500', fontSize: '0.8rem', padding: '0.6rem' }}
                                    >
                                        {uploadingTemplate && selectedTemplateType === 'Payslip' ? "Analyzing..." : "Upload Payslip Template"}
                                    </button>
                                </div>

                                {/* CARD 3: EXIT DOCUMENTS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <LogOut size={20} /> Exit Documents
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#000000', marginBottom: '0.75rem', flex: 1 }}>Upload professional formats for Relieving Letters and Experience Certificates.</p>

                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <select
                                            value={selectedTemplateType}
                                            onChange={(e) => setSelectedTemplateType(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                                        >
                                            <option value="Relieving">Relieving Letter</option>
                                            <option value="Experience">Experience Certificate</option>
                                            <option value="Internship Certificate">Internship Certificate</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (selectedTemplateType !== 'Relieving' && selectedTemplateType !== 'Experience') {
                                                setSelectedTemplateType('Relieving');
                                            }
                                            document.getElementById('template-upload-input').click();
                                        }}
                                        disabled={uploadingTemplate}
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#ff7a00', fontSize: '0.8rem', padding: '0.6rem' }}
                                    >
                                        {uploadingTemplate && (selectedTemplateType === 'Relieving' || selectedTemplateType === 'Experience') ? "Analyzing..." : "Upload Exit Template"}
                                    </button>
                                </div>
                            </div>

                            <input id="template-upload-input" type="file" hidden accept=".html,.pdf" onChange={handleTemplateUpload} />

                            <div className="card shadow-sm" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Active System Templates</h3>
                                {offerLetterTemplates.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#000000' }}>
                                        <div style={{ color: '#9ca3af', marginBottom: '1rem' }}><FolderOpen size={48} /></div>
                                        No templates configured yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '2rem' }}>
                                        {['Full-Time', 'Intern', 'Payslip', 'Relieving', 'Experience', 'Internship Certificate'].map(category => {
                                            const categoryTemplates = offerLetterTemplates.filter(t => t.employment_type === category);
                                            if (categoryTemplates.length === 0) return null;

                                            return (
                                                <div key={category}>
                                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#000000', letterSpacing: '0.1em', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                                        {category} Templates
                                                    </h4>
                                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                        {categoryTemplates.map((temp, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#000000' }}>{temp.employment_type} Format</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#000000' }}>
                                                                        Format: <span style={{ textTransform: 'uppercase' }}>{temp.original_type}</span> •
                                                                        Placeholders: {temp.placeholders?.length || 0} •
                                                                        Updated: {new Date(temp.updated_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button className="btn" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', border: '1px solid #e2e8f0' }} onClick={() => setPreviewActiveTemplate(temp.html_content)}>Preview</button>
                                                                    <button
                                                                        className="btn btn-danger"
                                                                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                                                                        onClick={() => handleDeleteTemplate(temp.employment_type)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* TEMPLATE ANALYSIS MODAL */}
                    {
                        templateAnalysis && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '2rem' }}>
                                <div className="card shadow-2xl" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ff7a00', background: '#ffffff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BrainCircuit size={28} color="var(--primary)" /> AI Analysis Complete</h2>
                                            <p style={{ fontSize: '0.8rem', color: '#000000', margin: '0.5rem 0 0' }}>We've scanned your {selectedTemplateType} template and extracted the logic.</p>
                                        </div>
                                        <button className="btn" onClick={() => setTemplateAnalysis(null)}>✕</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div style={{ padding: '1.5rem', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                                <h3 style={{ fontSize: '1rem', color: '#ff4500', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Tag size={18} /> Detected Placeholders
                                                </h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {templateAnalysis.placeholders?.map(p => (
                                                        <span key={p} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', color: '#1f2937', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                            {`{{${p}}}`}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#000000', marginTop: '1rem' }}>
                                                    * These markers will be replaced with real employee data during generation.
                                                </p>
                                            </div>

                                            {templateAnalysis.roi_fields?.length > 0 && (
                                                <div style={{ padding: '1.5rem', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                                                    <h3 style={{ fontSize: '1rem', color: '#ff4500', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Banknote size={18} /> ROI / Investment Fields Found
                                                    </h3>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {templateAnalysis.roi_fields.map(field => (
                                                            <span key={field} style={{ padding: '0.4rem 0.8rem', background: '#d1fae5', color: '#065f46', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid #ff4500' }}>
                                                                {field} detected
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: '#000000', marginTop: '1rem' }}>
                                                        * These fields are mapped to automated tax and payroll processing.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                                            <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#000000', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Monitor size={14} /> LIVE HTML PREVIEW</span>
                                                <span style={{ fontSize: '0.6rem', color: '#ff4500' }}>● Responsive AI Layout</span>
                                            </div>
                                            <div style={{ padding: '0px', height: '450px', background: '#fff' }}>
                                                {templateAnalysis.html_template ? (
                                                    <iframe
                                                        srcDoc={templateAnalysis.html_template}
                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                        title="AI Template Preview"
                                                    />
                                                ) : (
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#000000' }}>
                                                        No HTML preview generated for this file type.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                        <button className="btn btn-secondary" onClick={() => setTemplateAnalysis(null)}>Discard</button>
                                        <button
                                            className="btn btn-primary"
                                            style={{ background: '#ff7a00', padding: '0.75rem 2rem' }}
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`${apiUrl}/admin/templates/upload`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            employment_type: selectedTemplateType,
                                                            html_template: templateAnalysis.html_template,
                                                            placeholders: templateAnalysis.placeholders || [],
                                                            roi_fields: templateAnalysis.roi_fields || [],
                                                            original_type: templateAnalysis.original_type || 'html'
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        alert(`Template for ${selectedTemplateType} saved successfully!`);
                                                        setTemplateAnalysis(null);
                                                        fetchData();
                                                    } else {
                                                        alert('Failed to save template: ' + (data.error || 'Unknown error'));
                                                    }
                                                } catch (err) {
                                                    console.error("Save Error:", err);
                                                    alert("Failed to connect to server during save.");
                                                }
                                            }}
                                        >
                                            <CheckCircle2 size={18} /> Confirm & Save Template
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* ACTIVE TEMPLATE PREVIEW MODAL */}
                    {
                        previewActiveTemplate && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '1rem' }}>
                                <div className="card shadow-2xl" style={{ width: '95vw', maxWidth: '1600px', height: '95vh', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye size={20} /> Template Preview</h2>
                                        <button className="btn" onClick={() => setPreviewActiveTemplate(null)}>✕</button>
                                    </div>
                                    <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', minHeight: 0 }}>
                                        <iframe
                                            srcDoc={previewActiveTemplate}
                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                            title="Active Template Preview"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* TAB: ANNOUNCEMENTS */}
                    {activeTab === 'announcements' && (
                        <div className="card shadow-sm" style={{ gridColumn: 'span 3', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Megaphone size={24} /> Manage System Announcements</h2>
                            <p style={{ color: '#000000', marginBottom: '1.5rem' }}>This message will be visible to all employees in their Engage module.</p>

                            <form onSubmit={handleUpdateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#000000' }}>Announcement Title</label>
                                    <input
                                        type="text"
                                        value={announcementMsg.title}
                                        onChange={(e) => setAnnouncementMsg({ ...announcementMsg, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1f2937' }}
                                        placeholder="e.g. Essential Office Guidelines"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#000000' }}>Content</label>
                                    <textarea
                                        rows="6"
                                        value={announcementMsg.content}
                                        onChange={(e) => setAnnouncementMsg({ ...announcementMsg, content: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1f2937', lineHeight: '1.5' }}
                                        placeholder="Type the announcement content here..."
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>Update Announcement</button>
                            </form>
                        </div>
                    )}

                    {/* TAB: HISTORICAL DOCS */}
                    {activeTab === 'historical_docs' && (
                        <div style={{ gridColumn: 'span 3' }}>
                            <HistoricalDocGenerator apiUrl={apiUrl} />
                        </div>
                    )}
                    {/* --- MODALS --- */}

                    {/* MODAL: OFFER LETTER */}
                    {isOfferLetterModalOpen && viewedEmp && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, padding: '2rem' }}>
                            <div className="card shadow-2xl" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} /> Preview Offer Letter</h2>
                                    <button className="btn" onClick={() => setIsOfferLetterModalOpen(false)}>✕</button>
                                </div>
                                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', minHeight: '400px', marginBottom: '1.5rem' }}>
                                    <iframe srcDoc={offerLetterPreview} style={{ width: '100%', height: '500px', border: 'none' }} title="Offer Letter Preview" />
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                    <button className="btn btn-secondary" onClick={() => setIsOfferLetterModalOpen(false)}>Cancel</button>
                                    <button className="btn btn-primary" style={{ backgroundColor: '#ff4500' }} disabled={viewedEmp.offer_letter_status !== 'draft'} onClick={() => handleFinalizeOfferLetter(viewedEmp.employee_id)}>
                                        <CheckCircle2 size={18} /> Approve & Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: RELIEVING LETTER & EXPERIENCE CERTIFICATE */}
                    {isRelievingLetterModalOpen && (
                        <div className="modal-overlay" style={{ zIndex: 3000 }}>
                            <div className="modal-content shadow-2xl" style={{ maxWidth: '1000px', width: '95%', maxHeight: '95vh', overflowY: 'auto', background: '#ffffff', border: '1px solid var(--border-color)', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title">📄 Exit Documents</h2>
                                    <button className="btn" onClick={() => setIsRelievingLetterModalOpen(false)}>✕</button>
                                </div>

                                <div className="grid-2" style={{ gap: '1.5rem' }}>
                                    {/* Relieving Letter Section */}
                                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', background: '#fff9f5' }}>
                                        <h3 style={{ fontSize: '1rem', color: '#ff4500', marginBottom: '1rem' }}>1. Relieving Letter</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem' }}>Joining</label>
                                                <input type="date" value={relievingLetterParams.joining_date} onChange={e => setRelievingLetterParams({ ...relievingLetterParams, joining_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem' }}>Relieving</label>
                                                <input type="date" value={relievingLetterParams.relieving_date} onChange={e => setRelievingLetterParams({ ...relievingLetterParams, relieving_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%', background: '#10b981' }} onClick={() => handleGenerateRelievingLetter(selectedApprovedEmp.employee_id)}>Generate Draft</button>
                                    </div>

                                    {/* Experience Certificate Section */}
                                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', background: '#f0f9ff' }}>
                                        <h3 style={{ fontSize: '1rem', color: '#ff4500', marginBottom: '1rem' }}>2. Experience Certificate</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem' }}>Issue Date</label>
                                                <input type="date" value={experienceCertificateParams.issue_date} onChange={e => setExperienceCertificateParams({ ...experienceCertificateParams, issue_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem' }}>Grade</label>
                                                <select value={experienceCertificateParams.performance_summary} onChange={e => setExperienceCertificateParams({ ...experienceCertificateParams, performance_summary: e.target.value })} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                    <option>Outstanding</option><option>Excellent</option><option>Good</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%', background: '#ff4500' }} onClick={() => handleGenerateExperienceCertificate(selectedApprovedEmp.employee_id)}>Generate Draft</button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                    <button className="btn btn-secondary" onClick={() => setIsRelievingLetterModalOpen(false)}>Close Window</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: PAYSLIP MANAGER */}
                    {isPayslipManagerOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div className="card shadow-2xl" style={{ width: '100%', maxWidth: '800px', background: '#ffffff', border: '1px solid var(--border-color)', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title">Release Payslips ({payslipManagerMonth})</h2>
                                    <button className="btn" onClick={() => setIsPayslipManagerOpen(false)}>✕</button>
                                </div>

                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', background: '#f8fafc' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: '#f1f5f9' }}>
                                            <tr>
                                                <th style={{ padding: '0.75rem', textAlign: 'left' }}><input type="checkbox" onChange={e => setSelectedPayslipEmployees(e.target.checked ? approvedEmployees.map(x => x.employee_id) : [])} /></th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Employee</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {approvedEmployees.map(emp => (
                                                <tr key={emp.employee_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.75rem' }}><input type="checkbox" checked={selectedPayslipEmployees.includes(emp.employee_id)} onChange={e => setSelectedPayslipEmployees(e.target.checked ? [...selectedPayslipEmployees, emp.employee_id] : selectedPayslipEmployees.filter(id => id !== emp.employee_id))} /></td>
                                                    <td style={{ padding: '0.75rem' }}>{emp.name} ({emp.employee_id})</td>
                                                    <td style={{ padding: '0.75rem' }}>Ready</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button className="btn btn-secondary" onClick={() => setIsPayslipManagerOpen(false)}>Cancel</button>
                                    <button className="btn btn-primary" style={{ background: '#ff4500' }} disabled={isBatchSending || selectedPayslipEmployees.length === 0} onClick={async () => {
                                        setIsBatchSending(true);
                                        try {
                                            for (const id of selectedPayslipEmployees) {
                                                const emp = approvedEmployees.find(e => e.employee_id === id);
                                                await fetch(`${apiUrl}/enhanced-docs/generate`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ employee_id: id, doc_type: 'payslip', roi_data: { emp_name: emp.name, month_year: payslipManagerMonth, gross_salary: emp.monthly_salary || 50000, net_salary: emp.monthly_salary ? emp.monthly_salary - 200 : 49800 } })
                                                });
                                            }
                                            alert('Successfully generated and sent payslips!');
                                        } catch (err) { alert('Failed to send some payslips.'); }
                                        finally { setIsBatchSending(false); setIsPayslipManagerOpen(false); fetchData(); }
                                    }}>
                                        {isBatchSending ? 'Sending...' : 'Generate & Send Selected'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DocumentGeneratorModal isOpen={isDocGenModalOpen} onClose={() => setIsDocGenModalOpen(false)} apiUrl={apiUrl} docType={docGenType} initialData={docGenInitialData} employee={docGenEmployee} />
                    <EnhancedDocumentGenerator isOpen={isEnhancedDocGenOpen} onClose={() => setIsEnhancedDocGenOpen(false)} apiUrl={apiUrl} />

                    {/* MODAL: ADD EMPLOYEE */}
                    {isAddEmpModalOpen && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                            <div className="card shadow-2xl" style={{ width: '100%', maxWidth: '600px', background: '#ffffff', borderRadius: '16px', padding: '2.5rem' }}>
                                <h2 className="card-title">Add New Employee</h2>
                                <div className="grid-2" style={{ gap: '1.25rem', margin: '2rem 0' }}>
                                    <div><label style={{ fontSize: '0.8rem' }}>Full Name</label><input className="premium-input" value={addEmpForm.name} onChange={e => setAddEmpForm({ ...addEmpForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                                    <div><label style={{ fontSize: '0.8rem' }}>Personal Email</label><input className="premium-input" value={addEmpForm.email} onChange={e => setAddEmpForm({ ...addEmpForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                                    <div><label style={{ fontSize: '0.8rem' }}>Password</label><input type="password" value={addEmpForm.password} onChange={e => setAddEmpForm({ ...addEmpForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button className="btn btn-secondary" onClick={() => setIsAddEmpModalOpen(false)}>Cancel</button>
                                    <button className="btn btn-primary" style={{ background: '#ff4500' }} onClick={handleAddEmployee}>Create Employee</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: BANK DETAILS */}
                    {inspectingBankDetails && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000 }}>
                            <div className="card shadow-2xl" style={{ width: '100%', maxWidth: '450px', background: '#ffffff', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title">Bank Details</h2>
                                    <button className="btn" onClick={() => setInspectingBankDetails(null)}>✕</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Account Holder</div>
                                        <div style={{ fontWeight: 700 }}>{inspectingBankDetails.name}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Bank Name</div>
                                        <div style={{ fontWeight: 700 }}>{inspectingBankDetails.bank_details?.bank_name || 'N/A'}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Account Number</div>
                                        <div style={{ fontWeight: 700 }}>{inspectingBankDetails.bank_details?.account_number || 'N/A'}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>IFSC Code</div>
                                        <div style={{ fontWeight: 700 }}>{inspectingBankDetails.bank_details?.ifsc_code || 'N/A'}</div>
                                    </div>
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setInspectingBankDetails(null)}>Close</button>
                            </div>
                        </div>
                    )}

                    {/* Final closure */}
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
