import React, { useState, useEffect } from 'react';

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
    const [currentStep, setCurrentStep] = useState(1); // 1: Manual Info, 2: Select Doc, 3: Fill ROI, 4: Preview, 5: List/Success

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
        try {
            const response = await fetch(`${apiUrl}/historical-docs/list`);
            const data = await response.json();
            setHistoricalDocs(data.documents || []);
        } catch (error) {
            console.error('Failed to fetch historical docs:', error);
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
                alert('Historical document generated and saved successfully!');
                fetchHistoricalDocs();
                setCurrentStep(5);
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
        window.open(`${apiUrl}/historical-docs/download/${filename}`, '_blank');
    };

    const canProceedToDocType = employeeData.name && employeeData.employee_id;
    const canProceedToFill = canProceedToDocType && selectedDocType;

    return (
        <div className="historical-doc-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <div className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1f2937' }}>📜 Historical Document Generation</h2>
                    <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Create documents for former or non-registered employees manually.</p>
                </div>
                <button 
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep(currentStep === 5 ? 1 : 5)}
                >
                    {currentStep === 5 ? '➕ Create New Document' : 'View History 📜'}
                </button>
            </div>

            {/* Stepper (Only if not in history view) */}
            {currentStep < 5 && (
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                    {[
                        { s: 1, l: 'Employee Info' },
                        { s: 2, l: 'Document Type' },
                        { s: 3, l: 'ROI Fields' },
                        { s: 4, l: 'Preview & Save' }
                    ].map(step => (
                        <div key={step.s} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            color: currentStep === step.s ? '#3b82f6' : currentStep > step.s ? '#10b981' : '#9ca3af',
                            fontWeight: currentStep === step.s ? 'bold' : 'normal'
                        }}>
                            <div style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                background: currentStep === step.s ? '#3b82f6' : currentStep > step.s ? '#10b981' : '#d1d5db',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '0.8rem'
                            }}>
                                {currentStep > step.s ? '✓' : step.s}
                            </div>
                            <span>{step.l}</span>
                            {step.s < 4 && <span style={{ color: '#d1d5db' }}>⎯⎯</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Step 1: Manual Employee Info */}
            {currentStep === 1 && (
                <div className="card glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>👤 Step 1: Enter Employee Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="label">Full Name*</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={employeeData.name}
                                onChange={(e) => handleEmployeeDataChange('name', e.target.value)}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="label">Employee ID*</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={employeeData.employee_id}
                                onChange={(e) => handleEmployeeDataChange('employee_id', e.target.value)}
                                placeholder="e.g. NA-001"
                            />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input 
                                type="email" 
                                className="input" 
                                value={employeeData.email}
                                onChange={(e) => handleEmployeeDataChange('email', e.target.value)}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="label">Department</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={employeeData.department}
                                onChange={(e) => handleEmployeeDataChange('department', e.target.value)}
                                placeholder="e.g. Engineering"
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label className="label">Designation</label>
                            <input 
                                type="text" 
                                className="input" 
                                value={employeeData.designation}
                                onChange={(e) => handleEmployeeDataChange('designation', e.target.value)}
                                placeholder="e.g. Software Engineer"
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                        <button 
                            className="btn btn-primary"
                            disabled={!canProceedToDocType}
                            onClick={() => setCurrentStep(2)}
                            style={{ padding: '0.75rem 2rem' }}
                        >
                            Next: Select Document Type →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Document Type Selection */}
            {currentStep === 2 && (
                <div className="card glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>📄 Step 2: Select Document Type</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {documentTypes.map(docType => (
                            <div 
                                key={docType.type}
                                onClick={() => handleDocTypeSelect(docType.type)}
                                style={{
                                    padding: '1.5rem',
                                    border: '2px solid',
                                    borderColor: selectedDocType === docType.type ? '#3b82f6' : '#e5e7eb',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    background: selectedDocType === docType.type ? '#eff6ff' : 'white',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                    {docType.type === 'payslip' ? '💰' : docType.type === 'relieving' ? '✉️' : '🎓'}
                                </div>
                                <div style={{ fontWeight: 'bold' }}>{docType.name}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>← Back</button>
                        <button 
                            className="btn btn-primary"
                            disabled={!selectedDocType}
                            onClick={() => setCurrentStep(3)}
                        >
                            Next: Fill Details →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: ROI Fields */}
            {currentStep === 3 && (
                <div className="card glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>📝 Step 3: Complete Document Data</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {Object.entries(roiFields).map(([fieldName, fieldConfig]) => (
                            <div key={fieldName}>
                                <label className="label">
                                    {fieldConfig.label}
                                    {fieldConfig.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>
                                {fieldConfig.type === 'textarea' ? (
                                    <textarea
                                        className="input"
                                        value={formData[fieldName] || ''}
                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                        rows={3}
                                    />
                                ) : (
                                    <input
                                        type={fieldConfig.type === 'number' ? 'number' : fieldConfig.type === 'date' ? 'date' : 'text'}
                                        className="input"
                                        value={formData[fieldName] || ''}
                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>← Back</button>
                        <button 
                            className="btn btn-primary"
                            onClick={handlePreview}
                            disabled={isPreviewing}
                            style={{ background: '#10b981' }}
                        >
                            {isPreviewing ? 'Generating Preview...' : 'Preview Document 👁️'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Preview & Save */}
            {currentStep === 4 && (
                <div style={{ display: 'flex', gap: '2rem', height: '70vh' }}>
                    <div className="card glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h3>👁️ Step 4: Final Preview</h3>
                        <p>Verify all details before generating the final document.</p>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h4>Summary:</h4>
                            <p><strong>Employee:</strong> {employeeData.name} ({employeeData.employee_id})</p>
                            <p><strong>Document:</strong> {documentTypes.find(dt => dt.type === selectedDocType)?.name}</p>
                            <hr />
                            <div style={{ fontSize: '0.8rem' }}>
                                {Object.entries(formData).map(([k, v]) => (
                                    <div key={k}><strong>{k}:</strong> {v}</div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCurrentStep(3)}>Edit</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 2, background: '#10b981' }} 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? 'Generating...' : 'Confirm & Save ✅'}
                            </button>
                        </div>
                    </div>
                    <div style={{ flex: 2, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <iframe src={previewBase64} style={{ width: '100%', height: '100%', border: 'none' }} title="Doc Preview" />
                    </div>
                </div>
            )}

            {/* Step 5: History / Success */}
            {currentStep === 5 && (
                <div className="card glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>🕒 Historical Document History</h3>
                        <button className="btn btn-primary" onClick={() => setCurrentStep(1)}>+ Create New</button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Employee</th>
                                    <th>Doc Type</th>
                                    <th>Department</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historicalDocs.length > 0 ? historicalDocs.map((doc, idx) => (
                                    <tr key={idx}>
                                        <td>{new Date(doc.generated_at).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{doc.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{doc.employee_id}</div>
                                        </td>
                                        <td><span className="badge badge-info">{doc.doc_name}</span></td>
                                        <td>{doc.department || 'N/A'}</td>
                                        <td>
                                            <button 
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => downloadDoc(doc.s3_key.split('/').pop())}
                                            >
                                                Download ⬇️
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                                            No historical documents generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricalDocGenerator;
