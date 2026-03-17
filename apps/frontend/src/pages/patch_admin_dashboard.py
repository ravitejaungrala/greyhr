import re

filepath = r"c:\Users\jaswa\Neuzenai\HRMS\apps\frontend\src\pages\AdminDashboard.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace setEmpRoleSetup inside row-click (Chunk 2)
pattern_rowclick = r"(in_hand_salary:\s*emp\.in_hand_salary\s*\|\|\s*0\s*\n\s*)(\}\);)"
replace_rowclick = r"\1    pan_no: emp.pan_no || '',\n                                                    pf_no: emp.pf_no || '',\n                                                    bank_name: emp.bank_details?.bank_name || '',\n                                                    bank_account: emp.bank_details?.account_number || ''\n                                                \2"

new_content = re.sub(pattern_rowclick, replace_rowclick, content)

# 2. Append Form Inputs (Chunk 3)
pattern_form = r"(<input\s+type=\"number\"\s+value=\{empRoleSetup\.in_hand_salary\}\s+[\s\S]*?/>\s*</div>\s*</div>)"

append_form = r"""\1
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
                                            </div>"""

if re.search(pattern_form, new_content):
    new_content = re.sub(pattern_form, append_form, new_content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replacement Complete")
