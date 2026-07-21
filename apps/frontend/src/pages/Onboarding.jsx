import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ShieldCheck, User, GraduationCap, CreditCard, Briefcase,
    CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Upload, Lock
} from 'lucide-react';
import { API_URL } from '../config';
import { apiSend, apiGet } from '../lib/api';
import toast from '../lib/toast';

const STEPS = [
    { key: 'personal',   label: 'Personal',   icon: User },
    { key: 'education',  label: 'Education',  icon: GraduationCap },
    { key: 'financial',  label: 'IDs & Bank', icon: CreditCard },
    { key: 'experience', label: 'Experience', icon: Briefcase },
];

const emptyEducation = () => ({
    institution_name: '', board_university: '', department: '',
    score: '', start_year: '', end_year: '', certificate_base64: ''
});

const emptyExperience = () => ({
    company_name: '', designation: '', years: '',
    reason_for_leaving: '', payslip_base64: ''
});

const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
});

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

const Field = ({ label, children, required }) => (
    <div className="ds-field" style={{ marginBottom: 0 }}>
        <label>{label}{required && <span style={{ color: 'var(--absent)' }}> *</span>}</label>
        {children}
    </div>
);

const FileField = ({ label, value, onChange, required }) => (
    <Field label={label} required={required}>
        <label className={`ds-upload${value ? ' has-file' : ''}`}>
            <input
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={onChange}
            />
            {value ? <><CheckCircle2 size={14} /> File attached</> : <><Upload size={14} /> Choose file</>}
        </label>
    </Field>
);

const EducationBlock = ({ title, value, onChange, onFile }) => (
    <div className="ds-subpanel">
        <div className="ds-subpanel-title">{title}</div>
        <div className="ds-row two" style={{ marginBottom: 16 }}>
            <Field label="Institution">
                <input type="text" value={value.institution_name}
                    onChange={e => onChange('institution_name', e.target.value)}
                    placeholder="School / college name" />
            </Field>
            <Field label="Board / University">
                <input type="text" value={value.board_university}
                    onChange={e => onChange('board_university', e.target.value)} />
            </Field>
        </div>
        <div className="ds-row three" style={{ marginBottom: 16 }}>
            <Field label="Stream / Department">
                <input type="text" value={value.department}
                    onChange={e => onChange('department', e.target.value)} />
            </Field>
            <Field label="Score (% or CGPA)">
                <input type="text" value={value.score}
                    onChange={e => onChange('score', e.target.value)} />
            </Field>
            <Field label="Years">
                <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={value.start_year} placeholder="From"
                        onChange={e => onChange('start_year', e.target.value)} />
                    <input type="text" value={value.end_year} placeholder="To"
                        onChange={e => onChange('end_year', e.target.value)} />
                </div>
            </Field>
        </div>
        <FileField label="Certificate" value={value.certificate_base64} onChange={onFile} />
    </div>
);

/* ------------------------------------------------------------------ */

const Onboarding = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token');

    const [phase, setPhase] = useState('verifying'); // verifying | invalid | password | form | done
    const [invite, setInvite] = useState(null);
    const [error, setError] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        full_name: '', dob: '', phone: '', address: '',
        father_name: '', mother_name: '', siblings_details: '',
        pan_no: '', pf_number: '', uan_number: '',
        bank_name: '', account_number: '', ifsc_code: '', cif_number: '',
        passport_photo_base64: '', pan_card_base64: '', bank_passbook_base64: '',
        has_experience: false,
    });
    const [ssc, setSsc] = useState(emptyEducation());
    const [inter, setInter] = useState(emptyEducation());
    const [ug, setUg] = useState(emptyEducation());
    const [experience, setExperience] = useState([emptyExperience()]);

    /* ---------- entry: invite token, or an already signed-in employee ---------- */
    useEffect(() => {
        (async () => {
            // Path A — arrived from the invite email
            if (token) {
                try {
                    const data = await apiGet(`${API_URL}/auth/onboarding/verify?token=${encodeURIComponent(token)}`);
                    if (!data.valid) {
                        setPhase('invalid');
                        setError(data.error || 'This onboarding link is not valid.');
                        return;
                    }
                    setInvite(data);
                    setForm(f => ({ ...f, full_name: data.name || '' }));
                    setPhase(data.password_set ? 'form' : 'password');
                } catch (err) {
                    setPhase('invalid');
                    setError(err.message);
                }
                return;
            }

            // Path B — already signed in and resuming (or fixing a rejection)
            const saved = sessionStorage.getItem('user');
            const session = saved ? JSON.parse(saved) : null;
            if (session?.employee_id && ['onboarding', 'rejected'].includes(session.status)) {
                setInvite({
                    name: session.name,
                    email: session.email,
                    employee_id: session.employee_id,
                    company_name: session.company_name,
                });
                setForm(f => ({ ...f, full_name: session.name || '' }));
                setRejectionReason(session.rejection_reason || '');
                setPhase('form');
                return;
            }

            setPhase('invalid');
            setError(
                session
                    ? 'There is nothing to complete on your profile right now.'
                    : 'This link is missing its onboarding token. Please use the link from your invite email.'
            );
        })();
    }, [token]);

    /* ---------- handlers ---------- */
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleFile = async (setter, key) => async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Files must be under 5 MB.');
            return;
        }
        try {
            const b64 = await readFile(file);
            setter(key, b64);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (password.length < 8) return toast.error('Password must be at least 8 characters.');
        if (password !== confirm) return toast.error('Passwords do not match.');

        setSaving(true);
        try {
            await apiSend(`${API_URL}/auth/onboarding/set-password`, 'POST', { token, password });
            toast.success('Password set. Now complete your profile.');
            setPhase('form');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const validateStep = () => {
        if (step === 0) {
            if (!form.dob) return 'Date of birth is required.';
            if (!form.father_name?.trim()) return "Father's name is required.";
            if (!form.mother_name?.trim()) return "Mother's name is required.";
        }
        if (step === 2) {
            if (!form.pan_no?.trim()) return 'PAN number is required.';
            if (!form.account_number?.trim()) return 'Bank account number is required.';
            if (!form.ifsc_code?.trim()) return 'IFSC code is required.';
        }
        return null;
    };

    const next = () => {
        const err = validateStep();
        if (err) return toast.error(err);
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const handleSubmit = async () => {
        const err = validateStep();
        if (err) return toast.error(err);

        setSaving(true);
        try {
            await apiSend(`${API_URL}/employee/onboarding/submit`, 'POST', {
                employee_id: invite.employee_id,
                ...form,
                ssc_details: ssc,
                inter_details: inter,
                ug_details: ug,
                experience_list: form.has_experience ? experience : [],
            });
            setPhase('done');
        } catch (e2) {
            toast.error(e2.message);
        } finally {
            setSaving(false);
        }
    };

    /* ---------- render states ---------- */

    if (phase === 'verifying') {
        return (
            <div className="ds ds-onboard-shell">
                <div className="ds-loading"><div className="ds-spinner" />Checking your invitation…</div>
            </div>
        );
    }

    if (phase === 'invalid') {
        return (
            <div className="ds ds-onboard-shell">
                <div className="ds-panel roomier ds-onboard-card" style={{ textAlign: 'center' }}>
                    <AlertTriangle size={30} color="var(--absent)" style={{ marginBottom: 12 }} />
                    <h1 className="ds-onboard-title">Link not valid</h1>
                    <p className="ds-modal-copy">{error}</p>
                    <button className="ds-btn" onClick={() => navigate('/login')}>Go to sign in</button>
                </div>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="ds ds-onboard-shell">
                <div className="ds-panel roomier ds-onboard-card" style={{ textAlign: 'center' }}>
                    <CheckCircle2 size={34} color="var(--present)" style={{ marginBottom: 12 }} />
                    <h1 className="ds-onboard-title">Submitted for review</h1>
                    <p className="ds-modal-copy">
                        Thanks {invite?.name?.split(' ')[0] || ''} — your details have been sent to your
                        HR team. You'll get an email once they've been reviewed, and full access will be
                        enabled then.
                    </p>
                    <button className="ds-submit-btn" onClick={() => navigate('/login')}>Go to sign in</button>
                </div>
            </div>
        );
    }

    if (phase === 'password') {
        return (
            <div className="ds ds-onboard-shell">
                <div className="ds-panel roomier ds-onboard-card">
                    <div className="ds-onboard-brand">
                        <div className="ds-icon"><ShieldCheck size={17} /></div>
                        <div>
                            <div className="ds-onboard-eyebrow">{invite?.company_name || 'NeuzenAI'}</div>
                            <h1 className="ds-onboard-title" style={{ margin: 0 }}>Set your password</h1>
                        </div>
                    </div>

                    <p className="ds-modal-copy">
                        Welcome, <strong>{invite?.name}</strong>. Choose a password for <strong>{invite?.email}</strong>,
                        then complete your profile.
                    </p>

                    <form onSubmit={handleSetPassword}>
                        <div className="ds-field">
                            <label>New password</label>
                            <input type="password" value={password} autoFocus
                                onChange={e => setPassword(e.target.value)}
                                placeholder="At least 8 characters" />
                        </div>
                        <div className="ds-field">
                            <label>Confirm password</label>
                            <input type="password" value={confirm}
                                onChange={e => setConfirm(e.target.value)} />
                        </div>
                        <button type="submit" className="ds-submit-btn" style={{ width: '100%' }} disabled={saving}>
                            {saving ? 'Saving…' : <><Lock size={14} /> Set password & continue</>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    /* ---------- the form ---------- */
    const StepIcon = STEPS[step].icon;

    return (
        <div className="ds ds-onboard-shell wide">
            <div className="ds-onboard-card wide">

                <div className="ds-onboard-brand" style={{ marginBottom: 20 }}>
                    <div className="ds-icon"><ShieldCheck size={17} /></div>
                    <div>
                        <div className="ds-onboard-eyebrow">{invite?.company_name || 'NeuzenAI'}</div>
                        <h1 className="ds-onboard-title" style={{ margin: 0 }}>Complete your profile</h1>
                    </div>
                </div>

                {rejectionReason && (
                    <div className="ds-banner" style={{ marginBottom: 18 }}>
                        <div className="left">
                            <AlertTriangle size={16} />
                            <span><strong>Changes requested by HR:</strong> {rejectionReason}</span>
                        </div>
                    </div>
                )}

                {/* Stepper */}
                <div className="ds-stepper">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const state = i < step ? 'done' : i === step ? 'active' : '';
                        return (
                            <div key={s.key} className={`ds-step ${state}`}>
                                <span className="dot">{i < step ? <CheckCircle2 size={13} /> : <Icon size={13} />}</span>
                                <span className="lbl">{s.label}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="ds-panel roomier">
                    <div className="ds-panel-title serif-xl">
                        <span className="ic-box"><StepIcon size={14} /></span>
                        {STEPS[step].label}
                    </div>

                    {/* ---- Step 1: personal & family ---- */}
                    {step === 0 && (
                        <>
                            <div className="ds-row two" style={{ marginBottom: 18 }}>
                                <Field label="Full name (as per PAN)" required>
                                    <input type="text" value={form.full_name}
                                        onChange={e => set('full_name', e.target.value)} />
                                </Field>
                                <Field label="Date of birth" required>
                                    <input type="date" value={form.dob}
                                        onChange={e => set('dob', e.target.value)} />
                                </Field>
                            </div>
                            <div className="ds-row two" style={{ marginBottom: 18 }}>
                                <Field label="Phone number">
                                    <input type="text" value={form.phone}
                                        onChange={e => set('phone', e.target.value)} />
                                </Field>
                                <FileField label="Passport photo" value={form.passport_photo_base64}
                                    onChange={handleFile(set, 'passport_photo_base64')} />
                            </div>
                            <div className="ds-field">
                                <label>Current address</label>
                                <textarea rows="2" value={form.address}
                                    onChange={e => set('address', e.target.value)} />
                            </div>

                            <div className="ds-subpanel">
                                <div className="ds-subpanel-title">Family details</div>
                                <div className="ds-row two" style={{ marginBottom: 16 }}>
                                    <Field label="Father's name" required>
                                        <input type="text" value={form.father_name}
                                            onChange={e => set('father_name', e.target.value)} />
                                    </Field>
                                    <Field label="Mother's name" required>
                                        <input type="text" value={form.mother_name}
                                            onChange={e => set('mother_name', e.target.value)} />
                                    </Field>
                                </div>
                                <Field label="Siblings (name & relation)">
                                    <textarea rows="2" value={form.siblings_details}
                                        onChange={e => set('siblings_details', e.target.value)}
                                        placeholder="e.g. Priya Sharma — sister" />
                                </Field>
                            </div>
                        </>
                    )}

                    {/* ---- Step 2: education ---- */}
                    {step === 1 && (
                        <>
                            <EducationBlock title="SSC / 10th" value={ssc}
                                onChange={(k, v) => setSsc(p => ({ ...p, [k]: v }))}
                                onFile={handleFile((k, v) => setSsc(p => ({ ...p, [k]: v })), 'certificate_base64')} />
                            <EducationBlock title="Intermediate / 12th" value={inter}
                                onChange={(k, v) => setInter(p => ({ ...p, [k]: v }))}
                                onFile={handleFile((k, v) => setInter(p => ({ ...p, [k]: v })), 'certificate_base64')} />
                            <EducationBlock title="Undergraduate" value={ug}
                                onChange={(k, v) => setUg(p => ({ ...p, [k]: v }))}
                                onFile={handleFile((k, v) => setUg(p => ({ ...p, [k]: v })), 'certificate_base64')} />
                        </>
                    )}

                    {/* ---- Step 3: IDs & bank ---- */}
                    {step === 2 && (
                        <>
                            <div className="ds-row three" style={{ marginBottom: 18 }}>
                                <Field label="PAN number" required>
                                    <input type="text" value={form.pan_no}
                                        onChange={e => set('pan_no', e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F" />
                                </Field>
                                <Field label="PF number">
                                    <input type="text" value={form.pf_number}
                                        onChange={e => set('pf_number', e.target.value)} />
                                </Field>
                                <Field label="UAN number">
                                    <input type="text" value={form.uan_number}
                                        onChange={e => set('uan_number', e.target.value)} />
                                </Field>
                            </div>

                            <div className="ds-subpanel">
                                <div className="ds-subpanel-title">Bank account (for salary)</div>
                                <div className="ds-row two" style={{ marginBottom: 16 }}>
                                    <Field label="Bank name">
                                        <input type="text" value={form.bank_name}
                                            onChange={e => set('bank_name', e.target.value)} />
                                    </Field>
                                    <Field label="Account number" required>
                                        <input type="text" value={form.account_number}
                                            onChange={e => set('account_number', e.target.value)} />
                                    </Field>
                                </div>
                                <div className="ds-row two">
                                    <Field label="IFSC code" required>
                                        <input type="text" value={form.ifsc_code}
                                            onChange={e => set('ifsc_code', e.target.value.toUpperCase())} />
                                    </Field>
                                    <Field label="CIF number">
                                        <input type="text" value={form.cif_number}
                                            onChange={e => set('cif_number', e.target.value)} />
                                    </Field>
                                </div>
                            </div>

                            <div className="ds-row two">
                                <FileField label="PAN card" value={form.pan_card_base64}
                                    onChange={handleFile(set, 'pan_card_base64')} />
                                <FileField label="Bank passbook / cheque" value={form.bank_passbook_base64}
                                    onChange={handleFile(set, 'bank_passbook_base64')} />
                            </div>
                        </>
                    )}

                    {/* ---- Step 4: experience ---- */}
                    {step === 3 && (
                        <>
                            <label className="ds-radio" style={{ marginBottom: 18 }}>
                                <input type="checkbox" checked={form.has_experience}
                                    onChange={e => set('has_experience', e.target.checked)} />
                                <span>I have previous work experience</span>
                            </label>

                            {!form.has_experience ? (
                                <div className="ds-empty" style={{ padding: '30px 20px' }}>
                                    No previous employment to add — you're ready to submit.
                                </div>
                            ) : (
                                <>
                                    {experience.map((exp, i) => (
                                        <div className="ds-subpanel" key={i}>
                                            <div className="ds-subpanel-title">
                                                Employer {i + 1}
                                                {experience.length > 1 && (
                                                    <button type="button" className="ds-link"
                                                        style={{ marginLeft: 'auto', color: 'var(--absent)' }}
                                                        onClick={() => setExperience(p => p.filter((_, j) => j !== i))}>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="ds-row two" style={{ marginBottom: 16 }}>
                                                <Field label="Company">
                                                    <input type="text" value={exp.company_name}
                                                        onChange={e => setExperience(p => p.map((x, j) => j === i ? { ...x, company_name: e.target.value } : x))} />
                                                </Field>
                                                <Field label="Designation">
                                                    <input type="text" value={exp.designation}
                                                        onChange={e => setExperience(p => p.map((x, j) => j === i ? { ...x, designation: e.target.value } : x))} />
                                                </Field>
                                            </div>
                                            <div className="ds-row two" style={{ marginBottom: 16 }}>
                                                <Field label="Years worked">
                                                    <input type="text" value={exp.years} placeholder="e.g. 2.5"
                                                        onChange={e => setExperience(p => p.map((x, j) => j === i ? { ...x, years: e.target.value } : x))} />
                                                </Field>
                                                <Field label="Reason for leaving">
                                                    <input type="text" value={exp.reason_for_leaving}
                                                        onChange={e => setExperience(p => p.map((x, j) => j === i ? { ...x, reason_for_leaving: e.target.value } : x))} />
                                                </Field>
                                            </div>
                                            <FileField label="Last payslip" value={exp.payslip_base64}
                                                onChange={handleFile(
                                                    (k, v) => setExperience(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x)),
                                                    'payslip_base64'
                                                )} />
                                        </div>
                                    ))}
                                    <button type="button" className="ds-btn"
                                        onClick={() => setExperience(p => [...p, emptyExperience()])}>
                                        + Add another employer
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* ---- Footer ---- */}
                    <div className="ds-onboard-foot">
                        <button className="ds-btn" disabled={step === 0}
                            onClick={() => setStep(s => Math.max(0, s - 1))}>
                            <ArrowLeft size={14} /> Back
                        </button>

                        <span className="ds-step-count">Step {step + 1} of {STEPS.length}</span>

                        {step < STEPS.length - 1 ? (
                            <button className="ds-submit-btn" onClick={next}>
                                Continue <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button className="ds-submit-btn" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Submitting…' : 'Submit for review'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
