import React, { useState, useEffect } from 'react';
import './HistoricalDocGenerator.css';

const HistoricalDocGenerator = ({ apiUrl }) => {
    const [documentTypes, setDocumentTypes] = useState([]);
    const [historicalDocs, setHistoricalDocs] = useState([]);
    const [selectedDocType, setSelectedDocType] = useState('');
    const [employeeData, setEmployeeData] = useState({
        name: '',
        employee_id: '',
        email: '',
        department: '',
        designation: ''
    });
    const [roiFields, setRoiFields] = useState({});
    const [formData, setFormData] = useState({});
    const [previewBase64, setPreviewBase64] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Selection, 3: Fields, 4: Preview, 5: Success/History
    const [lastGeneratedFile, setLastGeneratedFile] = useState(null);

    useEffect(() => {
        fetchDocumentTypes();
        fetchHistoricalDocs();
    }, []);

    const fetchDocumentTypes = async () => {
        try {
            const response = await fetch(`${apiUrl}/enhanced-docs/types`);
            const data = await response.json();
            setDocumentTypes(data.document_types || []);
        } catch (error) {
            console.error('Failed to fetch document types:', error);
        }
    };

    const fetchHistoricalDocs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/historical-docs/list`);
            const data = await response.json();
            setHistoricalDocs(data.documents || []);
        } catch (error) {
            console.error('Failed to fetch historical docs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmployeeDataChange = (field, value) => {
        setEmployeeData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDocTypeSelect = (docType) => {
        setSelectedDocType(docType);
        const docConfig = documentTypes.find(dt => dt.type === docType);
        if (docConfig) {
            setRoiFields(docConfig.roi_fields);
            // Default prefill from employee data
            const prefill = {
                emp_name: employeeData.name,
                emp_code: employeeData.employee_id,
                department: employeeData.department,
                designation: employeeData.designation,
                current_date: new Date().toISOString().split('T')[0]
            };
            setFormData(prefill);
        }
    };

    const handleFieldChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        try {
            const response = await fetch(`${apiUrl}/enhanced-docs/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doc_type: selectedDocType,
                    roi_data: formData
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                setPreviewBase64(`data:text/html;charset=utf-8;base64,${data.html_base64}`);
                setCurrentStep(4);
            } else {
                alert(data.error || 'Preview generation failed');
            }
        } catch (error) {
            console.error('Preview failed:', error);
            alert('Failed to generate preview');
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${apiUrl}/historical-docs/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_data: employeeData,
                    doc_type: selectedDocType,
                    roi_data: formData
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                setLastGeneratedFile(data.filename);
                fetchHistoricalDocs();
                setCurrentStep(6); // Success Step
            } else {
                alert(data.error || 'Document generation failed');
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('Failed to generate document');
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadDoc = (filename) => {
        if (!filename) return;
        window.open(`${apiUrl}/historical-docs/download/${filename}`, '_blank');
    };

    const resetGenerator = () => {
        setCurrentStep(1);
        setSelectedDocType('');
        setEmployeeData({ name: '', employee_id: '', email: '', department: '', designation: '' });
        setFormData({});
        setPreviewBase64(null);
        setLastGeneratedFile(null);
    };

    const canProceedToDocType = employeeData.name && employeeData.employee_id;

    // Premium Stepper Component
    const Stepper = () => {
        const steps = [
            { id: 1, label: 'Employee Info' },
            { id: 2, label: 'Doc Type' },
            { id: 3, label: 'Details' },
            { id: 4, label: 'Preview' }
        ];

        return (
            <div className="premium-stepper">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="stepper-item">
                            <div className={`step-number ${currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : 'pending'}`}>
                                {currentStep > step.id ? '✓' : step.id}
                            </div>
                            <span className={`step-label ${currentStep === step.id ? 'active' : 'pending'}`}>
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`stepper-connector ${currentStep > step.id ? 'completed' : ''}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="historical-doc-container">
            <div className="historical-header">
                <div>
                    <h2>✨ Historical Document Center</h2>
                    <p>Easily generate standard documents for employees not registered in HRMS.</p>
                </div>
                {currentStep !== 5 && (
                    <button className="btn btn-secondary glass-card" onClick={() => setCurrentStep(5)}>
                        📁 View Generated History
                    </button>
                )}
            </div>

            {currentStep < 5 && <Stepper />}

            {/* Step 1: Employee Basics */}
            {currentStep === 1 && (
                <div className="card glass-card" style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeInUp 0.5s ease-out' }}>
                    <div style={{ padding: '0.5rem' }}>
                        <h3 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>👤 Let's start with employee basics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="premium-input-group">
                                <label className="premium-label">Full Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                                <input 
                                    type="text" 
                                    className="premium-input" 
                                    value={employeeData.name}
                                    onChange={(e) => handleEmployeeDataChange('name', e.target.value)}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="premium-input-group">
                                <label className="premium-label">Employee ID <span style={{ color: 'var(--primary)' }}>*</span></label>
                                <input 
                                    type="text" 
                                    className="premium-input" 
                                    value={employeeData.employee_id}
                                    onChange={(e) => handleEmployeeDataChange('employee_id', e.target.value)}
                                    placeholder="e.g. NA-001"
                                />
                            </div>
                            <div className="premium-input-group">
                                <label className="premium-label">Email Address</label>
                                <input 
                                    type="email" 
                                    className="premium-input" 
                                    value={employeeData.email}
                                    onChange={(e) => handleEmployeeDataChange('email', e.target.value)}
                                    placeholder="email@company.com"
                                />
                            </div>
                            <div className="premium-input-group">
                                <label className="premium-label">Department</label>
                                <input 
                                    type="text" 
                                    className="premium-input" 
                                    value={employeeData.department}
                                    onChange={(e) => handleEmployeeDataChange('department', e.target.value)}
                                    placeholder="Engineering, Sales, etc."
                                />
                            </div>
                            <div className="premium-input-group" style={{ gridColumn: 'span 2' }}>
                                <label className="premium-label">Designation</label>
                                <input 
                                    type="text" 
                                    className="premium-input" 
                                    value={employeeData.designation}
                                    onChange={(e) => handleEmployeeDataChange('designation', e.target.value)}
                                    placeholder="Technical Lead, Senior Executive, etc."
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn btn-primary"
                                disabled={!canProceedToDocType}
                                onClick={() => setCurrentStep(2)}
                                style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: '15px' }}
                            >
                                Continue to Type selection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Document Selection */}
            {currentStep === 2 && (
                <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>📄 What document would you like to create?</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Select a template to continue</p>
                    </div>
                    <div className="doc-type-grid">
                        {documentTypes.map(docType => (
                            <div 
                                key={docType.type}
                                className={`doc-type-card ${selectedDocType === docType.type ? 'selected' : ''}`}
                                onClick={() => handleDocTypeSelect(docType.type)}
                            >
                                <span className="doc-card-icon">
                                    {docType.type === 'payslip' ? '💰' : 
                                     docType.type === 'relieving' ? '✉️' : 
                                     docType.type === 'internship_offer' ? '🎓' : 
                                     docType.type === 'full_time_offer' ? '🏢' : 
                                     docType.type === 'internship_completion' ? '📜' : '📄'}
                                </span>
                                <div className="doc-card-title">{docType.name}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-secondary" onClick={() => setCurrentStep(1)} style={{ padding: '0.8rem 2rem', borderRadius: '12px' }}>
                            ← Go Back
                        </button>
                        <button 
                            className="btn btn-primary"
                            disabled={!selectedDocType}
                            onClick={() => setCurrentStep(3)}
                            style={{ padding: '0.8rem 2rem', borderRadius: '12px' }}
                        >
                            Next: Fill Details →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Detailed Fields */}
            {currentStep === 3 && (
                <div className="card glass-card" style={{ padding: '2.5rem', animation: 'fadeInUp 0.5s ease-out' }}>
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>📝 Complete Document Data</h3>
                        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Please provide the necessary values for the **{documentTypes.find(dt => dt.type === selectedDocType)?.name}**.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                        {Object.entries(roiFields).map(([fieldName, fieldConfig]) => (
                            <div className="premium-input-group" key={fieldName}>
                                <label className="premium-label">
                                    {fieldConfig.label}
                                    {fieldConfig.required && <span style={{ color: '#ef4444' }}> *</span>}
                                </label>
                                {fieldConfig.type === 'textarea' ? (
                                    <textarea
                                        className="premium-input"
                                        value={formData[fieldName] || ''}
                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                        rows={4}
                                        style={{ resize: 'none' }}
                                    />
                                ) : (
                                    <input
                                        type={fieldConfig.type === 'number' ? 'number' : fieldConfig.type === 'date' ? 'date' : 'text'}
                                        className="premium-input"
                                        value={formData[fieldName] || ''}
                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-secondary" onClick={() => setCurrentStep(2)} style={{ padding: '0.8rem 2rem', borderRadius: '12px' }}>
                            ← Back
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={handlePreview}
                            disabled={isPreviewing}
                            style={{ background: '#10b981', padding: '0.8rem 2rem', borderRadius: '12px' }}
                        >
                            {isPreviewing ? 'Preparing...' : '👁️ Preview Document'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Preview & Generation */}
            {currentStep === 4 && (
                <div style={{ display: 'flex', gap: '2.5rem', height: '72vh', animation: 'fadeInUp 0.5s ease-out' }}>
                    <div className="card glass-card" style={{ flex: '0 0 380px', padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Final Review 🔍</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '2rem' }}>Confirm the details accurately reflect the employee's history.</p>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '15px', marginBottom: '2rem', fontSize: '0.9rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>Employee</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{employeeData.name}</div>
                                <div style={{ color: 'var(--secondary)' }}>ID: {employeeData.employee_id}</div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>Document Type</div>
                                <div style={{ fontWeight: 600 }}>{documentTypes.find(dt => dt.type === selectedDocType)?.name}</div>
                            </div>
                            <div style={{ borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                                {Object.entries(formData).slice(0, 6).map(([k, v]) => (
                                    <div key={k} style={{ marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: '#6b7280' }}>{k.replace(/_/g, ' ')}:</span> <strong>{v}</strong>
                                    </div>
                                ))}
                                {Object.keys(formData).length > 6 && <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8rem' }}>+ more fields</div>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ padding: '1rem', background: '#10b981', borderRadius: '12px', fontSize: '1rem' }} 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? 'Generating...' : 'Confirm & Save Document ✅'}
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.8rem', borderRadius: '12px' }} onClick={() => setCurrentStep(3)}>
                                Still need to edit
                            </button>
                        </div>
                    </div>
                    <div style={{ flex: 1, background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                        <iframe src={previewBase64} style={{ width: '100%', height: '100%', border: 'none' }} title="Doc Preview" />
                    </div>
                </div>
            )}

            {/* Step 5: History View */}
            {currentStep === 5 && (
                <div style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>🕒 Generated Documents History</h3>
                            <p style={{ color: '#6b7280' }}>A complete list of manually generated records</p>
                        </div>
                        <button className="btn btn-primary" onClick={resetGenerator} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
                            ➕ Create New Document
                        </button>
                    </div>
                    
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>Loading records...</div>
                    ) : historicalDocs.length > 0 ? (
                        <div className="history-grid">
                            {historicalDocs.map((doc, idx) => (
                                <div className="history-card" key={idx}>
                                    <div className="history-card-header">
                                        <div className="history-emp-info">
                                            <h4>{doc.name}</h4>
                                            <span>{doc.employee_id} • {doc.department || 'General'}</span>
                                        </div>
                                        <div className="history-date">
                                            {new Date(doc.generated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <span className="history-doc-badge">{doc.doc_name}</span>
                                    </div>
                                    <div className="history-actions">
                                        <button 
                                            className="btn btn-secondary"
                                            style={{ flex: 1, fontSize: '0.8rem', borderRadius: '8px' }}
                                            onClick={() => downloadDoc(doc.s3_key.split('/').pop())}
                                        >
                                            Download ⬇️
                                        </button>
                                        {/* Future: View/Resend option */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card glass-card" style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
                            No historical documents generated yet.
                        </div>
                    )}
                </div>
            )}

            {/* Step 6: Success View */}
            {currentStep === 6 && (
                <div className="card glass-card" style={{ maxWidth: '600px', margin: '5rem auto', textAlign: 'center', padding: '4rem', animation: 'fadeIn' }}>
                    <div style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: '#10b981', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontSize: '3rem', 
                        color: 'white',
                        margin: '0 auto 2rem',
                        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)'
                    }}>
                        ✓
                    </div>
                    <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Mission Accomplished!</h3>
                    <p style={{ color: '#6b7280', marginBottom: '3rem' }}>The document for <strong>{employeeData.name}</strong> has been generated and securely archived.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={() => downloadDoc(lastGeneratedFile)}
                            style={{ padding: '1.2rem', borderRadius: '15px', fontSize: '1.1rem' }}
                        >
                            Download Generated File ⬇️
                        </button>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '12px' }} onClick={resetGenerator}>
                                Start Another
                            </button>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '12px' }} onClick={() => setCurrentStep(5)}>
                                View History
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalDocGenerator;
