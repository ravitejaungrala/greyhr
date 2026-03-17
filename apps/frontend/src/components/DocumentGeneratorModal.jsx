import React, { useState, useEffect } from 'react';
import { base64ToBlobUrl } from '../utils';

const DocumentGeneratorModal = ({ isOpen, onClose, employee, docType, apiUrl, initialData }) => {
    const [schema, setSchema] = useState(null);
    const [formData, setFormData] = useState({});
    const [rawText, setRawText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [previewBase64, setPreviewBase64] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        if (isOpen && docType) {
            fetchFields();
            // Pre-fill initial known data
            setFormData(initialData || {});
            setPreviewBase64(null);
            setRawText('');
        }
        return () => {
            if (previewBase64 && previewBase64.startsWith('blob:')) {
                URL.revokeObjectURL(previewBase64);
            }
        };
    }, [isOpen, docType, initialData]);

    const fetchFields = async () => {
        try {
            const res = await fetch(`${apiUrl}/generate-doc/fields`);
            const data = await res.json();
            if (data[docType]) {
                setSchema(data[docType]);

                // Map known employee fields if available
                const empDataMapping = {};
                if (employee) {
                    empDataMapping.bank_account = employee.bank_details?.account_number || '';
                    empDataMapping.bank_name = employee.bank_details?.bank_name || '';
                    empDataMapping.department = employee.department || '';
                    empDataMapping.uan = employee.uan || '';
                    empDataMapping.pf_no = employee.pf_no || '';
                    empDataMapping.pan_no = employee.pan_no || '';
                    empDataMapping.doj = employee.joining_date ? employee.joining_date.split('T')[0] : '';
                    empDataMapping.joining_date = employee.joining_date ? employee.joining_date.split('T')[0] : '';
                }

                // Initialize empty string for each field if not in initialData
                const initForm = { ...empDataMapping, ...initialData };
                Object.keys(data[docType]).forEach(key => {
                    if (initForm[key] === undefined || initForm[key] === null) {
                        initForm[key] = '';
                    }
                });
                setFormData(initForm);
            }
        } catch (err) {
            console.error("Failed to fetch schema", err);
        }
    };

    const handleExtract = async () => {
        if (!rawText.trim()) return alert("Please paste some text first.");
        setIsExtracting(true);
        try {
            const res = await fetch(`${apiUrl}/generate-doc/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_data: rawText, doc_type: docType })
            });
            const extracted = await res.json();
            if (extracted.error) {
                alert(extracted.error);
            } else {
                const fields = extracted.data || extracted;
                setFormData(prev => ({ ...prev, ...fields }));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to extract data via AI.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handlePreview = async () => {
        setIsPreviewing(true);
        try {
            const res = await fetch(`${apiUrl}/generate-doc/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: formData, doc_type: docType })
            });
            const data = await res.json();
            if (data.status === 'success') {
                // The backend sends html_base64 for HTML documents
                const base64Content = data.pdf_base64 || data.html_base64;
                const contentType = data.html_base64 ? 'text/html' : 'application/pdf';
                
                // Revoke old blob URL if it exists
                if (previewBase64 && previewBase64.startsWith('blob:')) {
                    URL.revokeObjectURL(previewBase64);
                }

                const blobUrl = base64ToBlobUrl(base64Content, contentType);
                setPreviewBase64(blobUrl);
            } else {
                alert(data.error || "Preview generation failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate preview.");
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        try {
        const res = await fetch(`${apiUrl}/enhanced-docs/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                employee_id: employee.employee_id,
                doc_type: docType,
                roi_data: formData 
            })
        });
            const data = await res.json();
            if (data.status === 'success') {
                // Auto-save form fields back to employee profile
                if (employee && employee.employee_id) {
                    try {
                        const updatePayload = {
                            position: formData.designation || undefined,
                            monthly_salary: formData.total_earnings ? parseInt(formData.total_earnings) : undefined,
                            joining_date: formData.doj || formData.joining_date || undefined,
                        };
                        await fetch(`${apiUrl}/admin/employee/${employee.employee_id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatePayload)
                        });
                    } catch (updateErr) {
                        console.error("Failed to auto-save employee profile", updateErr);
                    }
                }
                alert("Document successfully generated and sent to employee!");
                onClose();
            } else {
                alert(data.error || "Finalization failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to finalize document.");
        } finally {
            setIsFinalizing(false);
        }
    };

    if (!isOpen) return null;

    const modalTitle = docType.replace('_', ' ').toUpperCase() + " GENERATOR";

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '2rem' }}>
            <div className="card glass-panel" style={{ width: '100%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title" style={{ margin: 0 }}>🤖 AI {modalTitle}</h2>
                    <button className="btn" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
                    {/* LEFT PANEL: Form and Auto-fill */}
                    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #E5E7EB', overflowY: 'auto' }}>

                        {/* AI Section */}
                        <div style={{ padding: '1.5rem', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#111827' }}>AI Auto-Fill (Optional)</h3>
                            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1rem' }}>Paste raw HR text, offer details, or email threads here. AI will extract all required fields instantly.</p>
                            <textarea
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                placeholder="Paste raw unstructured text here..."
                                style={{ width: '100%', height: '100px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #D1D5DB', marginBottom: '1rem', fontFamily: 'inherit' }}
                            />
                            <button
                                onClick={handleExtract}
                                disabled={isExtracting}
                                className="btn btn-primary"
                                style={{ background: '#0a66c2', width: '100%' }}
                            >
                                {isExtracting ? 'Extracting...' : '✨ Auto-Fill with AI'}
                            </button>
                        </div>

                        {/* Form Section */}
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#111827' }}>Manual Edit & Review</h3>
                            {!schema ? <p>Loading fields...</p> : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {Object.entries(schema).map(([key, typeHint]) => (
                                        <div key={key}>
                                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                                                {key.replace(/_/g, ' ')} <span style={{ color: '#D1D5DB' }}>({typeHint})</span>
                                            </label>
                                            <input
                                                type={typeHint.includes('Date') ? 'date' : typeHint.includes('Number') ? 'number' : 'text'}
                                                value={formData[key] || ''}
                                                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E5E7EB' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', background: '#F3F4F6' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                            <span style={{ fontWeight: '600', color: '#374151' }}>Live Document Preview</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handlePreview}
                                    disabled={isPreviewing}
                                    className="btn btn-secondary"
                                    style={{ background: '#ffffff', color: '#0a66c2', borderColor: '#0a66c2' }}
                                >
                                    {isPreviewing ? 'Loading Preview...' : '👁️ Refresh Preview'}
                                </button>
                                <button
                                    onClick={handleFinalize}
                                    disabled={isFinalizing || !previewBase64}
                                    className="btn btn-primary"
                                    style={{ background: '#10B981', borderColor: '#10B981' }}
                                >
                                    {isFinalizing ? 'Finalizing...' : '✅ Send to S3 & Finalize'}
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {previewBase64 ? (
                                <iframe
                                    src={previewBase64}
                                    style={{ width: '100%', height: '100%', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    title="Document Preview"
                                />
                            ) : (
                                <div style={{ color: '#9CA3AF', textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                    Click "Refresh Preview" to generate document using current fields.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentGeneratorModal;
