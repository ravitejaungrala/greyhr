import React, { useState } from 'react';
import {
  Users, Calendar, FileText, ShieldCheck, Briefcase, ArrowRight, ChevronRight,
  ChevronDown, Layers, Zap, Lock, Sparkles, Wallet, Palmtree, Timer, BrainCircuit,
  Megaphone, BarChart3, Camera, Package, Heart, MessageSquare, FileSignature,
  Banknote, Award, GraduationCap, FileCheck, CheckCircle2, Star, Globe, Cpu,
  Rocket, TrendingUp, Clock, Database, Bot, ScrollText, IndianRupee, UserPlus,
  Building2, PieChart, Bell, Layout, Activity, Mail, Phone, MapPin
} from 'lucide-react';

const LandingPage = ({ onLoginClick }) => {
  const [openFaq, setOpenFaq] = useState(0);

  // ============== DATA ==============
  const stats = [
    { value: '10K+', label: 'Employees Managed', icon: <Users size={22} /> },
    { value: '50K+', label: 'Documents Generated', icon: <FileText size={22} /> },
    { value: '99.9%', label: 'Uptime SLA', icon: <Activity size={22} /> },
    { value: '24/7', label: 'AI Support', icon: <Bot size={22} /> },
  ];

  const modules = [
    { icon: <Users size={26} />, title: 'Workforce Directory', desc: 'Centralized employee profiles with smart search, filters, and complete employment history.', tag: 'Core' },
    { icon: <UserPlus size={26} />, title: 'Smart Onboarding', desc: 'Digital candidate setup, role assignment, salary configuration, and leave accrual policies.', tag: 'HR Ops' },
    { icon: <FileSignature size={26} />, title: 'AI Document Studio', desc: 'Generate offer letters, payslips, and certificates instantly with intelligent field prefilling.', tag: 'AI', highlight: true },
    { icon: <Wallet size={26} />, title: 'Smart Payroll', desc: 'Auto-calculate basic, HRA, special allowance, PF and tax. Batch-release payslips in one click.', tag: 'Finance' },
    { icon: <Palmtree size={26} />, title: 'Leave Management', desc: 'Privilege, sick & casual leaves with monthly accrual rates and approval workflows.', tag: 'HR Ops' },
    { icon: <Camera size={26} />, title: 'Attendance Tracking', desc: 'Face-scan check-in, real-time activity logs, and detailed presence analytics.', tag: 'Tracking' },
    { icon: <BarChart3 size={26} />, title: 'HR Analytics', desc: 'Workforce metrics, finance reports, attendance heatmaps, and custom dashboards.', tag: 'Insights' },
    { icon: <BrainCircuit size={26} />, title: 'AI Intelligence Agent', desc: 'Conversational HR specialist that answers policy questions and surfaces insights instantly.', tag: 'AI', highlight: true },
  ];

  const documentTypes = [
    { icon: <Briefcase size={20} />, name: 'Full-Time Offer', desc: 'Salary breakdown, CTC, joining date.' },
    { icon: <GraduationCap size={20} />, name: 'Internship Offer', desc: 'Stipend, duration, scope of work.' },
    { icon: <Award size={20} />, name: 'Experience Letter', desc: 'Tenure, role, professional conduct.' },
    { icon: <FileCheck size={20} />, name: 'Relieving Letter', desc: 'Last working day, no-dues format.' },
    { icon: <Banknote size={20} />, name: 'Payslip', desc: 'Earnings, deductions, net pay.' },
  ];

  const adminFeatures = [
    'Approve/reject leave requests with one click',
    'Bulk-release payslips to all employees',
    'AI-drafted offer letters with smart prefill',
    'Monitor real-time attendance & activity',
    'Push announcements & targeted alerts',
    'Role-based access (Super Admin, Admin, HR)',
  ];

  const employeeFeatures = [
    'Personal Pulse dashboard with at-a-glance status',
    'Face-scan attendance check-in',
    'Apply for leaves & track balances',
    'View salary & download payslips',
    'Item requisition for laptops, equipment',
    'NeuzenAI Specialist — your 24/7 HR copilot',
  ];

  const steps = [
    { num: '01', title: 'Set up your company', desc: 'Add employees, configure leave policies, define salary structures and tax rules.', icon: <Building2 size={22} /> },
    { num: '02', title: 'Onboard your team', desc: 'Use the digital onboarding flow to get new hires productive on day one.', icon: <UserPlus size={22} /> },
    { num: '03', title: 'Automate operations', desc: 'Let AI handle document generation, payslip releases, and routine HR queries.', icon: <Cpu size={22} /> },
    { num: '04', title: 'Grow with insights', desc: 'Use analytics dashboards to make data-driven workforce decisions.', icon: <TrendingUp size={22} /> },
  ];

  const securityPoints = [
    { icon: <Lock size={20} />, title: 'Encrypted at rest & in transit', desc: 'AES-256 encryption with TLS 1.3 for every request.' },
    { icon: <ShieldCheck size={20} />, title: 'Role-based access control', desc: 'Granular permissions for Super Admin, Admin, and Employee roles.' },
    { icon: <Database size={20} />, title: 'Audit-ready logs', desc: 'Every change tracked with timestamp and user attribution.' },
    { icon: <Globe size={20} />, title: 'India-compliant', desc: 'PF, ESIC, professional tax, and TDS handled out of the box.' },
  ];

  const testimonials = [
    {
      quote: 'NeuzenAI cut our payroll processing from 3 days to 30 minutes. The AI document studio is a game-changer.',
      author: 'Priya Sharma',
      role: 'HR Director, TechCorp',
      initials: 'PS',
    },
    {
      quote: 'We onboarded 47 employees in a single sprint. The smart prefill on offer letters saved us countless hours.',
      author: 'Rahul Mehta',
      role: 'Founder, BuildLabs',
      initials: 'RM',
    },
    {
      quote: 'Our team loves the AI Assistant — they get policy answers in seconds without bugging HR. Adoption was instant.',
      author: 'Anjali Verma',
      role: 'People Ops Lead, Finovate',
      initials: 'AV',
    },
  ];

  const faqs = [
    { q: 'How does the AI Document Generator work?', a: 'Pick an employee and a document type (offer letter, payslip, experience, relieving, internship). NeuzenAI prefills known fields from the profile, you fill any remaining ROI fields, preview the PDF live, then generate & deliver with one click.' },
    { q: 'Is my employee data secure?', a: 'Yes. Data is encrypted at rest with AES-256 and in transit with TLS 1.3. We use role-based access control and maintain full audit trails for compliance.' },
    { q: 'Does it support Indian payroll compliance?', a: 'Absolutely. PF, ESIC, professional tax, TDS calculations, and Indian holiday calendars are built in. Payslips follow standard Indian formats.' },
    { q: 'Can employees access the system themselves?', a: 'Yes. Every employee gets their own portal with the Pulse dashboard, attendance check-in, leave requests, payslip downloads, and a 24/7 AI assistant.' },
    { q: 'How long does setup take?', a: 'Most companies are fully operational within a day. Add your team, configure policies, and you’re live. We also offer white-glove onboarding for larger deployments.' },
  ];

  // ============== STYLES ==============
  const sectionPad = { padding: '5rem 1.5rem', maxWidth: '1240px', margin: '0 auto' };
  const eyebrow = {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    fontSize: '0.78rem', fontWeight: 800, color: '#ea580c',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    background: 'linear-gradient(135deg, #fff4ec 0%, #ffe1cc 100%)',
    border: '1px solid rgba(255, 140, 0, 0.25)',
    padding: '0.5rem 0.95rem', borderRadius: '999px',
    boxShadow: '0 4px 12px rgba(255, 69, 0, 0.10)',
  };
  const sectionTitle = { fontSize: 'clamp(2rem, 4vw, 2.85rem)', fontWeight: 900, color: '#0b0b0f', letterSpacing: '-0.03em', lineHeight: 1.15, margin: '1rem 0 0.85rem', textAlign: 'center' };
  const sectionSub = { fontSize: '1.05rem', color: '#475569', maxWidth: '640px', margin: '0 auto 3rem', textAlign: 'center', lineHeight: 1.6, fontWeight: 500 };
  const headerWrap = { textAlign: 'center', marginBottom: '3rem' };

  const primaryBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem',
    padding: '0.95rem 1.85rem',
    background: 'linear-gradient(90deg, #ff4500 0%, #ff8c00 50%, #ea580c 100%)',
    backgroundSize: '200% 100%', color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 14px 30px -8px rgba(255, 69, 0, 0.45), 0 6px 14px -4px rgba(234, 88, 12, 0.25)',
    transition: 'all 0.3s ease',
  };
  const secondaryBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.95rem 1.75rem', background: '#ffffff', color: '#0b0b0f',
    border: '1.5px solid #e5e7eb', borderRadius: '12px',
    fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s ease',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
  };

  return (
    <div className="landing-page" style={{ 
      overflowX: 'hidden',
      background: 'radial-gradient(at 10% 10%, rgba(168, 85, 247, 0.08) 0px, transparent 50%), radial-gradient(at 90% 10%, rgba(59, 130, 246, 0.08) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(249, 115, 22, 0.06) 0px, transparent 50%), linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh'
    }}>
      {/* Inline keyframes + responsive rules for hero */}
      <style>{`
        @keyframes nz-mesh-shift {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(30px, -20px) scale(1.06); }
          100% { transform: translate(-20px, 25px) scale(0.97); }
        }
        @keyframes nz-float-1 { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(-2deg); } }
        @keyframes nz-float-2 { 0%,100% { transform: translateY(0) rotate(1.5deg); } 50% { transform: translateY(-10px) rotate(1.5deg); } }
        @keyframes nz-float-3 { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-14px) rotate(-1deg); } }
        @keyframes nz-float-4 { 0%,100% { transform: translateY(0) rotate(2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes nz-pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
        @keyframes nz-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .nz-logos-track { display: flex; gap: 3.5rem; animation: nz-marquee 28s linear infinite; width: max-content; }

        @media (max-width: 980px) {
          .nz-hero-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .nz-hero-cards { height: 500px !important; }
          .nz-nav-links { display: none !important; }
        }
        @media (max-width: 640px) {
          .nz-hero-cards { display: none !important; }
        }
      `}</style>

      {/* ============== NAVBAR (always visible) ============== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img src="/icon (2).png" alt="NeuzenAI" style={{ width: '36px', height: '36px' }} />
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b0b0f', letterSpacing: '-0.02em' }}>
              NeuzenAI <span style={{ color: '#ea580c' }}>HRMS</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.85rem' }} className="nz-nav-links">
            {[
              { href: '#modules', label: 'Modules' },
              { href: '#document-studio', label: 'AI Studio' },
              { href: '#how-it-works', label: 'How it Works' },
              { href: '#security', label: 'Security' },
              { href: '#faq', label: 'FAQ' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ color: '#1f2937', textDecoration: 'none', fontSize: '0.92rem', fontWeight: 600, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#ea580c'}
                onMouseLeave={e => e.target.style.color = '#1f2937'}>
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button onClick={onLoginClick} style={{ ...secondaryBtn, padding: '0.55rem 1.05rem', fontSize: '0.88rem' }}>
              Sign In
            </button>
            <button onClick={onLoginClick} style={{ ...primaryBtn, padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}>
              Request Demo <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ============== HERO ============== */}
      <section style={{ position: 'relative', padding: '7.5rem 1.5rem 4rem', overflow: 'hidden' }}>
        {/* Animated mesh gradient background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: '-15%',
            backgroundImage: `
              radial-gradient(circle at 20% 25%, rgba(255, 69, 0, 0.22) 0%, transparent 35%),
              radial-gradient(circle at 80% 30%, rgba(234, 88, 12, 0.18) 0%, transparent 38%),
              radial-gradient(circle at 70% 80%, rgba(255, 140, 0, 0.20) 0%, transparent 40%),
              radial-gradient(circle at 25% 75%, rgba(251, 146, 60, 0.16) 0%, transparent 42%)
            `,
            filter: 'blur(50px)',
            animation: 'nz-mesh-shift 18s ease-in-out infinite alternate',
          }} />
          {/* Soft noise grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 85%)',
          }} />
        </div>

        <div style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: '3.5rem', alignItems: 'center' }} className="nz-hero-grid">
          {/* LEFT: text + CTAs */}
          <div>
            <div style={{ ...eyebrow, marginBottom: '1.5rem' }}>
              <Sparkles size={14} /> Enterprise HR Platform · Built for India
            </div>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.85rem)',
              fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.035em',
              margin: '0 0 1.35rem', color: '#0b0b0f',
            }}>
              The all-in-one HR<br />platform for{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ position: 'relative', zIndex: 1, color: '#0b0b0f' }}>modern teams</span>
                <span style={{
                  position: 'absolute', left: 0, right: 0, bottom: '4px', height: '14px',
                  background: 'linear-gradient(90deg, rgba(255, 140, 0, 0.45), rgba(255, 69, 0, 0.55))',
                  zIndex: 0, borderRadius: '3px',
                }} />
              </span>
            </h1>

            <p style={{ fontSize: '1.08rem', color: '#334155', lineHeight: 1.65, fontWeight: 500, margin: '0 0 2rem', maxWidth: '540px' }}>
              Onboarding, payroll, leaves, attendance, and AI-generated documents — unified in one
              compliant, secure platform. Trusted by HR leaders to run people operations end-to-end.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.85rem' }}>
              <button onClick={onLoginClick} style={primaryBtn}>
                Request a Demo <ArrowRight size={18} />
              </button>
              <button onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })} style={secondaryBtn}>
                See How It Works
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.84rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} color="#16a34a" /> SOC 2 ready</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} color="#16a34a" /> India-compliant</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={15} color="#16a34a" /> 99.9% uptime</span>
            </div>
          </div>

          {/* RIGHT: floating UI cards */}
          <div style={{ position: 'relative', height: '520px' }} className="nz-hero-cards">
            {/* Card 1 — Offer Letter */}
            <div style={{
              position: 'absolute', top: '20px', right: '0',
              width: '300px',
              background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 24px 48px -16px rgba(15, 23, 42, 0.10), 0 8px 18px -6px rgba(234, 88, 12, 0.05)',
              padding: '1.1rem 1.25rem',
              animation: 'nz-float-1 6s ease-in-out infinite',
              zIndex: 3,
            }}>
              <div style={{ height: '4px', background: 'linear-gradient(90deg, #ff4500, #ea580c)', borderRadius: '4px', marginBottom: '0.75rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #fff4ec, #ffe1cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 140, 0, 0.25)' }}>
                    <FileSignature size={17} color="#ea580c" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Offer Letter</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0b0b0f' }}>NZ-OFR-2026-001</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.22rem 0.5rem', borderRadius: '999px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} /> Sent
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1f2937', fontWeight: 600, marginBottom: '0.3rem' }}>Vennala Krishna</div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.8rem' }}>Software Engineer · ₹ 6,00,000 /yr</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#9a3412', background: '#fff7f1', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255, 140, 0, 0.20)', fontWeight: 600 }}>
                <Sparkles size={13} color="#ea580c" /> AI prefilled 12 of 14 fields
              </div>
            </div>

            {/* Card 2 — Payslip mini */}
            <div style={{
              position: 'absolute', top: '180px', left: '0',
              width: '270px',
              background: 'rgba(255, 255, 255, 0.5)', borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 24px 48px -16px rgba(15, 23, 42, 0.10)',
              padding: '1rem 1.15rem',
              animation: 'nz-float-2 7s ease-in-out infinite 0.5s',
              zIndex: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={16} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0b0b0f' }}>Payslip · Apr 2026</div>
                </div>
              </div>
              {[
                { k: 'Basic', v: '₹ 20,000' },
                { k: 'HRA', v: '₹ 10,000' },
                { k: 'Allowance', v: '₹ 20,000' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.28rem 0', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{r.k}</span>
                  <span style={{ color: '#0b0b0f', fontWeight: 700, fontFamily: 'monospace' }}>{r.v}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: '#e5e7eb', margin: '0.65rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0b0b0f' }}>Net Pay</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#16a34a', fontFamily: 'monospace' }}>₹ 49,800</span>
              </div>
            </div>

            {/* Card 3 — AI Chat */}
            <div style={{
              position: 'absolute', bottom: '20px', right: '20px',
              width: '290px',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 24px 48px -14px rgba(0, 0, 0, 0.25)',
              padding: '1.1rem 1.15rem',
              color: '#ffffff',
              animation: 'nz-float-3 6.5s ease-in-out infinite 1s',
              zIndex: 5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.10)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #ff4500, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BrainCircuit size={15} color="#fff" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>NeuzenAI Specialist</div>
                <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'nz-pulse-dot 1.6s ease-in-out infinite' }} />
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                Casual leaves left?
              </div>
              <div style={{ background: 'linear-gradient(135deg, #ff4500, #ea580c)', borderRadius: '10px', padding: '0.6rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, marginLeft: '20%', boxShadow: '0 6px 14px rgba(255, 69, 0, 0.30)' }}>
                You have <strong>4 casual leaves</strong> remaining this year.
              </div>
            </div>

            {/* Card 4 — Leave approval (small) */}
            <div style={{
              position: 'absolute', top: '0', left: '40px',
              width: '230px',
              background: 'rgba(255, 255, 255, 0.5)', borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 36px -14px rgba(15, 23, 42, 0.10)',
              padding: '0.85rem 1rem',
              animation: 'nz-float-4 7.5s ease-in-out infinite 0.8s',
              zIndex: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.6rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palmtree size={15} color="#0ea5e9" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Leave Request</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0b0b0f' }}>Rahul · 2 days</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button style={{ flex: 1, padding: '0.4rem 0.55rem', fontSize: '0.7rem', fontWeight: 700, background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={12} /> Approve
                </button>
                <button style={{ flex: 1, padding: '0.4rem 0.55rem', fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #e5e7eb', borderRadius: '7px', cursor: 'pointer' }}>
                  Decline
                </button>
              </div>
            </div>

            {/* Card 5 — Stat tile (small accent) */}
            <div style={{
              position: 'absolute', bottom: '180px', left: '0',
              width: '180px',
              background: 'rgba(234, 88, 12, 0.8)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 36px -10px rgba(234, 88, 12, 0.25)',
              padding: '0.95rem 1.1rem',
              color: '#ffffff',
              animation: 'nz-float-1 8s ease-in-out infinite 1.5s',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9, marginBottom: '0.35rem' }}>
                <TrendingUp size={12} /> This Month
              </div>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.1 }}>₹ 84.2L</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.92, fontWeight: 600 }}>Payroll processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== TRUSTED BY (logo strip) ============== */}
      <section style={{ padding: '2.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.4)', borderBottom: '1px solid rgba(255, 255, 255, 0.4)', background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#475569', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Trusted by 500+ HR teams across India
          </div>
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '100px',
              background: 'linear-gradient(90deg, #ffffff, transparent)', zIndex: 2, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, width: '100px',
              background: 'linear-gradient(-90deg, #ffffff, transparent)', zIndex: 2, pointerEvents: 'none',
            }} />
            <div className="nz-logos-track">
              {[...['TechCorp', 'BuildLabs', 'Finovate', 'StackHQ', 'NimbusAI', 'Apex Industries', 'Lumen Group', 'Vertex Logistics'], ...['TechCorp', 'BuildLabs', 'Finovate', 'StackHQ', 'NimbusAI', 'Apex Industries', 'Lumen Group', 'Vertex Logistics']].map((name, i) => (
                <div key={i} style={{
                  flexShrink: 0,
                  fontSize: '1.15rem', fontWeight: 800, color: '#94a3b8',
                  letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', gap: '0.55rem',
                  opacity: 0.8,
                }}>
                  <Building2 size={20} color="#cbd5e1" />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== STATS BAR ============== */}
      <section style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '3.5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255, 69, 0, 0.14), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 140, 0, 0.18)', color: '#ff8c00', marginBottom: '0.65rem', border: '1px solid rgba(255, 140, 0, 0.3)' }}>
                {s.icon}
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============== CORE MODULES ============== */}
      <section id="modules" style={sectionPad}>
        <div style={headerWrap}>
          <div style={eyebrow}><Layers size={14} /> Core Modules</div>
          <h2 style={sectionTitle}>Everything HR. In one platform.</h2>
          <p style={sectionSub}>
            Eight tightly integrated modules that cover the entire employee lifecycle —
            from the day they apply to the day they retire.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {modules.map((m, i) => (
            <div key={i} style={{
              position: 'relative', padding: '1.6rem',
              background: m.highlight ? 'rgba(255, 247, 241, 0.55)' : 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${m.highlight ? 'rgba(255, 140, 0, 0.40)' : 'rgba(255, 255, 255, 0.45)'}`,
              borderRadius: '18px',
              boxShadow: m.highlight ? '0 18px 36px -12px rgba(255, 69, 0, 0.10)' : '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 24px 44px -14px rgba(15, 23, 42, 0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = m.highlight ? '0 18px 36px -12px rgba(255, 69, 0, 0.20)' : '0 4px 10px -2px rgba(15, 23, 42, 0.05)'; }}
            >
              <div style={{
                position: 'absolute', top: '1.15rem', right: '1.15rem',
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '0.3rem 0.6rem', borderRadius: '999px',
                color: m.tag === 'AI' ? '#ffffff' : '#ea580c',
                background: m.tag === 'AI' ? 'linear-gradient(135deg, #ff4500, #ea580c)' : '#fff4ec',
                border: m.tag === 'AI' ? 'none' : '1px solid rgba(255, 140, 0, 0.25)',
              }}>{m.tag}</div>

              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #fff4ec 0%, #ffe1cc 100%)',
                color: '#ea580c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.05rem',
                boxShadow: '0 8px 18px rgba(255, 69, 0, 0.18)',
                border: '1px solid rgba(255, 140, 0, 0.25)',
              }}>
                {m.icon}
              </div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0b0b0f', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>{m.title}</h3>
              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== AI DOCUMENT STUDIO ============== */}
      <section id="document-studio" style={{ padding: '5rem 1.5rem', background: 'transparent' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={headerWrap}>
            <div style={eyebrow}><Bot size={14} /> Flagship Feature</div>
            <h2 style={sectionTitle}>AI Document Studio</h2>
            <p style={sectionSub}>
              Generate professional HR documents in seconds. Pick an employee, choose a template,
              let AI prefill the fields — preview the PDF live, then deliver with one click.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2.5rem', alignItems: 'center' }}>
            {/* LEFT: doc types */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {documentTypes.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.15rem',
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                    transition: 'all 0.25s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff8c00'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '11px',
                      background: 'linear-gradient(135deg, #fff4ec 0%, #ffe1cc 100%)',
                      color: '#ea580c',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: '1px solid rgba(255, 140, 0, 0.20)',
                    }}>{d.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0b0b0f' }}>{d.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{d.desc}</div>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: mock document preview */}
            <div style={{ position: 'relative' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.55)', borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 30px 60px -20px rgba(234, 88, 12, 0.10), 0 18px 40px -12px rgba(15, 23, 42, 0.06)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Doc top bar */}
                <div style={{ height: '6px', background: 'linear-gradient(90deg, #ff4500, #ff8c00, #ea580c)' }} />
                <div style={{ padding: '1.5rem 1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>NeuzenAI Pvt Ltd</div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b0b0f', margin: '0.2rem 0' }}>Offer Letter</h4>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>Reference: NZ-OFR-2026-001</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.3rem 0.7rem', borderRadius: '999px', border: '1px solid #86efac' }}>● Generated</span>
                  </div>
                  <div style={{ height: '1px', background: '#e5e7eb', margin: '1rem 0' }} />
                  {[
                    { k: 'Candidate', v: 'Vennala Krishna' },
                    { k: 'Designation', v: 'Software Engineer' },
                    { k: 'Annual CTC', v: '₹ 6,00,000' },
                    { k: 'Joining Date', v: '15 Jun 2026' },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.88rem' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>{row.k}</span>
                      <span style={{ color: '#0b0b0f', fontWeight: 700 }}>{row.v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#fff7f1', borderRadius: '10px', border: '1px solid rgba(255, 140, 0, 0.25)', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Sparkles size={16} color="#ea580c" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9a3412' }}>AI prefilled 12 of 14 fields</span>
                  </div>
                </div>
              </div>

              {/* Floating accent card */}
              <div style={{
                position: 'absolute', bottom: '-28px', right: '-12px',
                background: 'linear-gradient(135deg, #ff4500 0%, #ea580c 100%)',
                color: '#ffffff', padding: '0.85rem 1.15rem', borderRadius: '14px',
                boxShadow: '0 18px 32px -8px rgba(255, 69, 0, 0.45)',
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                fontSize: '0.85rem', fontWeight: 700,
              }}>
                <Zap size={16} /> Generated in 1.2 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== ADMIN VS EMPLOYEE ============== */}
      <section style={sectionPad}>
        <div style={headerWrap}>
          <div style={eyebrow}><Users size={14} /> Built for Everyone</div>
          <h2 style={sectionTitle}>Powerful for Admins. Delightful for Employees.</h2>
          <p style={sectionSub}>
            Two carefully designed experiences — one platform.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Admin */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)', borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.4)', padding: '2rem',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ff4500, #ea580c)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '13px',
                background: 'linear-gradient(135deg, #ff4500, #ea580c)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 18px rgba(255, 69, 0, 0.30)',
              }}><ShieldCheck size={24} /></div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>For HR & Admins</div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0b0b0f', margin: '0.15rem 0 0', letterSpacing: '-0.02em' }}>Run HR like ops</h3>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {adminFeatures.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.55rem 0', fontSize: '0.92rem', color: '#1f2937', fontWeight: 500 }}>
                  <CheckCircle2 size={18} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} /> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Employee */}
          <div style={{
            background: 'rgba(255, 247, 241, 0.55)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 140, 0, 0.35)',
            padding: '2rem',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 18px 36px -12px rgba(255, 69, 0, 0.10)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #ff8c00, #ff4500)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '13px',
                background: '#ffffff',
                color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 18px rgba(255, 69, 0, 0.20)',
                border: '1px solid rgba(255, 140, 0, 0.30)',
              }}><Heart size={24} /></div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>For Employees</div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0b0b0f', margin: '0.15rem 0 0', letterSpacing: '-0.02em' }}>HR in your pocket</h3>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {employeeFeatures.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.55rem 0', fontSize: '0.92rem', color: '#1f2937', fontWeight: 500 }}>
                  <CheckCircle2 size={18} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how-it-works" style={{ padding: '5rem 1.5rem', background: 'transparent' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={headerWrap}>
            <div style={eyebrow}><Rocket size={14} /> How It Works</div>
            <h2 style={sectionTitle}>From signup to "wow" in 4 steps</h2>
            <p style={sectionSub}>
              Most teams are fully operational within a single working day.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                position: 'relative', padding: '1.85rem 1.6rem',
                background: 'rgba(255, 255, 255, 0.45)', borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
              }}>
                <div style={{
                  position: 'absolute', top: '-18px', left: '1.6rem',
                  fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.12em',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #ff4500, #ea580c)',
                  padding: '0.35rem 0.75rem', borderRadius: '999px',
                  boxShadow: '0 6px 14px rgba(255, 69, 0, 0.30)',
                }}>STEP {s.num}</div>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fff4ec 0%, #ffe1cc 100%)',
                  color: '#ea580c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', marginTop: '0.5rem',
                  border: '1px solid rgba(255, 140, 0, 0.25)',
                }}>{s.icon}</div>
                <h4 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0b0b0f', margin: '0 0 0.5rem' }}>{s.title}</h4>
                <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== AI INTELLIGENCE ============== */}
      <section style={sectionPad}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '28px', padding: '3.5rem 2.5rem',
          color: '#ffffff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255, 69, 0, 0.30), transparent 60%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(255, 140, 0, 0.20), transparent 60%)', filter: 'blur(40px)' }} />

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ ...eyebrow, background: 'rgba(255, 140, 0, 0.18)', border: '1px solid rgba(255, 140, 0, 0.35)', color: '#ffba75' }}>
                <BrainCircuit size={14} /> Powered by AI
              </div>
              <h2 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: '1rem 0 1rem', lineHeight: 1.15 }}>
                Two AI agents on your team.<br />
                <span style={{
                  background: 'linear-gradient(90deg, #ff8c00, #ffba75)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>Working 24/7.</span>
              </h2>
              <p style={{ fontSize: '1.02rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1.85rem', fontWeight: 500 }}>
                The <strong style={{ color: '#ffffff' }}>Intelligence Agent</strong> helps HR admins surface insights and answer policy questions.
                The <strong style={{ color: '#ffffff' }}>Employee Assistant</strong> gives every employee an always-on HR copilot —
                from leave balance lookups to policy clarifications.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {[
                  'Answers policy & benefit questions instantly',
                  'Drafts offer letters with smart prefilling',
                  'Surfaces attendance & performance anomalies',
                  'Reduces routine HR tickets by up to 80%',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e2e8f0', fontWeight: 500 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255, 140, 0, 0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={14} color="#ff8c00" />
                    </div>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Mock chat */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px', padding: '1.35rem',
              boxShadow: '0 30px 60px -20px rgba(0, 0, 0, 0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.10)', marginBottom: '0.85rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #ff4500, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BrainCircuit size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>NeuzenAI Specialist</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Online
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '0.75rem 0.95rem', marginBottom: '0.65rem', fontSize: '0.88rem', color: '#e2e8f0', maxWidth: '85%' }}>
                How many casual leaves do I have left?
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #ff4500, #ea580c)',
                borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '0.65rem',
                fontSize: '0.88rem', color: '#fff', maxWidth: '85%', marginLeft: 'auto',
                boxShadow: '0 6px 14px rgba(255, 69, 0, 0.30)', lineHeight: 1.5,
              }}>
                You have <strong>4 casual leaves</strong> remaining this year. You also have 8 privilege and 6 sick leaves available.
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '0.75rem 0.95rem', fontSize: '0.88rem', color: '#e2e8f0', maxWidth: '85%' }}>
                Can you also pull my last payslip?
              </div>
              <div style={{
                marginTop: '0.65rem',
                background: 'linear-gradient(135deg, #ff4500, #ea580c)',
                borderRadius: '12px', padding: '0.85rem 1rem',
                fontSize: '0.88rem', color: '#fff', maxWidth: '85%', marginLeft: 'auto',
                boxShadow: '0 6px 14px rgba(255, 69, 0, 0.30)', display: 'flex', alignItems: 'center', gap: '0.55rem',
              }}>
                <FileText size={16} /> Sent to your Documents tab.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== SECURITY ============== */}
      <section id="security" style={sectionPad}>
        <div style={headerWrap}>
          <div style={eyebrow}><ShieldCheck size={14} /> Security & Compliance</div>
          <h2 style={sectionTitle}>Built for trust. Audited for compliance.</h2>
          <p style={sectionSub}>
            Your data is encrypted, your access is granular, and your records are audit-ready —
            from day one.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {securityPoints.map((s, i) => (
            <div key={i} style={{
              padding: '1.6rem',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(255, 140, 0, 0.25)'; e.currentTarget.style.boxShadow = '0 14px 28px -10px rgba(15, 23, 42, 0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.04)'; }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #fff4ec 0%, #ffe1cc 100%)',
                color: '#ea580c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.95rem',
                border: '1px solid rgba(255, 140, 0, 0.20)',
              }}>{s.icon}</div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b0b0f', margin: '0 0 0.4rem' }}>{s.title}</h4>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== TESTIMONIALS ============== */}
      <section style={{ padding: '5rem 1.5rem', background: 'transparent' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={headerWrap}>
            <div style={eyebrow}><Star size={14} /> Loved by HR Teams</div>
            <h2 style={sectionTitle}>Don't take our word for it.</h2>
            <p style={sectionSub}>HR leaders across India trust NeuzenAI to run their people operations.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                padding: '1.85rem',
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '18px',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '0.85rem' }}>
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} color="#ff8c00" fill="#ff8c00" />)}
                </div>
                <p style={{ fontSize: '0.96rem', color: '#1f2937', lineHeight: 1.65, marginBottom: '1.35rem', fontWeight: 500, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff4500, #ea580c)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.95rem',
                    boxShadow: '0 4px 10px rgba(255, 69, 0, 0.25)',
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0b0b0f' }}>{t.author}</div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" style={{ ...sectionPad, maxWidth: '780px' }}>
        <div style={headerWrap}>
          <div style={eyebrow}><MessageSquare size={14} /> FAQ</div>
          <h2 style={sectionTitle}>Frequently asked.</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isOpen ? 'rgba(255, 140, 0, 0.40)' : 'rgba(255, 255, 255, 0.45)'}`,
                borderRadius: '14px',
                boxShadow: isOpen ? '0 10px 24px -10px rgba(255, 69, 0, 0.10)' : '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                transition: 'all 0.25s ease',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setOpenFaq(isOpen ? -1 : i)}
                  style={{
                    width: '100%',
                    padding: '1.1rem 1.35rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0b0b0f',
                  }}
                >
                  <span>{f.q}</span>
                  <ChevronDown
                    size={20}
                    color={isOpen ? '#ea580c' : '#475569'}
                    style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0, marginLeft: '1rem' }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 1.35rem 1.2rem', fontSize: '0.93rem', color: '#475569', lineHeight: 1.65, fontWeight: 500 }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{
          maxWidth: '980px', margin: '0 auto',
          background: 'rgba(234, 88, 12, 0.85)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem)',
          textAlign: 'center', color: '#ffffff',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 30px 60px -20px rgba(234, 88, 12, 0.30)',
        }}>
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 70%)', filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12), transparent 70%)', filter: 'blur(30px)' }} />

          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 1rem' }}>
              Ready to put your HR on autopilot?
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.92)', maxWidth: '600px', margin: '0 auto 2.25rem', fontWeight: 500, lineHeight: 1.6 }}>
              Join hundreds of teams that use NeuzenAI HRMS to onboard, pay, and engage their people.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button
                onClick={onLoginClick}
                style={{
                  padding: '1rem 2rem',
                  background: '#ffffff', color: '#ea580c',
                  border: 'none', borderRadius: '12px',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.25)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Get Started Free <ArrowRight size={18} />
              </button>
              <button
                onClick={onLoginClick}
                style={{
                  padding: '1rem 2rem',
                  background: 'rgba(255, 255, 255, 0.10)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.40)', borderRadius: '12px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer style={{ background: '#0b0b0f', color: '#cbd5e1', padding: '4rem 1.5rem 2rem', borderTop: '1px solid rgba(255, 140, 0, 0.15)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <img src="/icon (2).png" alt="NeuzenAI" style={{ width: '36px', height: '36px' }} />
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>NeuzenAI HRMS</span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 1rem', maxWidth: '280px' }}>
                AI-powered HR platform built for modern Indian businesses.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} color="#ff8c00" /> hello@neuzenai.com</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14} color="#ff8c00" /> +91 80 4567 8900</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} color="#ff8c00" /> Bengaluru, India</div>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ff8c00', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Product</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
                {['Workforce Directory', 'AI Document Studio', 'Smart Payroll', 'Leave Management', 'Attendance', 'HR Analytics'].map(x => (
                  <li key={x}><a href="#modules" style={{ color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#ff8c00'} onMouseLeave={e => e.target.style.color = '#cbd5e1'}>{x}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ff8c00', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Company</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
                {['About', 'Customers', 'Careers', 'Press', 'Partners', 'Contact'].map(x => (
                  <li key={x}><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = '#ff8c00'} onMouseLeave={e => e.target.style.color = '#cbd5e1'}>{x}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ff8c00', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Resources</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
                {['Documentation', 'API Reference', 'Help Center', 'Status', 'Security', 'Privacy'].map(x => (
                  <li key={x}><a href="#" style={{ color: '#cbd5e1', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = '#ff8c00'} onMouseLeave={e => e.target.style.color = '#cbd5e1'}>{x}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{
            paddingTop: '1.85rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
            fontSize: '0.82rem', color: '#94a3b8',
          }}>
            <div>© {new Date().getFullYear()} NeuzenAI IT Solutions Pvt Ltd. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
