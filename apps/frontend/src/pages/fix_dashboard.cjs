const fs = require('fs');

const FILE_PATH = 'apps/frontend/src/pages/AdminDashboard.jsx';
const content = fs.readFileSync(FILE_PATH, 'utf8');
const lines = content.split('\n');

// Find the end of historical_docs tab
let spliceIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('HistoricalDocGenerator') && lines[i+1] && lines[i+1].includes('</div>') && lines[i+2] && lines[i+2].includes(')}')) {
        spliceIndex = i + 3; // After the closing )} 
        break;
    }
}

const truncatedContent = lines.slice(0, spliceIndex).join('\n');

const termination = `
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
                                        <input type="date" value={relievingLetterParams.joining_date} onChange={e => setRelievingLetterParams({...relievingLetterParams, joining_date: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem' }}>Relieving</label>
                                        <input type="date" value={relievingLetterParams.relieving_date} onChange={e => setRelievingLetterParams({...relievingLetterParams, relieving_date: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
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
                                        <input type="date" value={experienceCertificateParams.issue_date} onChange={e => setExperienceCertificateParams({...experienceCertificateParams, issue_date: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem' }}>Grade</label>
                                        <select value={experienceCertificateParams.performance_summary} onChange={e => setExperienceCertificateParams({...experienceCertificateParams, performance_summary: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
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
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}><input type="checkbox" onChange={e => setSelectedPayslipEmployees(e.target.checked ? approvedEmployees.map(x=>x.employee_id) : [])} /></th>
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
                                    for(const id of selectedPayslipEmployees) {
                                        const emp = approvedEmployees.find(e => e.employee_id === id);
                                        await fetch(\`\${apiUrl}/enhanced-docs/generate\`, {
                                            method: 'POST',
                                            headers: {'Content-Type': 'application/json'},
                                            body: JSON.stringify({ employee_id: id, doc_type: 'payslip', roi_data: { emp_name: emp.name, month_year: payslipManagerMonth, gross_salary: emp.monthly_salary || 50000, net_salary: emp.monthly_salary ? emp.monthly_salary - 200 : 49800 }})
                                        });
                                    }
                                    alert('Successfully generated and sent payslips!');
                                } catch(err) { alert('Failed to send some payslips.'); }
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
                           <div><label style={{fontSize:'0.8rem'}}>Full Name</label><input className="premium-input" value={addEmpForm.name} onChange={e=>setAddEmpForm({...addEmpForm, name:e.target.value})} style={{width:'100%', padding:'0.75rem', border:'1px solid #e2e8f0', borderRadius:'8px'}} /></div>
                           <div><label style={{fontSize:'0.8rem'}}>Personal Email</label><input className="premium-input" value={addEmpForm.personal_email} onChange={e=>setAddEmpForm({...addEmpForm, personal_email:e.target.value})} style={{width:'100%', padding:'0.75rem', border:'1px solid #e2e8f0', borderRadius:'8px'}} /></div>
                           <div><label style={{fontSize:'0.8rem'}}>Password</label><input type="password" value={addEmpForm.password} onChange={e=>setAddEmpForm({...addEmpForm, password:e.target.value})} style={{width:'100%', padding:'0.75rem', border:'1px solid #e2e8f0', borderRadius:'8px'}} /></div>
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
`;

fs.writeFileSync(FILE_PATH, truncatedContent + termination);
console.log('SUCCESS: AdminDashboard.jsx fixed with FULL features (v3).');
