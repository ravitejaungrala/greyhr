import React from 'react';
import { GradientButton } from '../components/ui/gradient-button';
import { GlowingEffect } from '../components/ui/glowing-effect';
import AnimatedShaderHero from '../components/ui/animated-shader-hero';
import { 
  Users, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Briefcase, 
  ArrowRight,
  ChevronRight,
  Layers,
  Zap,
  Lock
} from 'lucide-react';

const LandingPage = ({ onLoginClick }) => {
  const features = [
    {
      icon: <Users size={24} />,
      title: "Employee Directory",
      description: "Maintain a centralized database of all employees with detailed profiles and document management."
    },
    {
      icon: <Zap size={24} />,
      title: "Smart Payroll",
      description: "Automated salary calculations, tax deductions, and one-click payslip generation."
    },
    {
      icon: <Calendar size={24} />,
      title: "Leave Management",
      description: "Efficient leave request tracking and approval workflows with team calendar integration."
    },
    {
      icon: <ShieldCheck size={24} />,
      title: "Secure Onboarding",
      description: "Seamless digital onboarding process with automated documentation and background checks."
    },
    {
      icon: <Layers size={24} />,
      title: "Advanced Reporting",
      description: "Gain insights into workforce metrics with comprehensive reports and analytics."
    },
    {
      icon: <Lock size={24} />,
      title: "Role-based Access",
      description: "Detailed permission settings to ensure data security and organizational integrity."
    }
  ];

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="logo-container">
            <img src="/icon (2).png" alt="Logo" className="logo-img" />
            <span className="logo-text">Dhanadurga HRMS</span>
          </div>
          
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#solutions" className="nav-link">Solutions</a>
            <a href="#about" className="nav-link">About</a>
          </div>

          <div className="navbar-actions">
            <GradientButton onClick={onLoginClick}>
              Sign In
            </GradientButton>
          </div>
        </div>
      </nav>

      {/* Animated Shader Hero */}
      <AnimatedShaderHero
        trustBadge={{
          text: "Trusted by forward-thinking HR teams.",
          icons: ["✨"]
        }}
        headline={{
          line1: "Modernize Your",
          line2: "Workforce Management"
        }}
        subtitle="Experience the future of HR with Dhanadurga HRMS. AI-powered automation, seamless payroll, and intelligent employee insights — all in one place."
        buttons={{
          primary: {
            text: "Get Started Now",
            onClick: onLoginClick
          },
          secondary: {
            text: "Book a Demo",
            onClick: () => window.location.href = '#features'
          }
        }}
      />

      {/* Features Grid with GlowingEffect */}
      <section id="features" className="features-section">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="feature-card-content">
              <div className="feature-icon-container">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to transform your HR?</h2>
        <p className="cta-subtitle">Join hundreds of companies that use our HRMS to power their businesses.</p>
        <GradientButton onClick={onLoginClick}>
          Join Dhanadurga Today
        </GradientButton>
      </section>
    </div>
  );
};

export default LandingPage;
