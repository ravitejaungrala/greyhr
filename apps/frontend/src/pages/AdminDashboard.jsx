import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ activeTab }) => {
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
    const [templateAnalysis, setTemplateAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
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

    // Form states
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public Holiday' });
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [empRoleSetup, setEmpRoleSetup] = useState({
        employment_type: 'Full-Time',
        position: 'Software Engineer',
        monthly_salary: 50000,
        privilege_leave_rate: 0.0,
        sick_leave_rate: 0.5,
        casual_leave_rate: 1.0
    });
    const [workdayOverrides, setWorkdayOverrides] = useState([]);
    const [compOffRequests, setCompOffRequests] = useState([]);
    const [weekendWorkRequests, setWeekendWorkRequests] = useState([]);
    const [isProcessingCompOff, setIsProcessingCompOff] = useState(false);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'onboarding') {
                const res = await fetch(`${apiUrl}/auth/admin/pending`);
                const data = await res.json();
                setPendingEmployees(data.employees || []);
                // Only unset viewedEmp if they are no longer in the pending list
                setViewedEmp(prev => prev && data.employees?.some(e => e.employee_id === prev.employee_id) ? data.employees.find(e => e.employee_id === prev.employee_id) : null);
            } else if (activeTab === 'employees') {
                const res = await fetch(`${apiUrl}/auth/admin/employees`);
                const data = await res.json();
                setApprovedEmployees(data.employees || []);
                setViewedEmp(null);
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
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate)
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
                    casual_leave_rate: parseFloat(empRoleSetup.casual_leave_rate)
                })
            });
            if (response.ok) {
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
                const res = await fetch(`${apiUrl}/admin/templates/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employment_type: selectedTemplateType,
                        content_base64: base64Content,
                        file_type: fileType
                    })
                });
                const data = await res.json();
                if (data.message) {
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

    return (
        <div className="admin-dashboard">
            <h1 className="card-title" style={{ fontSize: '1.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeTab === 'onboarding' && '📋 Pending Approvals'}
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
                                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/120?text=No+Photo'; }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Bank Photo:</div>
                                                        <img
                                                            src={`${apiUrl}/admin/photos/${viewedEmp.bank_details?.bank_photo_key}`}
                                                            alt="Bank"
                                                            style={{ width: '100%', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
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
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Monthly Gross Salary (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={empRoleSetup.monthly_salary}
                                                        onChange={(e) => setEmpRoleSetup({ ...empRoleSetup, monthly_salary: e.target.value })}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }}
                                                    />
                                                </div>

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
                                                    // Set defaults based on employment type
                                                    if (empRoleSetup.employment_type === 'Intern') {
                                                        setOfferLetterParams({
                                                            employment_type: 'Intern',
                                                            date: new Date().toISOString().split('T')[0],
                                                            role: empRoleSetup.position || 'Full Stack Intern',
                                                            role_description: 'Full stack development projects, contributing to both frontend and backend systems, and learning modern IT stacks.',
                                                            stipend: 'Unpaid / Certificate Based',
                                                            duration: '3 Months'
                                                        });
                                                    } else {
                                                        setOfferLetterParams({
                                                            employment_type: 'Full-Time',
                                                            date: new Date().toISOString().split('T')[0],
                                                            role: empRoleSetup.position || 'Software Engineer',
                                                            role_description: 'Software development, system design, and contributing to the overall technical excellence of NeuzenAI products.',
                                                            stipend: empRoleSetup.monthly_salary ? `₹${empRoleSetup.monthly_salary * 12} LPA (Fixed)` : 'As discussed',
                                                            duration: '30 Days' // For notice period
                                                        });
                                                    }
                                                    setIsOfferLetterModalOpen(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                            >
                                                📝 Prepare Offer Letter
                                            </button>

                                            <button onClick={() => handleApproval(viewedEmp.employee_id, 'approve')} className="btn btn-primary" style={{ backgroundColor: '#0a66c2' }}>Approve Onboarding</button>
                                        </div>
                                    </div>
                                ) : <div style={{ color: '#6b7280', textAlign: 'center' }}>Select an employee to review.</div>}
                            </div>
                        </>
                    )}

                    {/* TAB: EMPLOYEES */}
                    {activeTab === 'employees' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">Employee Directory ({approvedEmployees.length})</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6b7280' }}>
                                        <th style={{ padding: '1rem' }}>Photo</th>
                                        <th style={{ padding: '1rem' }}>ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Email</th>
                                        <th style={{ padding: '1rem' }}>Status</th>
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
                                                    casual_leave_rate: emp.casual_leave_rate || 1.0
                                                });
                                            }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selectedApprovedEmp?.employee_id === emp.employee_id ? 'rgba(79, 70, 229, 0.1)' : 'transparent' }}
                                        >
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <img
                                                    src={`${apiUrl}/admin/photos/${emp.reference_image_key}`}
                                                    alt=""
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB' }}
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{emp.employee_id}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                                            <td style={{ padding: '1rem', color: '#6b7280' }}>{emp.email}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(10, 102, 194, 0.2)', color: '#0a66c2', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Active</span></td>
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
                                                setRelievingLetterParams({
                                                    employee_id: selectedApprovedEmp.employee_id,
                                                    relieving_date: new Date().toISOString().split('T')[0],
                                                    joining_date: selectedApprovedEmp.joining_date || 'N/A',
                                                    last_working_day: new Date().toISOString().split('T')[0],
                                                    designation: selectedApprovedEmp.position || 'Software Engineer',
                                                    reason_for_leaving: 'Personal reasons'
                                                });
                                                setIsRelievingLetterModalOpen(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                        >
                                            📄 Prepare Relieving Letter
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
                                                    <>
                                                        <button onClick={() => handleLeaveStatus(l.id, 'Rejected')} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Reject</button>
                                                        <button onClick={() => handleLeaveStatus(l.id, 'Approved by Admin')} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#0a66c2' }}>Approve</button>
                                                    </>
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
                                <h2 className="card-title">Holiday Calendar</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {holidays.map((h, i) => (
                                        <div key={i} style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{h.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{h.type} | {new Date(h.date).toDateString()}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditClick(h)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✏️ Edit</button>
                                                <button onClick={() => handleDeleteHoliday(h.date)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#EF4444', color: '#EF4444' }}>🗑️ Delete</button>
                                            </div>
                                        </div>
                                    ))}
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
                        </div>
                    )}

                    {/* TAB: PAYROLL */}
                    {activeTab === 'payroll' && (
                        <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="card glass-panel">
                                <h2 className="card-title">📄 Payslip Template Configuration</h2>
                                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Upload a sample payslip image to train the AI on your specific company format.</p>

                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ padding: '2rem', border: '2px dashed #E5E7EB', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: '#ffffff' }} onClick={() => document.getElementById('template-upload').click()}>
                                            <span style={{ fontSize: '2rem' }}>📁</span>
                                            <p style={{ marginTop: '0.5rem' }}>{isAnalyzing ? 'Analyzing format with AI...' : 'Click to upload payslip template (JPG/PNG)'}</p>
                                            <input id="template-upload" type="file" hidden accept="image/*" onChange={handleTemplateUpload} />
                                        </div>
                                    </div>
                                    {templateAnalysis && (
                                        <div style={{ flex: 1, padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.5rem', color: '#ff7a00' }}>✔ AI ANALYSIS COMPLETE</div>
                                            <pre style={{ fontSize: '0.7rem', color: '#1f2937', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>{templateAnalysis}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                                    onClick={async () => {
                                                        const res = await fetch(`${apiUrl}/admin/payslips/release`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ month_year: month, release: !isReleased })
                                                        });
                                                        if (res.ok) fetchData();
                                                    }}
                                                >
                                                    {isReleased ? 'Hide Payslips' : 'Release Payslips'}
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

                    {/* TAB: TEMPLATES */}
                    {activeTab === 'templates' && (
                        <div className="card glass-panel" style={{ gridColumn: 'span 3' }}>
                            <h2 className="card-title">📄 Offer Letter HTML Templates</h2>
                            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Upload custom HTML templates with <code>{"{{placeholder}}"}</code> for Intern and Full-Time offers.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #E5E7EB' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Upload New Template</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Employment Type</label>
                                                <select
                                                    value={selectedTemplateType}
                                                    onChange={(e) => setSelectedTemplateType(e.target.value)}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937', marginTop: '0.5rem' }}
                                                >
                                                    <option value="Intern">Intern Offer Letter</option>
                                                    <option value="Full-Time">Full-Time Offer Letter</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                padding: '2.5rem',
                                                border: '2px dashed #E5E7EB',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                background: '#ffffff',
                                                transition: 'all 0.2s',
                                                hover: { borderColor: '#ff7a00', background: 'rgba(79, 70, 229, 0.05)' }
                                            }}
                                            onClick={() => document.getElementById('template-upload-input').click()}
                                        >
                                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
                                            {uploadingTemplate ? (
                                                <div style={{ color: '#ff7a00', fontWeight: 'bold' }}>AI is analyzing template content...</div>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>Click to upload Offer Template</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Supports .pdf or .html files</div>
                                                </div>
                                            )}
                                            <input
                                                id="template-upload-input"
                                                type="file"
                                                hidden
                                                accept=".html,.pdf"
                                                onChange={handleTemplateUpload}
                                            />
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', background: 'rgba(7, 10, 20, 0.4)', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                            <div style={{ fontWeight: 'bold', color: '#0a66c2', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>ℹ️</span> AI Placeholder Detection
                                            </div>
                                            <p style={{ margin: '0 0 0.5rem 0' }}>Our AI will automatically scan your file for markers and inject standard placeholders if missing.</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                {['name', 'role', 'date', 'annual_ctc'].map(p => (
                                                    <code key={p} style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E5E7EB' }}>{`{{${p}}}`}</code>
                                                ))}
                                                <span>...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #E5E7EB' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Active Templates</h3>
                                    {offerLetterTemplates.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
                                            <p>No custom templates found.<br />Using default system format.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {offerLetterTemplates.map((tpl, i) => (
                                                <div key={i} style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #E5E7EB', position: 'relative' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                                <span style={{ background: tpl.employment_type === 'Intern' ? '#0a66c2' : '#ff7a00', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', fontWeight: 'bold' }}>
                                                                    {tpl.employment_type.toUpperCase()}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tpl.original_type?.toUpperCase() || 'HTML'} Format</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                                                                Last updated: {new Date(tpl.updated_at).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteTemplate(tpl.employment_type)}
                                                            className="btn-icon"
                                                            style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer' }}
                                                            title="Delete Template"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>

                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#0a66c2', fontWeight: 'bold', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Detected Placeholders</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                            {tpl.placeholders?.map(p => (
                                                                <span key={p} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                    {p}
                                                                </span>
                                                            )) || <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>None detected</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Weekend/Holiday Work Requests Section */}
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


                    {/* TAB: ANNOUNCEMENTS */}
                    {activeTab === 'announcements' && (
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
                    </div>
                </div>
            )}

            {isRelievingLetterModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="card-title">📄 Relieving & Experience Certificate</h2>
                            <button onClick={() => setIsRelievingLetterModalOpen(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                        </div>

                        <div className="grid-2">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(255,122,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,122,0,0.2)' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#ff7a00' }}>
                                        <strong>Employee:</strong> {selectedApprovedEmp?.name} ({selectedApprovedEmp?.employee_id})
                                    </p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Joining Date</label>
                                        <input type="date" value={relievingLetterParams.joining_date} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, joining_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Relieving Date (Issue Date)</label>
                                        <input type="date" value={relievingLetterParams.relieving_date} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, relieving_date: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Last Working Day</label>
                                    <input type="date" value={relievingLetterParams.last_working_day} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, last_working_day: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Designation</label>
                                    <input type="text" value={relievingLetterParams.designation} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, designation: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Reason for Leaving</label>
                                    <textarea rows="2" value={relievingLetterParams.reason_for_leaving} onChange={(e) => setRelievingLetterParams({ ...relievingLetterParams, reason_for_leaving: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB', background: '#ffffff', color: '#1f2937' }} />
                                </div>
                                <button className="btn btn-primary" onClick={() => handleGenerateRelievingLetter(selectedApprovedEmp.employee_id)} disabled={isGeneratingRL} style={{ backgroundColor: '#ff7a00' }}>
                                    {isGeneratingRL ? 'Generating Draft...' : '🔄 Generate / Update Draft'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', background: '#f9fafb' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ff7a00' }}>📄 DRAFT PREVIEW</div>
                                {selectedApprovedEmp?.relieving_letter_status === 'draft' ? (
                                    <iframe
                                        src={`${apiUrl}/admin/employee/relieving-letter-preview/${selectedApprovedEmp.employee_id}?t=${previewTimestamp}`}
                                        style={{ width: '100%', height: '350px', border: 'none', background: '#fff' }}
                                        title="Relieving Letter Preview"
                                    />
                                ) : (
                                    <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#6b7280', border: '1px dashed #E5E7EB', background: '#fff' }}>
                                        Draft not generated yet.<br />Fill details and click Generate.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
                            <button className="btn btn-secondary" onClick={() => setIsRelievingLetterModalOpen(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                style={{ backgroundColor: '#0a66c2' }}
                                disabled={selectedApprovedEmp?.relieving_letter_status !== 'draft'}
                                onClick={() => handleFinalizeRelievingLetter(selectedApprovedEmp.employee_id)}
                            >
                                ✅ Finalize & Release to Employee
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
