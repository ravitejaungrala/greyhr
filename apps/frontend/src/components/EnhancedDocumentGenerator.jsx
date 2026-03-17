import React, { useState, useEffect } from 'react';

const EnhancedDocumentGenerator = ({ isOpen, onClose, apiUrl }) => {
    const [employees, setEmployees] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedDocType, setSelectedDocType] = useState('');
    const [roiFields, setRoiFields] = useState({});
    const [formData, setFormData] = useState({});
    const [previewBase64, setPreviewBase64] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStep, setCurrentStep] = useState(1); // 1: Select, 2: Fill, 3: Preview, 4: Finalize

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            fetchDocumentTypes();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setSelectedEmployee(null);
        setSelectedDocType('');
        setRoiFields({});
        setFormData({});
        setPreviewBase64(null);
        setCurrentStep(1);
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${apiUrl}/enhanced-docs/employees`);
            const data = await response.json();
            setEmployees(data.employees || []);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchDocumentTypes = async () => {
        try {
            const response = await fetch(`${apiUrl}/enhanced-docs/types`);
            const data = await response.json();
            setDocumentTypes(data.document_types || []);
        } catch (error) {
            console.error('Failed to fetch document types:', error);
        }
    };

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        if (selectedDocType) {
            loadPrefillData(employee.employee_id, selectedDocType);
        }
    };

    const handleDocTypeSelect = (docType) => {
        setSelectedDocType(docType);
        const docConfig = documentTypes.find(dt => dt.type === docType);
        if (docConfig) {
            setRoiFields(docConfig.roi_fields);
            if (selectedEmployee) {
                loadPrefillData(selectedEmployee.employee_id, docType);
            }
        }
    };

    const loadPrefillData = async (employeeId, docType) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/enhanced-docs/employee/${employeeId}/prefill/${docType}`);
            const data = await response.json();
            if (data.prefill_data) {
                setFormData(data.prefill_data);
            }
        } catch (error) {
            console.error('Failed to load prefill data:', error);
        } finally {
            setIsLoading(false);
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
                setCurrentStep(3);
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
            const response = await fetch(`${apiUrl}/enhanced-docs/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: selectedEmployee.employee_id,
                    doc_type: selectedDocType,
                    roi_data: formData
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                alert('Document generated and saved successfully! Employee can now download it.');
                setCurrentStep(4);
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

    const canProceedToFill = selectedEmployee && selectedDocType;
    const canPreview = canProceedToFill && Object.keys(formData).length > 0;

    if (!isOpen) return null;

    const selectedDocConfig = documentTypes.find(dt => dt.type === selectedDocType);

    return (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div className="card glass-panel" style={{ 
                width: '100%', 
                maxWidth: '1400px', 
                height: '90vh', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '1.5rem', 
                    borderBottom: '1px solid #E5E7EB', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📄 Enhanced Document Generator</h2>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                            Select employee → Choose document type → Fill ROI fields → Preview → Generate & Send
                        </p>
                    </div>
                    <button 
                        className="btn" 
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Steps */}
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    background: '#F8F9FA', 
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem'
                }}>
                    {[
                        { step: 1, label: 'Select Employee & Document', icon: '👤' },
                        { step: 2, label: 'Fill ROI Fields', icon: '📝' },
                        { step: 3, label: 'Preview Document', icon: '👁️' },
                        { step: 4, label: 'Generate & Send', icon: '✅' }
                    ].map(({ step, label, icon }) => (
                        <div key={step} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            opacity: currentStep >= step ? 1 : 0.5,
                            fontWeight: currentStep === step ? 'bold' : 'normal',
                            color: currentStep >= step ? '#10B981' : '#6B7280'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                            <span style={{ fontSize: '0.9rem' }}>{label}</span>
                            {step < 4 && <span style={{ margin: '0 0.5rem', color: '#D1D5DB' }}>→</span>}
                        </div>
                    ))}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    
                    {/* Left Panel - Selection & Form */}
                    <div style={{ 
                        width: currentStep >= 3 ? '50%' : '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        borderRight: currentStep >= 3 ? '1px solid #E5E7EB' : 'none',
                        transition: 'width 0.3s ease'
                    }}>
                        
                        {/* Step 1: Employee & Document Selection */}
                        {currentStep === 1 && (
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    
                                    {/* Employee Selection */}
                                    <div>
                                        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                                            👤 Select Employee
                                        </h3>
                                        <div style={{ 
                                            maxHeight: '400px', 
                                            overflowY: 'auto',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px'
                                        }}>
                                            {employees.map(employee => (
                                                <div 
                                                    key={employee.employee_id}
                                                    onClick={() => handleEmployeeSelect(employee)}
                                                    style={{
                                                        padding: '1rem',
                                                        borderBottom: '1px solid #F3F4F6',
                                                        cursor: 'pointer',
                                                        background: selectedEmployee?.employee_id === employee.employee_id ? '#EBF8FF' : 'white',
                                                        borderLeft: selectedEmployee?.employee_id === employee.employee_id ? '4px solid #3B82F6' : '4px solid transparent'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 'bold', color: '#1F2937' }}>
                                                        {employee.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                        {employee.employee_id} • {employee.employment_type} • {employee.position}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Document Type Selection */}
                                    <div>
                                        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
                                            📄 Select Document Type
                                        </h3>
                                        <div style={{ 
                                            display: 'grid', 
                                            gap: '0.75rem'
                                        }}>
                                            {documentTypes.map(docType => (
                                                <div 
                                                    key={docType.type}
                                                    onClick={() => handleDocTypeSelect(docType.type)}
                                                    style={{
                                                        padding: '1rem',
                                                        border: '2px solid',
                                                        borderColor: selectedDocType === docType.type ? '#3B82F6' : '#E5E7EB',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        background: selectedDocType === docType.type ? '#EBF8FF' : 'white',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 'bold', color: '#1F2937' }}>
                                                        {docType.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                        {Object.keys(docType.roi_fields).length} fields to fill
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Next Button */}
                                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        disabled={!canProceedToFill}
                                        className="btn btn-primary"
                                        style={{ 
                                            padding: '0.75rem 2rem',
                                            fontSize: '1rem',
                                            background: canProceedToFill ? '#3B82F6' : '#9CA3AF'
                                        }}
                                    >
                                        Next: Fill ROI Fields →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: ROI Fields Form */}
                        {currentStep === 2 && selectedDocConfig && (
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>
                                        📝 Fill ROI Fields for {selectedDocConfig.name}
                                    </h3>
                                    <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                                        Employee: <strong>{selectedEmployee.name}</strong> ({selectedEmployee.employee_id})
                                    </p>
                                </div>

                                {isLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div>Loading prefill data...</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                        {Object.entries(roiFields).map(([fieldName, fieldConfig]) => (
                                            <div key={fieldName}>
                                                <label style={{ 
                                                    display: 'block', 
                                                    marginBottom: '0.5rem', 
                                                    fontWeight: '500',
                                                    color: '#374151'
                                                }}>
                                                    {fieldConfig.label}
                                                    {fieldConfig.required && <span style={{ color: '#EF4444' }}>*</span>}
                                                </label>
                                                {fieldConfig.type === 'textarea' ? (
                                                    <textarea
                                                        value={formData[fieldName] || ''}
                                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                                        rows={3}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                ) : (
                                                    <input
                                                        type={fieldConfig.type === 'number' ? 'number' : fieldConfig.type === 'date' ? 'date' : 'text'}
                                                        value={formData[fieldName] || ''}
                                                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="btn btn-secondary"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handlePreview}
                                        disabled={!canPreview || isPreviewing}
                                        className="btn btn-primary"
                                        style={{ 
                                            background: canPreview ? '#10B981' : '#9CA3AF'
                                        }}
                                    >
                                        {isPreviewing ? 'Generating Preview...' : 'Preview Document →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {currentStep === 4 && (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                                <h3 style={{ color: '#10B981', marginBottom: '1rem' }}>Document Generated Successfully!</h3>
                                <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
                                    The document has been generated and saved. The employee can now download it from their dashboard.
                                </p>
                                <button
                                    onClick={() => {
                                        resetForm();
                                        onClose();
                                    }}
                                    className="btn btn-primary"
                                >
                                    Generate Another Document
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Preview */}
                    {currentStep === 3 && (
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', background: '#F9FAFB' }}>
                            <div style={{ 
                                padding: '1rem', 
                                borderBottom: '1px solid #E5E7EB', 
                                background: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h4 style={{ margin: 0, color: '#374151' }}>📄 Document Preview</h4>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="btn btn-secondary"
                                    >
                                        ← Edit Fields
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="btn btn-primary"
                                        style={{ background: '#10B981' }}
                                    >
                                        {isGenerating ? 'Generating...' : '✅ Generate & Send'}
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '1rem' }}>
                                {previewBase64 ? (
                                    <iframe
                                        src={previewBase64}
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            border: '1px solid #D1D5DB', 
                                            borderRadius: '8px',
                                            background: 'white'
                                        }}
                                        title="Document Preview"
                                    />
                                ) : (
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'center', 
                                        alignItems: 'center', 
                                        height: '100%',
                                        color: '#9CA3AF'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                            <div>Preview will appear here</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnhancedDocumentGenerator;