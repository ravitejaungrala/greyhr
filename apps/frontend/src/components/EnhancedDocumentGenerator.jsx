import React, { useState, useEffect } from 'react';
import { 
    FileText, X, User, FileSignature, 
    Eye, CheckCircle2, ChevronLeft, 
    ChevronRight, Search, Info 
} from 'lucide-react';

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
            background: 'rgba(0,0,0,0.45)', 
            backdropFilter: 'blur(12px)',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            padding: '1.5rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="card glass-panel shadow-premium animate-zoom-in" style={{ 
                width: '100%', 
                maxWidth: '1200px', 
                height: '85vh', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                borderRadius: '24px'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '1.75rem 2rem', 
                    borderBottom: '1px solid rgba(0,0,0,0.05)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'var(--main-gradient)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.02em' }}>
                             <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '12px', display: 'flex' }}><FileText size={28} /></div>
                             Enhanced Document Generator
                        </h2>
                        <p style={{ margin: '0.4rem 0 0 0', opacity: 0.85, fontSize: '0.85rem', fontWeight: 500 }}>
                            Intelligent ROI-based automated document generation system.
                        </p>
                    </div>
                    <button 
                        className="btn-close-premium" 
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.6rem', borderRadius: '12px', display: 'flex', transition: 'all 0.2s' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div style={{ 
                    padding: '0 2rem', 
                    background: '#ffffff', 
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    height: '70px',
                    position: 'relative'
                }}>
                    {[
                        { step: 1, label: 'Identify', icon: <User size={18} /> },
                        { step: 2, label: 'Configure', icon: <FileSignature size={18} /> },
                        { step: 3, label: 'Verify', icon: <Eye size={18} /> },
                        { step: 4, label: 'Dispatch', icon: <CheckCircle2 size={18} /> }
                    ].map(({ step, label, icon }, idx) => (
                        <React.Fragment key={step}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem',
                                position: 'relative',
                                opacity: currentStep >= step ? 1 : 0.4,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <div style={{ 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '10px', 
                                    background: currentStep === step ? 'var(--main-gradient)' : (currentStep > step ? '#22c55e' : '#f1f5f9'),
                                    color: currentStep >= step ? 'white' : '#64748b',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    boxShadow: currentStep === step ? '0 4px 12px rgba(255, 69, 0, 0.3)' : 'none',
                                    transition: 'all 0.4s'
                                }}>
                                    {currentStep > step ? <CheckCircle2 size={18} /> : icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step {step}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentStep === step ? '#000' : '#64748b' }}>{label}</span>
                                </div>
                            </div>
                            {idx < 3 && (
                                <div style={{ flex: 1, height: '2px', margin: '0 1.5rem', background: currentStep > step ? '#22c55e' : '#f1f5f9', borderRadius: '10px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: currentStep > step ? '100%' : '0%', background: '#22c55e', transition: 'width 0.4s ease' }} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    
                    {/* Left Panel - Selection & Form */}
                    <div style={{ 
                        width: currentStep >= 4 ? '100%' : (currentStep === 3 ? '50%' : '100%'), 
                        display: 'flex', 
                        flexDirection: 'column',
                        borderRight: currentStep === 3 ? '1px solid #f1f5f9' : 'none',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden'
                    }}>
                        
                        {/* Step 1: Employee & Document Selection */}
                        {currentStep === 1 && (
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    
                                    {/* Employee Selection */}
                                    <div>
                                        <h3 style={{ marginBottom: '1rem', color: '#000000' }}>
                                            <User size={18} /> Select Employee
                                        </h3>
                                        <div style={{ 
                                            maxHeight: '400px', 
                                            overflowY: 'auto',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px'
                                        }}>
                                            {employees.map(employee => (
                                                <div 
                                                    key={employee.employee_id}
                                                    onClick={() => handleEmployeeSelect(employee)}
                                                    className="employee-card-premium"
                                                    style={{
                                                        padding: '1.25rem',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        cursor: 'pointer',
                                                        background: selectedEmployee?.employee_id === employee.employee_id ? 'rgba(34, 197, 94, 0.05)' : 'white',
                                                        borderLeft: selectedEmployee?.employee_id === employee.employee_id ? '4px solid #22c55e' : '4px solid transparent',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                                                        {employee.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', borderRadius: '4px', display: 'flex', gap: '0.5rem' }}>
                                                        <span>{employee.employee_id}</span>
                                                        <span>•</span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{employee.employment_type}</span>
                                                        <span>•</span>
                                                        <span>{employee.position}</span>
                                                    </div>
                                                    {selectedEmployee?.employee_id === employee.employee_id && (
                                                        <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#22c55e' }}>
                                                            <CheckCircle2 size={18} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Document Type Selection */}
                                    <div>
                                        <h3 style={{ marginBottom: '1rem', color: '#000000' }}>
                                            <FileText size={18} /> Select Document Type
                                        </h3>
                                        <div style={{ 
                                            display: 'grid', 
                                            gap: '1rem'
                                        }}>
                                            {documentTypes.map(docType => (
                                                <div 
                                                    key={docType.type}
                                                    onClick={() => handleDocTypeSelect(docType.type)}
                                                    className="doc-type-card-premium"
                                                    style={{
                                                        padding: '1.25rem',
                                                        border: '2px solid',
                                                        borderColor: selectedDocType === docType.type ? '#ff4500' : '#f1f5f9',
                                                        borderRadius: '16px',
                                                        cursor: 'pointer',
                                                        background: selectedDocType === docType.type ? 'rgba(255, 69, 0, 0.04)' : '#ffffff',
                                                        transition: 'all 0.3s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem'
                                                    }}
                                                >
                                                    <div style={{ 
                                                        width: '44px', 
                                                        height: '44px', 
                                                        background: selectedDocType === docType.type ? 'var(--main-gradient)' : '#f8fafc',
                                                        borderRadius: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: selectedDocType === docType.type ? 'white' : '#64748b'
                                                    }}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                                                            {docType.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                                            Auto-populates {Object.keys(docType.roi_fields).length} key data points
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={18} color={selectedDocType === docType.type ? '#ff4500' : '#cbd5e1'} />
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
                                            background: canProceedToFill ? '#ff4500' : '#000000'
                                        }}
                                    >
                                        Next: Fill ROI Fields <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: ROI Fields Form */}
                        {currentStep === 2 && selectedDocConfig && (
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <div style={{ marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                    <h3 style={{ color: '#0f172a', marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
                                        Configure {selectedDocConfig.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
                                            Editing profile for <strong>{selectedEmployee.name}</strong> • {selectedEmployee.employee_id}
                                        </p>
                                    </div>
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
                                                    color: '#000000'
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
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        onClick={handlePreview}
                                        disabled={!canPreview || isPreviewing}
                                        className="btn btn-primary"
                                        style={{ 
                                            background: canPreview ? '#ff4500' : '#000000'
                                        }}
                                    >
                                        {isPreviewing ? 'Generating Preview...' : <>Preview Document <ChevronRight size={16} /></>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Success */}
                        {currentStep === 4 && (
                            <div className="animate-fade-in" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.05) 0%, transparent 70%)' }}>
                                <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                                    <div className="success-icon-container" style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 2rem' }}>
                                        <div className="success-circle" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#f0fdf4', border: '4px solid #bbf7d0' }} />
                                        <div className="success-icon" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', animation: 'successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                                            <CheckCircle2 size={64} strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#000', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
                                        Success! Document Dispatched
                                    </h3>
                                    
                                    <div className="summary-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '2.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', textAlign: 'left' }}>
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                               <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Employee</span>
                                               <span style={{ fontSize: '0.85rem', color: '#000', fontWeight: 700 }}>{selectedEmployee?.name}</span>
                                           </div>
                                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                               <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Document Type</span>
                                               <span style={{ fontSize: '0.85rem', color: '#000', fontWeight: 700 }}>{selectedDocConfig?.name}</span>
                                           </div>
                                           <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                               <CheckCircle2 size={14} /> Available for download in Employee Dashboard
                                           </div>
                                       </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => {
                                                resetForm();
                                                onClose();
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.85rem 1.5rem', borderRadius: '12px', fontWeight: 600 }}
                                        >
                                            Done
                                        </button>
                                        <button
                                            onClick={() => resetForm()}
                                            className="btn btn-primary"
                                            style={{ padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700, background: 'var(--main-gradient)' }}
                                        >
                                            <FileText size={18} /> Generate Another
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Preview */}
                    {currentStep === 3 && (
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', background: '#F9FAFB' }}>
                            <div style={{ 
                                padding: '1rem', 
                                borderBottom: '1px solid #e2e8f0', 
                                background: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h4 style={{ margin: 0, color: '#000000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Document Preview</h4>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="btn btn-secondary"
                                    >
                                        <ChevronLeft size={16} /> Edit Fields
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="btn btn-primary"
                                        style={{ background: '#ff4500' }}
                                    >
                                        {isGenerating ? 'Generating...' : <><CheckCircle2 size={18} /> Generate & Send</>}
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
                                        color: '#000000'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ marginBottom: '1rem' }}><FileText size={48} color="#D1D5DB" /></div>
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