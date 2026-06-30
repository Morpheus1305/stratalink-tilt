import { useState } from 'react';
import { useLocation } from 'wouter';

const C = {
  bg:       '#080D14',
  panel:    '#0F151F',
  border:   '#1A2435',
  text:     '#D8DEE8',
  sub:      '#7B8EA3',
  muted:    '#4A5B6E',
  accent:   '#00BFA5',
  input:    '#0A1018',
};

const INQUIRY_TYPES = [
  'Request Platform Access',
  'Book a Demo',
  'PoLi Certification Inquiry',
  'Regulatory Partnership',
  'Venue Onboarding',
  'General Inquiry',
];

export default function RequestAccessPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    inquiryType: INQUIRY_TYPES[0],
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [hovNav, setHovNav] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 60,
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: C.bg,
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setLocation('/')}
        >
          <img src="/images/stratalink-logo.png" alt="StrataLink" style={{ height: 24, width: 'auto' }} />
          <span style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.10em',
            color: C.text,
          }}>
            STRATA<span style={{ color: C.accent }}>LINK</span>{' '}
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.15em', color: C.muted, verticalAlign: 'middle' }}>LABS</span>
          </span>
          <span style={{ color: C.muted, margin: '0 4px' }}>|</span>
          <span style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: 9,
            letterSpacing: '0.18em',
            color: C.muted,
            textTransform: 'uppercase',
          }}>
            The Institutional Liquidity Truth Terminal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: 11,
              letterSpacing: '0.12em',
              color: C.sub,
              padding: '4px 8px',
            }}
            onClick={() => setLocation('/methodology')}
          >
            Methodology
          </button>
          <button
            style={{
              background: hovNav ? C.accent : 'transparent',
              border: `1px solid ${C.accent}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: hovNav ? C.bg : C.accent,
              padding: '6px 14px',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={() => setHovNav(true)}
            onMouseLeave={() => setHovNav(false)}
            onClick={() => setLocation('/login')}
            data-testid="button-client-login"
          >
            Client Login
          </button>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
            fontSize: 10,
            letterSpacing: '0.20em',
            color: C.accent,
            textTransform: 'uppercase',
            marginBottom: 18,
          }}>
            Get In Touch
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 700, lineHeight: 1.1 }}>
            <span style={{ fontSize: 'clamp(32px, 5vw, 52px)', color: C.text, display: 'block' }}>
              Let's discuss your
            </span>
            <span style={{ fontSize: 'clamp(32px, 5vw, 52px)', color: C.accent, display: 'block' }}>
              liquidity needs
            </span>
          </h1>
          <p style={{ marginTop: 20, fontSize: 15, color: C.sub, lineHeight: 1.7, maxWidth: 520 }}>
            Whether you're looking for a demo of TILT, PoLi&#8482; certification for your venue,
            or regulatory-grade liquidity data, our team is ready to help.
          </p>
        </div>

        {submitted ? (
          /* ── Success state ───────────────────────────────────────────────── */
          <div style={{
            background: C.panel,
            border: `1px solid ${C.accent}40`,
            borderRadius: 4,
            padding: '48px 40px',
            textAlign: 'center',
            maxWidth: 560,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${C.accent}18`, border: `1px solid ${C.accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
              fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: C.accent, marginBottom: 10,
            }}>
              INQUIRY RECEIVED
            </div>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
              Thank you, {form.name.split(' ')[0] || 'there'}. We've received your inquiry and will
              respond to <strong style={{ color: C.text }}>{form.email}</strong> within 24 business hours.
            </p>
            <button
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 2, cursor: 'pointer', padding: '8px 20px',
                fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                fontSize: 11, letterSpacing: '0.10em', color: C.sub,
              }}
              onClick={() => setLocation('/')}
            >
              Back to Home
            </button>
          </div>
        ) : (
          /* ── Form + sidebar ──────────────────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40, alignItems: 'start' }}>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <FormField label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
                <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@company.com" required />
                <FormField label="Company" name="company" value={form.company} onChange={handleChange} placeholder="Company name" required />
                <FormField label="Role" name="role" value={form.role} onChange={handleChange} placeholder="Head of Trading" />
              </div>

              {/* Inquiry Type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Inquiry Type</label>
                <select
                  name="inquiryType"
                  value={form.inquiryType}
                  onChange={handleChange}
                  style={inputStyle}
                  data-testid="select-inquiry-type"
                >
                  {INQUIRY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us about your requirements..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'Inter, sans-serif' }}
                  data-testid="textarea-message"
                />
              </div>

              <button
                type="submit"
                data-testid="button-submit-inquiry"
                style={{
                  background: C.text,
                  color: C.bg,
                  border: 'none',
                  borderRadius: 2,
                  padding: '12px 28px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Submit Inquiry
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <SidebarItem
                icon={<MailIcon />}
                title="Email"
                detail="contact@stratalink.ai"
              />
              <SidebarItem
                icon={<PinIcon />}
                title="Registered Office"
                detail={<>Stratalink Labs Ltd<br />London, United Kingdom</>}
              />
              <SidebarItem
                icon={<ClockIcon />}
                title="Response Time"
                detail="We aim to respond within 24 hours during business days."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        marginTop: 80,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
          fontSize: 9,
          letterSpacing: '0.14em',
          color: C.muted,
        }}>
          © 2025 STRATALINK LABS LTD · ALL RIGHTS RESERVED
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
          fontSize: 9,
          letterSpacing: '0.12em',
          color: C.muted,
        }}>
          contact@stratalink.ai
        </span>
      </footer>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  fontSize: 9,
  letterSpacing: '0.16em',
  color: '#7B8EA3',
  textTransform: 'uppercase',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0A1018',
  border: '1px solid #1A2435',
  borderRadius: 2,
  padding: '10px 12px',
  color: '#D8DEE8',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

function FormField({
  label, name, value, onChange, placeholder, type = 'text', required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
        data-testid={`input-${name}`}
      />
    </div>
  );
}

function SidebarItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '20px 0',
      borderBottom: `1px solid #1A2435`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 2,
        background: '#0F151F', border: '1px solid #1A2435',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#00BFA5',
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
          color: '#D8DEE8', marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#7B8EA3', lineHeight: 1.6 }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
