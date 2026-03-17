import React, { useState, useEffect } from 'react';
import DocumentGeneratorModal from '../components/DocumentGeneratorModal';
import EnhancedDocumentGenerator from '../components/EnhancedDocumentGenerator';
import { PLACEHOLDER_IMAGE } from '../utils';

const AdminDashboard = ({ activeTab, user }) => {
    const isSuperAdmin = user?.role === 'super_admin';
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
        bank_account: ''
    });
    const [workdayOverrides, setWorkdayOverrides] = useState([]);
    const [compOffRequests, setCompOffRequests] = useState([]);
    const [weekendWorkRequests, setWeekendWorkRequests] = useState([]);
    const [isProcessingCompOff, setIsProcessingCompOff] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'onboarding') {
                const res = await fetch(`${apiUrl}/auth/admin/pending`);
                const data = await res.json();
                setPendingEmployees(data.employees || []);
                setViewedEmp(prev => prev && data.employees?.some(e => e.employee_id === prev.employee_id) ? data.employees.find(e => e.employee_id === prev.employee_id) : null);
            } else if (activeTab === 'employees') {
                const res = await fetch(`${apiUrl}/auth/admin/employees`);
                const data = await res.json();
                setApprovedEmployees(data.employees || []);
            } else if (activeTab === 'items') {
                const res = await fetch(`${apiUrl}/admin/items/all`);
                const data = await res.json();
                setItemRequests(data.requests || []);
            } else if (activeTab === 'leaves') {
                const res = await fetch(`${apiUrl}/admin/leaves`);
                const data = await res.json();
                setLeaves(data.leaves || []);
            } else if (activeTab === 'holidays') {
                const res = await fetch(`${apiUrl}/admin/holidays`);
                const data = await res.json();
                setHolidays(data.holidays || []);
                const oRes = await fetch(`${apiUrl}/admin/workday-overrides`);
                const oData = await oRes.json();
                setWorkdayOverrides(oData.overrides || []);
            } else if (activeTab === 'reports') {
                const res = await fetch(`${apiUrl}/admin/reports`);
                const data = await res.json();
                setReports(data);
            } else if (activeTab === 'notifications') {
                const res = await fetch(`${apiUrl}/admin/notifications`);
                const data = await res.json();
                setNotifications(data.notifications || []);
            } else if (activeTab === 'attendance') {
                const res = await fetch(`${apiUrl}/admin/attendance`);
                const data = await res.json();
                setAttendanceLogs(data.logs || []);
                const cRes = await fetch(`${apiUrl}/admin/comp-off-requests`);
                const cData = await cRes.json();
                setCompOffRequests(cData.requests || []);
                const wwRes = await fetch(`${apiUrl}/admin/weekend-work/requests`);
                if (wwRes.ok) {
                    const wwData = await wwRes.json();
                    setWeekendWorkRequests(wwData.requests || []);
                }
            } else if (activeTab === 'payroll') {
                const res = await fetch(`${apiUrl}/admin/payslips/status`);
                const data = await res.json();
                setPayrollStatus(data.releases || []);
            } else if (activeTab === 'announcements') {
                const res = await fetch(`${apiUrl}/announcement`);
                const data = await res.json();
                setAnnouncementMsg(data);
            } else if (activeTab === 'salary_report') {
                const res = await fetch(`${apiUrl}/admin/salary-report/${salaryReportMonth}`);
                const data = await res.json();
                setSalaryReport(data.report || []);
            } else if (activeTab === 'templates') {
                const res = await fetch(`${apiUrl}/admin/templates`);
                const data = await res.json();
                setOfferLetterTemplates(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

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
                    internship_end_date: empRoleSetup.internship_end_date || null
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
                    in_hand_salary: parseInt(empRoleSetup.in_hand_salary || 0)
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
            if (editingHoliday) {
                const response = await fetch(`${apiUrl}/admin/holidays/${editingHoliday.originalDate}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newHoliday)
                });
                if (response.ok) {
                    setHolidays(prev => prev.map(h => h.date === editingHoliday.originalDate ? { ...newHoliday } : h));
                    setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
                    setEditingHoliday(null);
                }
            } else {
                const response = await fetch(`${apiUrl}/admin/holidays`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newHoliday)
                });
                if (response.ok) {
                    const data = await response.json();
                    setHolidays(prev => [...prev, data.record]);
                    setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
                }
            }
        } catch (err) {
            console.error("Error saving holiday: ", err);
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

    const handleDeleteTemplate = async (type) => {
        if (!window.confirm(`Delete template for ${type}?`)) return;
        try {
            const res = await fetch(`${apiUrl}/admin/templates/${type}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            alert(data.message);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const DocPreviewModal = ({ doc, onClose }) => {
        if (!doc) return null;
        return (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', position: 'relative', maxWidth: '900px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#6b7280', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    <h3 style={{ marginBottom: '1.5rem', color: '#111827', fontWeight: 'bold' }}>{doc.title}</h3>
                    <div style={{ overflow: 'auto', flex: 1, display: 'flex', justifyContent: 'center' }}>
                        {doc.url.toLowerCase().endsWith('.pdf') ? (
                            <iframe src={doc.url} style={{ width: '100%', height: '70vh', border: 'none' }} title="PDF Preview"></iframe>
                        ) : (
                            <img src={doc.url} alt="Document" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #eee' }} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-dashboard">
            <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSuperAdmin ? '🛡️ Super Admin' : '🛡️ Admin'} - {activeTab === 'onboarding' && '📋 Pending Approvals'}
                {activeTab === 'employees' && '👥 Employee Directory'}
                {activeTab === 'leaves' && '🌴 Leave Management'}
                {activeTab === 'holidays' && '📅 Holiday Calendar'}
                {activeTab === 'reports' && '📊 Company Reports'}
                {activeTab === 'notifications' && '🔔 Admin Notifications'}
                {activeTab === 'attendance' && '📸 Attendance Logs'}
            </h1>

            {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading data...</p>}

            {!loading && (
                <div className="grid-3">

                    {/* TAB: ONBOARDING */}
                    {activeTab === 'onboarding' && (
                        <>
                            <div className="card glass-panel" style={{ gridColumn: 'span 1' }}>
                                <h2 className="card-title">Pending ({pendingEmployees.length})</h2>
                                {pendingEmployees.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(10, 102, 194, 0.05)', borderRadius: '8px', border: '1px dashed #0a66c2' }}>
                                        <span style={{ fontSize: '2rem' }}>🎉</span><p style={{ color: '#0a66c2', marginTop: '0.5rem' }}>All caught up!</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                                        {pendingEmployees.map(emp => (
                                            <div key={emp.employee_id} onClick={() => setViewedEmp(emp)} style={{ padding: '1rem', backgroundColor: viewedEmp?.employee_id === emp.employee_id ? 'rgba(79, 70, 229, 0.2)' : '#ffffff', border: `1px solid ${viewedEmp?.employee_id === emp.employee_id ? '#ff7a00' : '#E5E7EB'}`, borderRadius: '8px', cursor: 'pointer' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{emp.employee_id}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card" style={{ gridColumn: 'span 2' }}>
                                <h2 className="card-title">Employee Details</h2>
                                {viewedEmp ? (
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: '#6b7280', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Personal Information</h3>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Name:</strong> {viewedEmp.name}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Email:</strong> {viewedEmp.email}</div>
                                                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>DOB:</strong> {viewedEmp.dob}</div>

                                                <h3 style={{ fontSize: '1rem', color: '#6b7280', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Experience</h3>
                                                {viewedEmp.is_experienced ? (
                                                    <>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Prev Company:</strong> {viewedEmp.experience?.prev_company}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Role:</strong> {viewedEmp.experience?.prev_role}</div>
                                                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}><strong>Years:</strong> {viewedEmp.experience?.years}</div>
                                                    </>
                                                ) : <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fresher</div>}
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: '#6b7280', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Documents & Photos</h3>

                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Live Face Capture:</div>
                                                    <img
                                                        src={`${apiUrl}/admin/photos/${viewedEmp.reference_image_key}`}
                                                        alt="Face"
                                                        style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E5E7EB', background: '#ffffff' }}
                                                        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Bank Photo:</div>
                                                        <img
                                                            src={`${apiUrl}/admin/photos/${viewedEmp.bank_details?.bank_photo_key}`}
                                                            alt="Bank"
                                                            style={{ width: '100%', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                                            onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Education Cert:</div>
                                                        <img
                                                            src={`${apiUrl}/admin/photos/${viewedEmp.education?.cert_key}`}
                                                            alt="Education"
                                                            style={{ width: '100%', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ff7a00', marginBottom: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1rem', color: '#ff7a00', marginBottom: '1rem' }}>⚙️ Role & Position Setup</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Employment Type</label>
                                                    <select
                                                        value={empRoleSetup.employment_type}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                    >
                                                        <option value="Full-Time">Full-Time</option>
                                                        <option value="Intern">Intern</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Designation / Position</label>
                                                    <input
                                                        type="text"
                                                        value={empRoleSetup.position}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })}
                                                        placeholder="e.g. Frontend Developer"
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                    />
                                                </div>
                                                {empRoleSetup.employment_type === 'Intern' && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#ff7a00', display: 'block', marginBottom: '0.25rem' }}>Internship End Date</label>
                                                        <input
                                                            type="date"
                                                            value={empRoleSetup.internship_end_date}
                                                            onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, internship_end_date: e.target.value })}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ff7a00', background: '#ffffff', color: '#1f2937' }}
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>In-hand Salary (₹) - Priority Display</label>
                                                    <input
                                                        type="number"
                                                        value={empRoleSetup.in_hand_salary}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, in_hand_salary: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', fontWeight: 'bold', borderColor: '#ff7a00' }}
                                                    />
                                                </div>
                                                {isSuperAdmin && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Assign Role (Super Admin Only)</label>
                                                        <select
                                                            value={empRoleSetup.role}
                                                            onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, role: e.target.value })}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ff7a00', background: '#ffffff', color: '#1f2937' }}
                                                        >
                                                            <option value="employee">Employee</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="hr_responsible">HR Responsibility</option>
                                                        </select>
                                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>* Only Super Admin can promote/demote staff roles.</div>
                                                    </div>
                                                )}

                                                <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.85rem', color: '#ff7a00', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>🎁 Monthly Leave Accrual Rate (days/month)</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Privilege</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Sick</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Casual</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                disabled={empRoleSetup.employment_type === 'Intern'}
                                                                value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate}
                                                                onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                            />
                                                        </div>
                                                    </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>PAN Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.pan_no}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pan_no: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>PF Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.pf_no}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_no: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.bank_name}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Bank Account Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.bank_account}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_account: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                                    {empRoleSetup.employment_type === 'Intern' && (
                                                        <div style={{ fontSize: '0.7rem', color: '#c84cff', marginTop: '0.5rem' }}>* Interns have zero paid leaves as per policy (GreytHR guidelines).</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'reject')} className="btn btn-secondary" style={{ color: '#EF4444', borderColor: '#EF4444' }}>Reject Application</button>

                                            <button
                                                onClick={() => {
                                                    const isIntern = empRoleSetup.employment_type === 'Intern';
                                                    setDocGenType(isIntern ? 'internship_offer' : 'full_time_offer');
                                                    setDocGenEmployee(viewedEmp);
                                                    setDocGenInitialData({
                                                        emp_name: viewedEmp.name,
                                                        employee_id: viewedEmp.employee_id,
                                                        designation: empRoleSetup.position || (isIntern ? 'Full Stack Intern' : 'Software Engineer'),
                                                        role: empRoleSetup.position || 'Full Stack Intern',
                                                        doj: new Date().toISOString().split('T')[0],
                                                        date: new Date().toISOString().split('T')[0],
                                                        offer_date: new Date().toISOString().split('T')[0],
                                                        total_ctc_annual: empRoleSetup.monthly_salary ? empRoleSetup.monthly_salary * 12 : 0,
                                                        fixed_ctc_annual: empRoleSetup.monthly_salary ? empRoleSetup.monthly_salary * 12 : 0,
                                                        inhand_amount: empRoleSetup.monthly_salary || 0,
                                                        annual_basic: empRoleSetup.monthly_salary ? Math.round((empRoleSetup.monthly_salary * 12) * 0.4) : 0,
                                                        monthly_basic: empRoleSetup.monthly_salary ? Math.round(empRoleSetup.monthly_salary * 0.4) : 0
                                                    });
                                                    setIsDocGenModalOpen(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                            >
                                                ✨ AI Generate Offer Letter
                                            </button>

                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'approve')} className="btn btn-primary" style={{ backgroundColor: '#0a66c2', fontWeight: 'bold' }}>✅ Approve Onboarding (No Offer Letter Needed)</button>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>* You can approve an application immediately without generating an offer letter.</div>
                                    </div>
                                ) : <div style={{ color: '#6b7280', textAlign: 'center' }}>Select an employee to review.</div>}
                            </div>
                        </>
                    )}

                    {/* TAB: EMPLOYEES */}
                    {activeTab === 'employees' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2 className="card-title">Employee Directory ({approvedEmployees.length})</h2>
                                <button
                                    onClick={() => setIsEnhancedDocGenOpen(true)}
                                    className="btn btn-primary"
                                    style={{ 
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: '600'
                                    }}
                                >
                                    📄 Enhanced Document Generator
                                </button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6b7280' }}>
                                        <th style={{ padding: '1rem' }}>Photo</th>
                                        <th style={{ padding: '1rem' }}>ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Email</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
                                        <th style={{ padding: '1rem' }}>Documents</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedEmployees.map(emp => (
                                        <tr
                                            key={emp.employee_id}
                                            onClick={() => {
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
                                                    bank_account: emp.bank_details?.account_number || ''
                                                });
                                            }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selectedApprovedEmp?.employee_id === emp.employee_id ? 'rgba(79, 70, 229, 0.1)' : 'transparent' }}
                                        >
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <img
                                                    src={`${apiUrl}/admin/photos/${emp.reference_image_key}`}
                                                    alt=""
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB' }}
                                                    onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{emp.employee_id}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                                            <td style={{ padding: '1rem', color: '#6b7280' }}>{emp.email}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(10, 102, 194, 0.2)', color: '#0a66c2', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span></td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setPreviewDoc({ title: 'Bank Details', url: `${apiUrl}/admin/photos/${emp.bank_details?.bank_photo_key}` }); }} 
                                                        className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                    >🏦 Bank</button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setPreviewDoc({ title: 'Education Cert', url: `${apiUrl}/admin/photos/${emp.education?.cert_key}` }); }} 
                                                        className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                    >🎓 Edu</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {selectedApprovedEmp && (
                                <div className="card glass-panel" style={{ marginTop: '2rem', borderTop: '2px solid #ff7a00' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', color: '#1f2937' }}>✏️ Edit Profile: {selectedApprovedEmp.name}</h3>
                                        <button onClick={() => setSelectedApprovedEmp(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>✕ Close</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        {/* Same role setup fields as onboarding */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Employment Type</label>
                                                <select
                                                    value={empRoleSetup.employment_type}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, employment_type: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                >
                                                    <option>Full-Time</option>
                                                    <option>Intern</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Designation / Position</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.position}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, position: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Monthly Gross Salary (₹)</label>
                                                <input
                                                    type="number"
                                                    value={empRoleSetup.monthly_salary}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>In-hand Salary (₹) - Overrides calculations if set</label>
                                                <input
                                                    type="number"
                                                    value={empRoleSetup.in_hand_salary}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, in_hand_salary: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', fontWeight: 'bold', borderColor: '#ff7a00' }}
                                                />
                                            </div>
                                        </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>PAN Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.pan_no}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pan_no: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>PF Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.pf_no}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, pf_no: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Bank Name</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.bank_name}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Bank Account Number</label>
                                                <input
                                                    type="text"
                                                    value={empRoleSetup.bank_account}
                                                    onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, bank_account: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                />
                                            </div>

                                        <div>
                                            <label style={{ fontSize: '0.85rem', color: '#ff7a00', fontWeight: 'bold', display: 'block', marginBottom: '0.75rem' }}>🎁 Monthly Leave Accrual Rate (days/month)</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Privilege</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.privilege_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, privilege_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Sick</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.sick_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, sick_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Casual</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        disabled={empRoleSetup.employment_type === 'Intern'}
                                                        value={empRoleSetup.employment_type === 'Intern' ? 0 : empRoleSetup.casual_leave_rate}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, casual_leave_rate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', opacity: empRoleSetup.employment_type === 'Intern' ? 0.5 : 1 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setSelectedApprovedEmp(null)} className="btn btn-secondary">Cancel</button>
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
                                            style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                        >
                                            ✨ AI Relieving Letter
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
                                            style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                        >
                                            ✨ AI Experience Cert
                                        </button>
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
                                            style={{ color: '#10B981', borderColor: '#10B981' }}
                                        >
                                            💰 AI Payslip
                                        </button>
                                        <button onClick={() => handleUpdateEmployee(selectedApprovedEmp.employee_id)} className="btn btn-primary" style={{ backgroundColor: '#0a66c2' }}>Save Profile Changes</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: LEAVES */}
                    {activeTab === 'leaves' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Leave Requests</h2>
                            {leaves.length === 0 ? <p style={{ color: '#6b7280' }}>No leaves found (Try applying from Employee view).</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {leaves.map((l, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', background: '#ffffff' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{l.leave_type} - {l.employee_id}</div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{l.start_date} to {l.end_date}</div>
                                                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontStyle: 'italic' }}>{l.reason}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: l.status.includes('Approved') ? '#0a66c2' : '#c84cff' }}>{l.status}</span>
                                                {l.status.includes('Pending') && (
                                                    user?.role === 'hr_responsible' ? (
                                                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>View Only</span>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleLeaveStatus(l.id, 'Rejected')} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Reject</button>
                                                            <button onClick={() => handleLeaveStatus(l.id, 'Approved by Admin')} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#0a66c2' }}>Approve</button>
                                                        </>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: HOLIDAYS */}
                    {activeTab === 'holidays' && (
                        <>
                            <div className="card" style={{ gridColumn: 'span 1' }}>
                                <h2 className="card-title">{editingHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
                                <form onSubmit={submitHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.875rem' }}>Holiday Name</label><input required type="text" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Date</label><input required type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }} /></div>
                                    <div><label style={{ fontSize: '0.875rem' }}>Type</label><select required value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: 'none' }}><option>Public Holiday</option><option>Optional Holiday</option></select></div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingHoliday ? "Save Changes" : "Add Holiday"}</button>
                                        {editingHoliday && (
                                            <button type="button" className="btn btn-secondary" onClick={() => { setEditingHoliday(null); setNewHoliday({ name: '', date: '', type: 'Public Holiday' }); }} style={{ flex: 1 }}>Cancel</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 className="card-title" style={{ margin: 0 }}>Holiday Calendar</h2>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <button className="btn btn-secondary" onClick={() => {
                                            if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                                            else setCalMonth(calMonth - 1);
                                        }}>◀</button>
                                        <div style={{ fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
                                            {new Date(calYear, calMonth).toLocaleString('default', { month: 'long' })} {calYear}
                                        </div>
                                        <button className="btn btn-secondary" onClick={() => {
                                            if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                                            else setCalMonth(calMonth + 1);
                                        }}>▶</button>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                                </div>
                                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#E5E7EB', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                                        <div key={`empty-${i}`} style={{ padding: '2.5rem', background: '#F9FAFB' }}></div>
                                    ))}
                                    {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayHolidays = holidays.filter(h => h.date === dateStr);
                                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                                        
                                        return (
                                            <div key={day} style={{ 
                                                minHeight: '120px', 
                                                padding: '0.75rem', 
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
                                                    fontWeight: '800', 
                                                    marginBottom: '0.75rem', 
                                                    color: isToday ? '#0a66c2' : '#9ca3af',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {isToday && <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '8px', height: '8px', background: '#0a66c2', borderRadius: '50%' }}></span>}
                                                    {day}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                                    {dayHolidays.map((h, hi) => (
                                                        <div key={hi} style={{ 
                                                            fontSize: '0.7rem', 
                                                            background: h.type === 'Public Holiday' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                                                            color: h.type === 'Public Holiday' ? '#EF4444' : '#F59E0B', 
                                                            padding: '0.4rem 0.6rem', 
                                                            borderRadius: '6px',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            border: `1px solid ${h.type === 'Public Holiday' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                                                            fontWeight: '600'
                                                        }} onClick={() => handleEditClick(h)} title="Click to Edit">
                                                            {h.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Workday Overrides / Holiday Swapping */}
                            <div className="card glass-panel" style={{ marginTop: '2rem' }}>
                                <h2 className="card-title">🔄 Holiday Swapping & Workday Overrides</h2>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Force a specific date to be a **Working Day** (e.g., for deadlines) or a **Holiday** (e.g., as a substitute for a worked holiday).
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <input type="date" id="override-date" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', width: '200px' }} />
                                    <select id="override-type" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', width: '200px' }}>
                                        <option value="forced_working">Mark as Working Day</option>
                                        <option value="forced_holiday">Mark as Holiday</option>
                                    </select>
                                    <input type="text" id="override-reason" placeholder="Reason (e.g., Ugadi Swap)" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', flex: 1 }} />
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: '#ff7a00' }}
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
                                        <div key={i} style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: ov.type === 'forced_working' ? '#0a66c2' : '#ff7a00' }}>
                                                    {ov.type === 'forced_working' ? '💼 Forced Working' : '🎉 Forced Holiday'}
                                                </div>
                                                <div style={{ fontSize: '0.875rem' }}>{ov.date} {ov.reason && `(${ov.reason})`}</div>
                                            </div>
                                            <button onClick={() => handleDeleteOverride(ov.date)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB: REPORTS */}
                    {activeTab === 'reports' && reports && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Company Health Data</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff7a00' }}>{reports.total_employees}</div>
                                    <div style={{ color: '#6b7280' }}>Total Employees</div>
                                </div>
                                <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0a66c2' }}>{reports.present_today}</div>
                                    <div style={{ color: '#6b7280' }}>Present Today</div>
                                </div>
                                <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c84cff' }}>{reports.on_leave}</div>
                                    <div style={{ color: '#6b7280' }}>On Leave</div>
                                </div>
                                <div style={{ padding: '2rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff7a00' }}>{reports.average_engagement_score}%</div>
                                    <div style={{ color: '#6b7280' }}>Engagement</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed #E5E7EB', borderRadius: '8px', textAlign: 'center', color: '#6b7280' }}>
                                <span style={{ fontSize: '2rem' }}>📊</span>
                                <p style={{ marginTop: '1rem' }}>Deep integrations for Data visualization can be powered by AI Analytics Agent soon.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB: NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Latest Updates</h2>
                            {notifications.length === 0 ? <p>No new notifications.</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {notifications.map((n, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: '600', color: '#ff7a00', marginRight: '1rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>{n.type}</span>
                                                <span>{n.message}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(n.created_at).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: ATTENDANCE LOGS */}
                    {activeTab === 'attendance' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Global Attendance History</h2>
                            {/* ... existing table code ... */}
                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {/* TABLE REMOVED FOR BREVITY IN CHUNK BUT IT SHOULD BE THERE */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6b7280', fontSize: '0.875rem' }}>
                                            <th style={{ padding: '1rem' }}>Employee</th>
                                            <th style={{ padding: '1rem' }}>Action</th>
                                            <th style={{ padding: '1rem' }}>Time</th>
                                            <th style={{ padding: '1rem' }}>Location</th>
                                            <th style={{ padding: '1rem' }}>Verification Photo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceLogs.map((log, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #E5E7EB', fontSize: '0.875rem' }}>
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
                                                        style={{ width: '60px', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* NEW: Comp-Off Requests Section */}
                            <div style={{ marginTop: '2.5rem', borderTop: '2px solid #ff7a00', paddingTop: '2rem' }}>
                                <h2 className="card-title">🎁 Pending Comp-Off Requests</h2>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Employees who worked on weekends or holidays for more than 9 hours. Approve to credit 1 day to their balance.
                                </p>

                                {compOffRequests.length === 0 ? <p style={{ color: '#9CA3AF' }}>No pending requests.</p> : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                        {compOffRequests.map((req, i) => (
                                            <div key={i} style={{ padding: '1.5rem', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.employee_id}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{new Date(req.date).toDateString()}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#0a66c2', fontWeight: 'bold' }}>{req.hours} hrs</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#10B981' }}>Worked on Holiday</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        disabled={isProcessingCompOff}
                                                        onClick={() => handleCompOffAction(req.request_id, 'Approved')}
                                                        className="btn btn-primary" style={{ flex: 1, backgroundColor: '#10B981' }}
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
                            <div style={{ marginTop: '2.5rem', borderTop: '2px solid #0a66c2', paddingTop: '2rem' }}>
                                <h2 className="card-title">🗓️ Weekend/Holiday Work Requests</h2>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Pre-emptive requests from employees to work on non-working days.
                                </p>

                                {weekendWorkRequests.length === 0 ? <p style={{ color: '#9CA3AF' }}>No pending work requests.</p> : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                        {weekendWorkRequests.map((req, i) => (
                                            <div key={i} style={{ padding: '1.5rem', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.employee_id}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{new Date(req.date).toDateString()}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#0a66c2', fontWeight: 'bold' }}>Request to Work</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Reason: {req.reason || "None"}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleWeekendWorkAction(req.request_id, 'Approved')}
                                                        className="btn btn-primary" style={{ flex: 1, backgroundColor: '#0a66c2' }}
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

                            <div className="card">
                                <h2 className="card-title">🚀 Payslip Release Control</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['February 2026', 'March 2026'].map(month => {
                                        const isReleased = payrollStatus.some(p => p.month_year === month && p.released);
                                        return (
                                            <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{month}</div>
                                                    <div style={{ fontSize: '0.8rem', color: isReleased ? '#0a66c2' : '#6b7280' }}>{isReleased ? 'Released to Employees' : 'Not yet released'}</div>
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
                            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '8px', borderLeft: '4px solid #ff7a00' }}>
                                <div style={{ fontWeight: 'bold', color: '#ff7a00', marginBottom: '0.5rem' }}>AI Payroll Note:</div>
                                <p style={{ fontSize: '0.875rem', margin: 0 }}>All LOP (Loss of Pay) deductions are automatically calculated based on attendance and leave records for the selected month.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB: SALARY REPORT */}
                    {activeTab === 'salary_report' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 className="card-title" style={{ margin: 0 }}>📊 Monthly Salary Report</h2>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <select 
                                        value={salaryReportMonth} 
                                        onChange={(e) => setSalaryReportMonth(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                    >
                                        {['January 2026', 'February 2026', 'March 2026', 'April 2026'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <button onClick={fetchData} className="btn btn-secondary">🔄 Refresh</button>
                                </div>
                            </div>

                            <div className="table-container">
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', color: '#6b7280', fontSize: '0.85rem' }}>
                                            <th style={{ padding: '1rem' }}>Employee</th>
                                            <th style={{ padding: '1rem' }}>Exp. Days</th>
                                            <th style={{ padding: '1rem' }}>Present</th>
                                            <th style={{ padding: '1rem' }}>Leaves</th>
                                            <th style={{ padding: '1rem' }}>Absent (LOP)</th>
                                            <th style={{ padding: '1rem' }}>Gross Salary</th>
                                            <th style={{ padding: '1rem' }}>Deductions</th>
                                            <th style={{ padding: '1rem', color: '#0a66c2' }}>Net Payable</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaryReport.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '600' }}>{row.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{row.employee_id}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{row.expected_working_days}</td>
                                                <td style={{ padding: '1rem', color: '#10B981' }}>{row.actual_presence}</td>
                                                <td style={{ padding: '1rem', color: '#6366F1' }}>{row.leaves_taken}</td>
                                                <td style={{ padding: '1rem', color: row.absent_days > 0 ? '#EF4444' : '#9CA3AF' }}>{row.absent_days}</td>
                                                <td style={{ padding: '1rem' }}>₹{row.monthly_salary.toLocaleString()}</td>
                                                <td style={{ padding: '1rem', color: '#EF4444' }}>-₹{row.lop_deduction.toLocaleString()}</td>
                                                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0a66c2' }}>₹{row.net_salary.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: ITEMS */}
                    {activeTab === 'items' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">📦 Item Requests ({itemRequests.length})</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#6b7280', fontSize: '0.85rem' }}>
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
                                            <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No item requests found.</td>
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
                                                        user?.role === 'hr_responsible' ? (
                                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>View Only</span>
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
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>📄 AI Document Templates</h1>
                            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Train our AI on your specific company documents. Upload any PDF/HTML format and we'll convert it into a dynamic system template.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                {/* CARD 1: OFFER LETTERS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>📑</span> Offer Letters
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem', flex: 1 }}>Upload layouts for Intern and Full-Time appointment letters.</p>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <select
                                            value={selectedTemplateType}
                                            onChange={(e) => setSelectedTemplateType(e.target.value)}
                                            style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                                        >
                                            <option value="Intern">Intern Format</option>
                                            <option value="Full-Time">Full-Time Format</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => {
                                            // Ensure type is set before trigger
                                            if (selectedTemplateType !== 'Intern' && selectedTemplateType !== 'Full-Time') {
                                                setSelectedTemplateType('Intern');
                                            }
                                            document.getElementById('template-upload-input').click();
                                        }}
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#0a66c2' }}
                                    >
                                        Upload Offer Template
                                    </button>
                                </div>

                                {/* CARD 2: PAYSLIPS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>💰</span> Payslip Design
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem', flex: 1 }}>Train AI to recognize your payslip components and ROI investment fields.</p>

                                    <button
                                        onClick={() => {
                                            setSelectedTemplateType('Payslip');
                                            document.getElementById('template-upload-input').click();
                                        }}
                                        disabled={uploadingTemplate}
                                        className="btn btn-primary"
                                        style={{ width: '100%', background: '#10B981' }}
                                    >
                                        {uploadingTemplate && selectedTemplateType === 'Payslip' ? "Analyzing..." : "Upload Payslip Template"}
                                    </button>
                                </div>

                                {/* CARD 3: EXIT DOCUMENTS */}
                                <div className="card" style={{ background: '#ffffff', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🚪</span> Exit Documents
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem', flex: 1 }}>Upload professional formats for Relieving Letters and Experience Certificates.</p>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <select
                                            value={selectedTemplateType}
                                            onChange={(e) => setSelectedTemplateType(e.target.value)}
                                            style={{ width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                                        >
                                            <option value="Relieving">Relieving Letter</option>
                                            <option value="Experience">Experience Certificate</option>
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
                                        style={{ width: '100%', background: '#ff7a00' }}
                                    >
                                        {uploadingTemplate && (selectedTemplateType === 'Relieving' || selectedTemplateType === 'Experience') ? "Analyzing..." : "Upload Exit Template"}
                                    </button>
                                </div>
                            </div>

                            <input id="template-upload-input" type="file" hidden accept=".html,.pdf" onChange={handleTemplateUpload} />

                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Active System Templates</h3>
                                {offerLetterTemplates.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
                                        No templates configured yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '2rem' }}>
                                        {['Full-Time', 'Intern', 'Payslip', 'Relieving', 'Experience'].map(category => {
                                            const categoryTemplates = offerLetterTemplates.filter(t => t.employment_type === category);
                                            if (categoryTemplates.length === 0) return null;

                                            return (
                                                <div key={category}>
                                                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
                                                        {category} Templates
                                                    </h4>
                                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                        {categoryTemplates.map((temp, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#111827' }}>{temp.employment_type} Format</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                        Format: <span style={{ textTransform: 'uppercase' }}>{temp.original_type}</span> •
                                                                        Placeholders: {temp.placeholders?.length || 0} •
                                                                        Updated: {new Date(temp.updated_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button className="btn" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', border: '1px solid #E5E7EB' }} onClick={() => setPreviewActiveTemplate(temp.html_content)}>Preview</button>
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
                                <div className="card glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ff7a00', boxShadow: '0 0 40px rgba(255,122,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 className="card-title" style={{ margin: 0 }}>🧠 AI Analysis Complete</h2>
                                            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0 0' }}>We've scanned your {selectedTemplateType} template and extracted the logic.</p>
                                        </div>
                                        <button className="btn" onClick={() => setTemplateAnalysis(null)}>✕</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div style={{ padding: '1.5rem', background: 'rgba(10, 102, 194, 0.05)', borderRadius: '12px', border: '1px solid #0a66c2' }}>
                                                <h3 style={{ fontSize: '1rem', color: '#0a66c2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>🏷️</span> Detected Placeholders
                                                </h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {templateAnalysis.placeholders?.map(p => (
                                                        <span key={p} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', color: '#1f2937', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #E5E7EB' }}>
                                                            {`{{${p}}}`}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
                                                    * These markers will be replaced with real employee data during generation.
                                                </p>
                                            </div>

                                            {templateAnalysis.roi_fields?.length > 0 && (
                                                <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid #10B981' }}>
                                                    <h3 style={{ fontSize: '1rem', color: '#10B981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span>💰</span> ROI / Investment Fields Found
                                                    </h3>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {templateAnalysis.roi_fields.map(field => (
                                                            <span key={field} style={{ padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.2)', color: '#065f46', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid #10B981' }}>
                                                                {field} detected
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
                                                        * These fields are mapped to automated tax and payroll processing.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                                            <div style={{ padding: '0.75rem 1rem', background: '#f9fafb', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280' }}>🖥️ LIVE HTML PREVIEW</span>
                                                <span style={{ fontSize: '0.6rem', color: '#10B981' }}>● Responsive AI Layout</span>
                                            </div>
                                            <div style={{ padding: '0px', height: '450px', background: '#fff' }}>
                                                {templateAnalysis.html_template ? (
                                                    <iframe
                                                        srcDoc={templateAnalysis.html_template}
                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                        title="AI Template Preview"
                                                    />
                                                ) : (
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6b7280' }}>
                                                        No HTML preview generated for this file type.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
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
                                            ✅ Confirm & Save Template
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
                                <div className="card glass-panel" style={{ width: '95vw', maxWidth: '1600px', height: '95vh', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h2 className="card-title" style={{ margin: 0 }}>👁️ Template Preview</h2>
                                        <button className="btn" onClick={() => setPreviewActiveTemplate(null)}>✕</button>
                                    </div>
                                    <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', minHeight: 0 }}>
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

                    {
                        activeTab === 'announcements' && (
                            <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                                <h2 className="card-title">📢 Manage System Announcements</h2>
                                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>This message will be visible to all employees in their Engage module.</p>

                                <form onSubmit={handleUpdateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#6b7280' }}>Announcement Title</label>
                                        <input
                                            type="text"
                                            value={announcementMsg.title}
                                            onChange={(e) => setAnnouncementMsg({ ...announcementMsg, title: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                            placeholder="e.g. 📌 Essential Office Guidelines"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#6b7280' }}>Content</label>
                                        <textarea
                                            rows="6"
                                            value={announcementMsg.content}
                                            onChange={(e) => setAnnouncementMsg({ ...announcementMsg, content: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', lineHeight: '1.5' }}
                                            placeholder="Type the announcement content here..."
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>Update Announcement</button>
                                </form>
                            </div>
                        )}
                </div>
            )}


            {/* OFFER LETTER MODAL */}
            {isOfferLetterModalOpen && viewedEmp && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="card-title">📝 {offerLetterParams.employment_type} Offer Letter Preview</h2>
                            <button className="btn" onClick={() => setIsOfferLetterModalOpen(false)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Employment Type</label>
                                    <select
                                        value={offerLetterParams.employment_type}
                                        onChange={(e) => setOfferLetterParams({ ...offerLetterParams, employment_type: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                    >
                                        <option value="Intern">Intern</option>
                                        <option value="Full-Time">Full-Time</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Offer Date</label>
                                    <input type="date" value={offerLetterParams.date} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>{offerLetterParams.employment_type === 'Intern' ? 'Internship Role' : 'Employee Role'}</label>
                                    <input type="text" value={offerLetterParams.role} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, role: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>

                                {offerLetterParams.employment_type === 'Intern' ? (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Stipend / Benefits</label>
                                            <input type="text" value={offerLetterParams.stipend} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, stipend: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Duration</label>
                                            <input type="text" value={offerLetterParams.duration} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, duration: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Annual CTC (₹)</label>
                                            <input type="number" value={offerLetterParams.annual_ctc} onChange={(e) => {
                                                const ctc = parseFloat(e.target.value);
                                                setOfferLetterParams({ ...offerLetterParams, annual_ctc: ctc, in_hand_salary: ctc - offerLetterParams.pf_amount });
                                            }} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Notice Period</label>
                                            <input type="text" value={offerLetterParams.notice_period} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, notice_period: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <input type="checkbox" checked={offerLetterParams.has_pf} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, has_pf: e.target.checked })} id="pf-checkbox" />
                                            <label htmlFor="pf-checkbox" style={{ fontSize: '0.8rem', color: '#6b7280' }}>Company has PF?</label>
                                        </div>
                                        {offerLetterParams.has_pf && (
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>PF Amount (Annual ₹)</label>
                                                <input type="number" value={offerLetterParams.pf_amount} onChange={(e) => {
                                                    const pf = parseFloat(e.target.value);
                                                    setOfferLetterParams({ ...offerLetterParams, pf_amount: pf, in_hand_salary: offerLetterParams.annual_ctc - pf });
                                                }} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                            </div>
                                        )}
                                        <div style={{ padding: '0.75rem', background: 'rgba(10, 102, 194, 0.1)', borderRadius: '6px', border: '1px solid #0a66c2', marginTop: '0.5rem' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#0a66c2', fontWeight: 'bold' }}>💰 In-Hand Amount: ₹{offerLetterParams.in_hand_salary}</p>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Role Description / Annexure Details</label>
                                    <textarea rows="3" value={offerLetterParams.role_description} onChange={(e) => setOfferLetterParams({ ...offerLetterParams, role_description: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>
                                <button className="btn btn-primary" onClick={() => handleGenerateOfferLetter(viewedEmp.employee_id)} disabled={isGeneratingOL}>
                                    {isGeneratingOL ? 'Generating Draft...' : '🔄 Update/Generate Draft'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', background: '#f9fafb' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ff7a00' }}>📄 PREVIEW AREA</div>
                                {viewedEmp.offer_letter_status === 'draft' ? (
                                    <iframe
                                        src={`${apiUrl}/admin/interns/offer-letter-preview/${viewedEmp.employee_id}?t=${previewTimestamp}`}
                                        style={{ width: '100%', height: '400px', border: 'none' }}
                                        title="Offer Letter Preview"
                                    />
                                ) : (
                                    <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#6b7280', border: '1px dashed #E5E7EB' }}>
                                        Draft not generated yet.<br />Fill details and click Generate.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                            <button className="btn btn-secondary" onClick={() => setIsOfferLetterModalOpen(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                style={{ backgroundColor: '#0a66c2' }}
                                disabled={viewedEmp.offer_letter_status !== 'draft'}
                                onClick={() => handleFinalizeOfferLetter(viewedEmp.employee_id)}
                            >
                                ✅ Approve & Send to {offerLetterParams.employment_type === 'Intern' ? 'Intern' : 'Employee'}
                            </button>
                        </div>
                    </div >
                </div>
            )}

            {
                isRelievingLetterModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content glass-panel" style={{ maxWidth: '1000px', width: '95%', maxHeight: '95vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="card-title">📄 Exit Documents: Relieving & Experience</h2>
                                <button onClick={() => setIsRelievingLetterModalOpen(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                            </div>

                            {/* --- RELIEVING LETTER SECTION --- */}
                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', background: 'rgba(255,122,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.1rem', color: '#ff7a00', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📑 1. Relieving Letter
                                </h3>
                                <div className="grid-2">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Joining Date</label>
                                                <input type="date" value={relievingLetterParams.joining_date} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, joining_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Relieving Date</label>
                                                <input type="date" value={relievingLetterParams.relieving_date} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, relieving_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Last Working Day</label>
                                                <input type="date" value={relievingLetterParams.last_working_day} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, last_working_day: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Designation</label>
                                                <input type="text" value={relievingLetterParams.designation} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, designation: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Reason for Leaving</label>
                                            <textarea rows="2" value={relievingLetterParams.reason_for_leaving} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, reason_for_leaving: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button className="btn btn-primary" onClick={() => handleGenerateRelievingLetter(selectedApprovedEmp.employee_id)} disabled={isGeneratingRL} style={{ backgroundColor: '#ff7a00', flex: 1 }}>
                                                {isGeneratingRL ? 'Generating...' : '🔄 Update/Generate Draft'}
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{ backgroundColor: '#0a66c2', flex: 1 }}
                                                disabled={selectedApprovedEmp?.relieving_letter_status !== 'draft'}
                                                onClick={() => handleFinalizeRelievingLetter(selectedApprovedEmp.employee_id)}
                                            >
                                                ✅ Finalize & Release
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem', background: '#f9fafb' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#ff7a00', marginBottom: '0.5rem' }}>DRAFT PREVIEW</div>
                                        {selectedApprovedEmp?.relieving_letter_status === 'draft' ? (
                                            <iframe src={`${apiUrl}/admin/employee/relieving-letter-preview/${selectedApprovedEmp.employee_id}?t=${previewTimestamp}`} style={{ width: '100%', height: '250px', border: 'none', background: '#fff' }} title="RL Preview" />
                                        ) : (
                                            <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#6b7280', border: '1px dashed #E5E7EB', background: '#fff', fontSize: '0.8rem' }}>Draft not generated yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- EXPERIENCE CERTIFICATE SECTION --- */}
                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', background: 'rgba(10, 102, 194, 0.02)' }}>
                                <h3 style={{ fontSize: '1.1rem', color: '#0a66c2', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🏆 2. Experience Certificate
                                </h3>
                                <div className="grid-2">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Joining Date</label>
                                                <input type="date" value={experienceCertificateParams.joining_date} onChange={(e) => setExperienceCertificateParams({ ...experienceCertificateParams, joining_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Issue Date</label>
                                                <input type="date" value={experienceCertificateParams.issue_date} onChange={(e) => setExperienceCertificateParams({ ...experienceCertificateParams, issue_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Last Working Day</label>
                                                <input type="date" value={experienceCertificateParams.last_working_day} onChange={(e) => setExperienceCertificateParams({ ...experienceCertificateParams, last_working_day: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Designation</label>
                                                <input type="text" value={experienceCertificateParams.designation} onChange={(e) => setExperienceCertificateParams({ ...experienceCertificateParams, designation: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Performance Summary</label>
                                            <select value={experienceCertificateParams.performance_summary} onChange={(e) => setExperienceCertificateParams({ ...experienceCertificateParams, performance_summary: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                                                <option>Outstanding</option>
                                                <option>Excellent</option>
                                                <option>Good</option>
                                                <option>Satisfactory</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button className="btn btn-primary" onClick={() => handleGenerateExperienceCertificate(selectedApprovedEmp.employee_id)} disabled={isGeneratingEC} style={{ backgroundColor: '#0a66c2', flex: 1 }}>
                                                {isGeneratingEC ? 'Generating...' : '🔄 Update/Generate Draft'}
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{ backgroundColor: '#0a66c2', flex: 1 }}
                                                disabled={selectedApprovedEmp?.experience_cert_status !== 'draft'}
                                                onClick={() => handleFinalizeExperienceCertificate(selectedApprovedEmp.employee_id)}
                                            >
                                                ✅ Finalize & Release
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem', background: '#f9fafb' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#0a66c2', marginBottom: '0.5rem' }}>DRAFT PREVIEW</div>
                                        {selectedApprovedEmp?.experience_cert_status === 'draft' ? (
                                            <iframe src={`${apiUrl}/admin/employee/experience-certificate-preview/${selectedApprovedEmp.employee_id}?t=${previewTimestamp}`} style={{ width: '100%', height: '250px', border: 'none', background: '#fff' }} title="EC Preview" />
                                        ) : (
                                            <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#6b7280', border: '1px dashed #E5E7EB', background: '#fff', fontSize: '0.8rem' }}>Draft not generated yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                                <button className="btn btn-secondary" onClick={() => setIsRelievingLetterModalOpen(false)} style={{ minWidth: '200px' }}>Done / Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isPayslipManagerOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                        <div className="card glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 className="card-title" style={{ margin: 0 }}>💰 Release Payslips</h2>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0' }}>Month: <strong>{payslipManagerMonth}</strong></p>
                                </div>
                                <button className="btn" onClick={() => setIsPayslipManagerOpen(false)}>✕</button>
                            </div>

                            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Select employees to generate and send payslips for. You can preview individual payslips using the AI Generator before sending all.</p>

                            <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                                <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPayslipEmployees.length === approvedEmployees.length && approvedEmployees.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedPayslipEmployees(approvedEmployees.map(emp => emp.employee_id));
                                            else setSelectedPayslipEmployees([]);
                                        }}
                                        style={{ width: '1rem', height: '1rem' }}
                                    />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#374151' }}>Select All ({approvedEmployees.length})</span>
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#ffffff' }}>
                                    {approvedEmployees.length === 0 && <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No employees found.</div>}
                                    {approvedEmployees.map(emp => (
                                        <div key={emp.employee_id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPayslipEmployees.includes(emp.employee_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedPayslipEmployees([...selectedPayslipEmployees, emp.employee_id]);
                                                        else setSelectedPayslipEmployees(selectedPayslipEmployees.filter(id => id !== emp.employee_id));
                                                    }}
                                                    style={{ width: '1rem', height: '1rem' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.875rem' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        ID: {emp.employee_id} | Salary: ₹{emp.monthly_salary || 0}
                                                        {emp.pf_number && ` | PF: ${emp.pf_number}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setDocGenType('payslip');
                                                    setDocGenEmployee(emp);
                                                    setDocGenInitialData({
                                                        emp_name: emp.name,
                                                        employee_id: emp.employee_id,
                                                        designation: emp.position || 'Software Engineer',
                                                        month_year: payslipManagerMonth,
                                                        gross_salary: emp.monthly_salary || 50000,
                                                        net_salary: (emp.in_hand_salary && emp.in_hand_salary > 0) ? emp.in_hand_salary : (emp.monthly_salary ? emp.monthly_salary - 200 : 49800),
                                                        pf_number: emp.pf_number || ''
                                                    });
                                                    setIsDocGenModalOpen(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#0a66c2', borderColor: '#0a66c2' }}
                                            >
                                                👁️ AI Preview
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
                                <button className="btn btn-secondary" onClick={() => setIsPayslipManagerOpen(false)} disabled={isBatchSending}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    disabled={selectedPayslipEmployees.length === 0 || isBatchSending}
                                    onClick={async () => {
                                        setIsBatchSending(true);
                                        let successCount = 0;
                                        for (const empId of selectedPayslipEmployees) {
                                            const emp = approvedEmployees.find(e => e.employee_id === empId);
                                            if (!emp) continue;
                                            const data = {
                                                emp_name: emp.name,
                                                employee_id: emp.employee_id,
                                                designation: emp.position || 'Software Engineer',
                                                month_year: payslipManagerMonth,
                                                gross_salary: emp.monthly_salary || 50000,
                                                        net_salary: (emp.in_hand_salary && emp.in_hand_salary > 0) ? emp.in_hand_salary : (emp.monthly_salary ? emp.monthly_salary - 200 : 49800)
                                            };
                                            try {
                                                const res = await fetch(`${apiUrl}/enhanced-docs/generate`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ 
                                                        employee_id: empId, 
                                                        doc_type: 'payslip', 
                                                        roi_data: data 
                                                    })
                                                });
                                                const result = await res.json();
                                                if (result.status === 'success') successCount++;
                                            } catch (err) {
                                                console.error('Error generating payslip for', empId, err);
                                            }
                                        }
                                        setIsBatchSending(false);
                                        alert(`Successfully generated and sent ${successCount} payslips out of ${selectedPayslipEmployees.length}!`);
                                        setIsPayslipManagerOpen(false);

                                        // Mark as released
                                        await fetch(`${apiUrl}/admin/payslips/release`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ month_year: payslipManagerMonth, release: true })
                                        });
                                        fetchData();
                                    }}
                                >
                                    {isBatchSending ? '⏳ Generating...' : `✅ Generate & Send (${selectedPayslipEmployees.length})`}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <DocumentGeneratorModal
                isOpen={isDocGenModalOpen}
                onClose={() => setIsDocGenModalOpen(false)}
                apiUrl={apiUrl}
                docType={docGenType}
                initialData={docGenInitialData}
                employee={docGenEmployee}
            />

            <EnhancedDocumentGenerator
                isOpen={isEnhancedDocGenOpen}
                onClose={() => setIsEnhancedDocGenOpen(false)}
                apiUrl={apiUrl}
            />
        </div>
    );
};

export default AdminDashboard;
