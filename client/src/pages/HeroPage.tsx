import { useRef } from 'react';
import { useLocation } from 'wouter';

export default function HeroPage() {
  const [, setLocation] = useLocation();
  const methodologyRef = useRef<HTMLElement>(null);

  function scrollToMethodology() {
    methodologyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

        .hp-page {
          font-family: 'Inter', sans-serif;
          background: #03060f;
          color: #e2e8f0;
          min-height: 100dvh;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        /* Fixed bg only under the hero viewport */
        .hp-hero-wrap {
          position: relative;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .hp-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .hp-bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.35; mix-blend-mode: luminosity; }
        .hp-bg-wash {
          position: absolute; inset: 0;
          background:
            linear-gradient(to right, #03060f 42%, rgba(3,6,15,0.6) 68%, rgba(3,6,15,0.13) 100%),
            linear-gradient(to bottom, rgba(3,6,15,0.87) 0%, transparent 28%, rgba(3,6,15,0.8) 80%, #03060f 100%);
        }

        /* Nav */
        .hp-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(3,6,15,0.85);
          backdrop-filter: blur(12px);
        }
        .hp-nav-brand { display: flex; align-items: center; gap: 0.75rem; }
        .hp-nav-wordmark { font-weight: 700; font-size: 0.75rem; letter-spacing: 0.25em; text-transform: uppercase; color: #fff; }
        .hp-nav-pipe { color: rgba(255,255,255,0.2); }
        .hp-nav-subtitle { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.38); font-weight: 500; }
        .hp-nav-actions { display: flex; align-items: center; gap: 1.5rem; }
        .hp-nav-link { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.38); text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; }
        .hp-nav-link:hover { color: rgba(255,255,255,0.7); }
        .hp-nav-btn { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 1.25rem; background: rgba(255,255,255,0.04); cursor: pointer; font-family: 'Inter', sans-serif; }
        .hp-nav-btn:hover { background: rgba(255,255,255,0.08); }

        /* Hero split */
        .hp-main { position: relative; z-index: 10; flex: 1; display: flex; }
        .hp-left { width: 52%; display: flex; flex-direction: column; justify-content: center; padding: 4rem 3rem; }

        .hp-live-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.18);
          color: #00d4ff; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em;
          margin-bottom: 2.5rem; width: fit-content;
        }
        .hp-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4ff; animation: hppulse 2s infinite; }
        @keyframes hppulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .hp-eyebrow { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .hp-eyebrow-line { width: 2.5rem; height: 1px; background: rgba(140,170,255,0.3); }
        .hp-eyebrow-text { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: rgba(140,170,255,0.5); font-weight: 600; }

        .hp-headline { margin-bottom: 2rem; line-height: 0.88; }
        .hp-headline-pre { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic; font-size: clamp(1.75rem, 3vw, 3rem); color: rgba(255,255,255,0.52); display: block; letter-spacing: 0.02em; margin-bottom: 0.08em; }
        .hp-headline-mid { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic; font-size: clamp(1.75rem, 3vw, 3rem); color: rgba(255,255,255,0.52); display: block; letter-spacing: 0.02em; margin-bottom: 0.08em; }
        .hp-headline-main { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: clamp(3.5rem, 7.5vw, 7rem); color: #fff; display: block; letter-spacing: -0.01em; text-shadow: 0 0 80px rgba(255,255,255,0.06); }

        .hp-body { font-size: 0.875rem; color: rgba(255,255,255,0.42); line-height: 1.8; max-width: 28rem; margin-bottom: 2.5rem; border-left: 1px solid rgba(255,255,255,0.08); padding-left: 1.5rem; font-weight: 300; letter-spacing: 0.02em; }

        .hp-bullets { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 2.75rem; }
        .hp-bullet { display: flex; align-items: flex-start; gap: 0.875rem; }
        .hp-bullet-icon { width: 30px; height: 30px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; margin-top: 1px; }
        .hp-bullet-icon svg { width: 14px; height: 14px; }
        .hp-bullet-title { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 0.1rem; }
        .hp-bullet-sub { font-size: 0.7rem; color: rgba(255,255,255,0.33); line-height: 1.5; }

        .hp-ctas { display: flex; align-items: center; gap: 1.25rem; }
        .hp-cta-primary { padding: 0.875rem 2rem; background: #fff; color: #03060f; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; border: none; cursor: pointer; box-shadow: 0 0 40px rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem; font-family: 'Inter', sans-serif; }
        .hp-cta-primary:hover { background: #e8edf5; }
        .hp-cta-secondary { padding: 0.875rem 1.75rem; background: transparent; color: rgba(255,255,255,0.48); font-size: 0.65rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-family: 'Inter', sans-serif; }
        .hp-cta-secondary:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }

        .hp-right { width: 48%; display: flex; align-items: center; justify-content: center; padding: 3rem 3rem 3rem 2rem; position: relative; }
        .hp-right-glow { position: absolute; top: 50%; left: 30%; transform: translate(-50%,-50%); width: 60%; height: 60%; background: radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%); pointer-events: none; }

        .hp-panel { width: 100%; max-width: 440px; background: rgba(6,12,22,0.92); border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.04); display: flex; flex-direction: column; position: relative; z-index: 1; backdrop-filter: blur(8px); }
        .hp-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(3,6,15,0.8); }
        .hp-panel-header-left { display: flex; align-items: center; gap: 0.5rem; }
        .hp-panel-label { font-size: 0.65rem; color: rgba(255,255,255,0.35); letter-spacing: 0.12em; }
        .hp-panel-dots { display: flex; gap: 4px; }
        .hp-panel-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .hp-panel-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

        .hp-row { display: flex; gap: 0.875rem; }
        .hp-gauge-card, .hp-depth-card { flex: 1; background: rgba(3,6,15,0.9); border: 1px solid rgba(255,255,255,0.06); padding: 0.875rem; display: flex; flex-direction: column; }
        .hp-card-label { font-size: 0.55rem; color: rgba(255,255,255,0.3); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .hp-gauge-wrap { display: flex; align-items: center; justify-content: center; flex: 1; }
        .hp-gauge-inner { position: relative; width: 90px; height: 90px; }
        .hp-gauge-inner svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .hp-gauge-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .hp-gauge-score { font-size: 1.5rem; font-weight: 700; color: #fff; line-height: 1; }
        .hp-gauge-rating { font-size: 0.5rem; font-weight: 700; color: #F0C000; margin-top: 2px; letter-spacing: 0.1em; }

        .hp-depth-rows { display: flex; flex-direction: column; gap: 2px; }
        .hp-depth-row { display: flex; align-items: center; gap: 6px; }
        .hp-depth-price { font-size: 0.55rem; color: rgba(255,255,255,0.3); width: 52px; text-align: right; flex-shrink: 0; }
        .hp-depth-bar { height: 5px; border-radius: 0 1px 1px 0; }
        .hp-depth-mid { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
        .hp-depth-mid-price { font-size: 0.6rem; font-weight: 700; color: #fff; width: 52px; text-align: right; }
        .hp-depth-spread { font-size: 0.5rem; color: rgba(255,255,255,0.2); }

        .hp-table { background: rgba(3,6,15,0.9); border: 1px solid rgba(255,255,255,0.06); }
        .hp-table-head { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .hp-table-head-l { font-size: 0.55rem; color: rgba(255,255,255,0.3); letter-spacing: 0.15em; text-transform: uppercase; }
        .hp-table-head-r { font-size: 0.55rem; color: rgba(255,255,255,0.2); }
        .hp-table-row { display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .hp-table-row:last-child { border-bottom: none; }
        .hp-token-left { display: flex; align-items: center; gap: 0.6rem; }
        .hp-token-sym { font-size: 0.7rem; font-weight: 700; color: #fff; width: 32px; }
        .hp-token-name { font-size: 0.6rem; color: rgba(255,255,255,0.3); }
        .hp-token-right { display: flex; align-items: center; gap: 0.75rem; }
        .hp-token-score { font-size: 0.65rem; }
        .hp-token-badge { font-size: 0.5rem; font-weight: 700; padding: 1px 6px; border-radius: 1px; }

        /* Hero footer strip */
        .hp-footer { position: relative; z-index: 10; border-top: 1px solid rgba(255,255,255,0.05); padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
        .hp-footer-label { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.2); white-space: nowrap; }
        .hp-footer-badges { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
        .hp-footer-badge { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.18); }

        /* ─── METHODOLOGY SECTION ─────────────────────────────────────── */
        .meth {
          background: #03060f;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 6rem 3rem 5rem;
          scroll-margin-top: 72px;
        }
        .meth-header { max-width: 52rem; margin-bottom: 4rem; }
        .meth-eyebrow { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; }
        .meth-eyebrow-line { width: 2.5rem; height: 1px; background: rgba(140,170,255,0.3); }
        .meth-eyebrow-text { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: rgba(140,170,255,0.5); font-weight: 600; }
        .meth-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic; font-size: clamp(2.5rem, 4vw, 3.75rem); color: #fff; line-height: 1.1; margin-bottom: 1.5rem; }
        .meth-title strong { font-style: normal; font-weight: 600; }
        .meth-intro { font-size: 0.9rem; color: rgba(255,255,255,0.42); line-height: 1.85; font-weight: 300; max-width: 44rem; }

        /* Pillars grid */
        .meth-pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); margin-bottom: 4rem; border: 1px solid rgba(255,255,255,0.06); }
        .meth-pillar { background: #03060f; padding: 2rem 1.75rem; }
        .meth-pillar:hover { background: rgba(255,255,255,0.02); }
        .meth-pillar-num { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.25em; color: rgba(255,255,255,0.18); margin-bottom: 1.25rem; }
        .meth-pillar-icon { margin-bottom: 1rem; }
        .meth-pillar-icon svg { width: 20px; height: 20px; }
        .meth-pillar-name { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-bottom: 0.35rem; }
        .meth-pillar-label { font-size: 0.65rem; letter-spacing: 0.12em; color: rgba(255,255,255,0.25); margin-bottom: 1rem; font-style: italic; }
        .meth-pillar-body { font-size: 0.75rem; color: rgba(255,255,255,0.38); line-height: 1.7; font-weight: 300; }

        /* L5F factor breakdown */
        .meth-l5f { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 4rem; align-items: start; }
        .meth-l5f-left {}
        .meth-l5f-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem; }
        .meth-l5f-headline { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: clamp(1.5rem, 2.5vw, 2.25rem); color: #fff; margin-bottom: 1rem; line-height: 1.2; }
        .meth-l5f-body { font-size: 0.8rem; color: rgba(255,255,255,0.38); line-height: 1.75; font-weight: 300; margin-bottom: 1.5rem; }
        .meth-l5f-formula {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          padding: 1rem 1.25rem;
          font-size: 0.72rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.45);
          line-height: 1.6;
        }
        .meth-l5f-formula span { color: #00d4ff; }

        .meth-l5f-right {}
        .meth-factor { margin-bottom: 1.25rem; }
        .meth-factor:last-child { margin-bottom: 0; }
        .meth-factor-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; }
        .meth-factor-left { display: flex; align-items: center; gap: 0.75rem; }
        .meth-factor-code { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; width: 24px; }
        .meth-factor-name { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.7); }
        .meth-factor-weight { font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.3); }
        .meth-factor-bar-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 1px; }
        .meth-factor-bar-fill { height: 3px; border-radius: 1px; }
        .meth-factor-desc { font-size: 0.68rem; color: rgba(255,255,255,0.28); margin-top: 0.3rem; }

        /* PoLi rating scale */
        .meth-rating { margin-bottom: 4rem; }
        .meth-rating-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 1.5rem; }
        .meth-rating-scale { display: flex; gap: 1px; }
        .meth-rating-band { flex: 1; padding: 1rem 0.75rem; border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 0.4rem; }
        .meth-band-grade { font-size: 0.85rem; font-weight: 700; }
        .meth-band-range { font-size: 0.55rem; font-weight: 600; letter-spacing: 0.08em; color: rgba(255,255,255,0.28); }
        .meth-band-label { font-size: 0.6rem; color: rgba(255,255,255,0.3); line-height: 1.4; }

        /* Regime states */
        .meth-regimes { margin-bottom: 4rem; }
        .meth-regimes-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 1.5rem; }
        .meth-regimes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .meth-regime { background: #03060f; padding: 1.25rem 1.5rem; }
        .meth-regime-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .meth-regime-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .meth-regime-name { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; }
        .meth-regime-body { font-size: 0.68rem; color: rgba(255,255,255,0.32); line-height: 1.5; }

        /* Horizons */
        .meth-horizons { display: flex; gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 4rem; }
        .meth-horizon { flex: 1; background: #03060f; padding: 1.5rem; }
        .meth-horizon-tag { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.18em; color: #00d4ff; margin-bottom: 0.5rem; }
        .meth-horizon-name { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 0.4rem; }
        .meth-horizon-window { font-size: 0.65rem; color: rgba(255,255,255,0.25); font-family: 'Inter', monospace; margin-bottom: 0.5rem; }
        .meth-horizon-desc { font-size: 0.7rem; color: rgba(255,255,255,0.35); line-height: 1.5; }

        /* Bottom CTA strip */
        .meth-cta-strip { border-top: 1px solid rgba(255,255,255,0.06); padding: 3rem 0 0; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .meth-cta-text {}
        .meth-cta-title { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: clamp(1.25rem, 2vw, 1.75rem); color: #fff; margin-bottom: 0.4rem; }
        .meth-cta-sub { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .meth-cta-actions { display: flex; gap: 1rem; }
        .meth-cta-primary { padding: 0.875rem 2rem; background: #fff; color: #03060f; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; border: none; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 0.5rem; }
        .meth-cta-primary:hover { background: #e8edf5; }
        .meth-cta-secondary { padding: 0.875rem 1.75rem; background: transparent; color: rgba(255,255,255,0.48); font-size: 0.65rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-family: 'Inter', sans-serif; }
        .meth-cta-secondary:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }
      ` }} />

      <div className="hp-page">

        {/* ── HERO SECTION ── */}
        <div className="hp-hero-wrap">
          <div className="hp-bg">
            <img src="/images/cinematic-ocean-bg.png" alt="" />
            <div className="hp-bg-wash" />
          </div>

          {/* Sticky nav */}
          <nav className="hp-nav">
            <div className="hp-nav-brand">
              <span className="hp-nav-wordmark">StrataLink Labs</span>
              <span className="hp-nav-pipe">|</span>
              <span className="hp-nav-subtitle">Institutional Liquidity Terminal</span>
            </div>
            <div className="hp-nav-actions">
              <button
                className="hp-nav-link"
                data-testid="nav-methodology"
                onClick={scrollToMethodology}
              >Methodology</button>
              <button className="hp-nav-link" onClick={() => setLocation('/login')}>Regulators</button>
              <button className="hp-nav-btn" onClick={() => setLocation('/login')}>Client Login</button>
            </div>
          </nav>

          <main className="hp-main">
            <div className="hp-left">
              <div className="hp-live-badge">
                <span className="hp-live-dot" />
                SYSTEM LIVE · v2.4.0
              </div>

              <div className="hp-eyebrow">
                <span className="hp-eyebrow-line" />
                <span className="hp-eyebrow-text">Institutional Digital Asset Markets</span>
              </div>

              <div className="hp-headline">
                <span className="hp-headline-pre">The Standard for</span>
                <span className="hp-headline-mid">Liquidity</span>
                <span className="hp-headline-main">VERIFICATION</span>
              </div>

              <p className="hp-body">
                The world's first and only liquidity verification infrastructure.
                Cryptographically anchored across 14 venues — the immutable ground
                truth for institutional risk management.
              </p>

              <div className="hp-bullets">
                <div className="hp-bullet">
                  <div className="hp-bullet-icon" style={{ color: '#F0C000' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="hp-bullet-title">Cryptographically anchored DACT</div>
                    <div className="hp-bullet-sub">Immutable consolidated tape — provenance-complete, venue-authentic.</div>
                  </div>
                </div>
                <div className="hp-bullet">
                  <div className="hp-bullet-icon" style={{ color: '#00d4ff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <div className="hp-bullet-title">14-venue PoLi scoring</div>
                    <div className="hp-bullet-sub">Real-time Proof of Liquidity across CEX, DEX, and dark markets.</div>
                  </div>
                </div>
                <div className="hp-bullet">
                  <div className="hp-bullet-icon" style={{ color: '#4ade80' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <div className="hp-bullet-title">Sub-second regime detection</div>
                    <div className="hp-bullet-sub">Identify STRESSED and EARLY_WARNING states before they cascade.</div>
                  </div>
                </div>
              </div>

              <div className="hp-ctas">
                <button
                  className="hp-cta-primary"
                  data-testid="button-hero-request-access"
                  onClick={() => setLocation('/login')}
                >
                  Request Access
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button
                  className="hp-cta-secondary"
                  data-testid="button-hero-methodology"
                  onClick={scrollToMethodology}
                >
                  View Methodology
                </button>
              </div>
            </div>

            {/* RIGHT — terminal preview panel */}
            <div className="hp-right">
              <div className="hp-right-glow" />
              <div className="hp-panel">
                <div className="hp-panel-header">
                  <div className="hp-panel-header-left">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span className="hp-panel-label">TILT · LIVE FEED</span>
                  </div>
                  <div className="hp-panel-dots">
                    <div className="hp-panel-dot" /><div className="hp-panel-dot" /><div className="hp-panel-dot" />
                  </div>
                </div>
                <div className="hp-panel-body">
                  <div className="hp-row">
                    <div className="hp-gauge-card">
                      <div className="hp-card-label">Global PoLi</div>
                      <div className="hp-gauge-wrap">
                        <div className="hp-gauge-inner">
                          <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.07)" strokeWidth="7" fill="none" strokeDasharray="251.2" strokeDashoffset="0" />
                            <circle cx="50" cy="50" r="40" stroke="#F0C000" strokeWidth="7" fill="none" strokeDasharray="251.2" strokeDashoffset="50" strokeLinecap="round" />
                          </svg>
                          <div className="hp-gauge-text">
                            <span className="hp-gauge-score">80</span>
                            <span className="hp-gauge-rating">AA+</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hp-depth-card">
                      <div className="hp-card-label">Aggregated Depth</div>
                      <div className="hp-depth-rows">
                        {[['98,246','30%'],['98,245','55%'],['98,244','78%']].map(([p,w]) => (
                          <div key={p} className="hp-depth-row">
                            <span className="hp-depth-price">{p}</span>
                            <div className="hp-depth-bar" style={{ width: w, background: 'rgba(248,113,113,0.7)' }} />
                          </div>
                        ))}
                        <div className="hp-depth-mid">
                          <span className="hp-depth-mid-price">98,243</span>
                          <span className="hp-depth-spread">0.50 SPREAD</span>
                        </div>
                        {[['98,242','100%'],['98,241','65%'],['98,240','35%']].map(([p,w]) => (
                          <div key={p} className="hp-depth-row">
                            <span className="hp-depth-price">{p}</span>
                            <div className="hp-depth-bar" style={{ width: w, background: 'rgba(52,211,153,0.7)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="hp-table">
                    <div className="hp-table-head">
                      <span className="hp-table-head-l">Asset Coverage</span>
                      <span className="hp-table-head-r">LIVE · 14 VENUES</span>
                    </div>
                    {[
                      { sym: 'BTC', name: 'Bitcoin',  score: 92, rating: 'AAA', sc: '#4ade80', bc: 'rgba(52,211,153,0.08)',  bb: 'rgba(52,211,153,0.2)' },
                      { sym: 'ETH', name: 'Ethereum', score: 88, rating: 'AA+', sc: '#4ade80', bc: 'rgba(52,211,153,0.08)',  bb: 'rgba(52,211,153,0.2)' },
                      { sym: 'SOL', name: 'Solana',   score: 76, rating: 'AA',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',   bb: 'rgba(240,192,0,0.25)' },
                      { sym: 'XRP', name: 'Ripple',   score: 68, rating: 'A+',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',   bb: 'rgba(240,192,0,0.25)' },
                      { sym: 'BNB', name: 'BNB',      score: 81, rating: 'AA',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',   bb: 'rgba(240,192,0,0.25)' },
                    ].map(t => (
                      <div key={t.sym} className="hp-table-row">
                        <div className="hp-token-left">
                          <span className="hp-token-sym">{t.sym}</span>
                          <span className="hp-token-name">{t.name}</span>
                        </div>
                        <div className="hp-token-right">
                          <span className="hp-token-score" style={{ color: t.sc }}>{t.score}</span>
                          <span className="hp-token-badge" style={{ color: t.sc, background: t.bc, border: `1px solid ${t.bb}` }}>{t.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>

          <footer className="hp-footer">
            <span className="hp-footer-label">Trusted by</span>
            <div className="hp-footer-badges">
              {['Central Clearing Counterparties', 'Tier-1 Exchanges', 'Regulatory Bodies', 'Institutional Risk Desks', 'Digital Asset Protocols'].map(b => (
                <span key={b} className="hp-footer-badge">{b}</span>
              ))}
            </div>
          </footer>
        </div>

        {/* ── METHODOLOGY SECTION ── */}
        <section className="meth" ref={methodologyRef} id="methodology" data-testid="section-methodology">

          <div className="meth-header">
            <div className="meth-eyebrow">
              <span className="meth-eyebrow-line" />
              <span className="meth-eyebrow-text">Technical Framework</span>
            </div>
            <h2 className="meth-title">
              A formally verified framework<br />
              for <strong>liquidity truth.</strong>
            </h2>
            <p className="meth-intro">
              StrataLink's methodology formalises what liquidity actually means for
              institutional participants — moving beyond price impact estimates and
              static bid-ask spreads toward a cryptographically provable, multi-venue,
              time-aware standard. Every metric produced by the Terminal traces back to
              a single, immutable source of record.
            </p>
          </div>

          {/* Six framework pillars */}
          <div className="meth-pillars">
            {[
              {
                n: '01', color: '#F0C000',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                name: 'DACT', label: 'Digital Asset Consolidated Tape',
                body: 'A read-only, cryptographically anchored consolidated tape. Every market event — trade, quote, depth update, liquidation, funding rate — is recorded with provenance metadata: source venue, transport method, and sequence number. DACT is the immutable ground truth from which all downstream analytics are derived. No fallback labelling. No synthetic attribution.'
              },
              {
                n: '02', color: '#00d4ff',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                name: 'PoLi', label: 'Proof of Liquidity Score',
                body: 'A numeric score from 0–100 with letter-grade rating bands (AAA to D) that quantifies the quality, depth, and continuity of executable liquidity for a given asset. PoLi is computed from the L5F composite model and includes a component breakdown across Depth Quality, Resilience, Fragmentation, Execution Integrity, and Regime Stability. The isReal boolean flags whether the score reflects live or synthetic data.'
              },
              {
                n: '03', color: '#a78bfa',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                name: 'L5F', label: 'Liquidity 5-Factor Model',
                body: 'A weighted composite scoring system across five orthogonal factors: Depth Quality (30%), Resilience (20%), Fragmentation (15%, inverted HHI across venues), Execution Integrity (20%), and Regime Stability (15%). Computed from a rolling buffer of raw LIS snapshots across all 14 integrated venues. DQ and Fragmentation are point-in-time; Resilience and Regime Stability require a minimum 3–5 minutes of buffer history.'
              },
              {
                n: '04', color: '#4ade80',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                name: 'TSLE', label: 'Time-Series Liquidity Engine',
                body: 'Formalises liquidity state as a unified object with three price-independent invariants: intensity (the volume available without material price impact), resilience (the speed at which depth replenishes after consumption), and continuity (the temporal stability of executable quotes across sessions). TSLE powers the in-memory ring buffer used by L5F analytics, storing up to 360 data points — approximately one hour at 10-second ingest intervals.'
              },
              {
                n: '05', color: '#fb923c',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                name: 'Regime Classification', label: 'Market Liquidity State Detection',
                body: 'Dynamic, real-time classification of the prevailing market liquidity environment into one of six states: NORMAL, THIN, STRESSED, EARLY_WARNING, STRESS_BUILDING, or CONFIRMED_STRESS. Classifications are derived from cross-venue depth divergence, spread expansion, resilience decay, and funding rate dislocation — triggering alerts and adjusting PoLi weights in near-real time.'
              },
              {
                n: '06', color: '#38bdf8',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                name: 'Venue Role Doctrine', label: 'Cross-Venue Structural Classification',
                body: 'Each of the 14 integrated venues is assigned a structural role — REFERENCE_VENUE (Binance, Coinbase), STRESS_VENUE (perpetual DEXs during dislocations), DARK_VENUE (OTC RFQ), or ATTESTATION_VENUE (Canton Network). Role assignments enable divergence detection: when a stress venue deviates materially from a reference venue, the system flags a potential structural dislocation before it appears in consolidated price.'
              },
            ].map(p => (
              <div key={p.n} className="meth-pillar">
                <div className="meth-pillar-num">{p.n}</div>
                <div className="meth-pillar-icon" style={{ color: p.color }}>{p.icon}</div>
                <div className="meth-pillar-name">{p.name}</div>
                <div className="meth-pillar-label">{p.label}</div>
                <div className="meth-pillar-body">{p.body}</div>
              </div>
            ))}
          </div>

          {/* L5F factor detail */}
          <div className="meth-l5f">
            <div className="meth-l5f-left">
              <div className="meth-l5f-title">L5F Composite Formula</div>
              <div className="meth-l5f-headline">Five orthogonal factors.<br />One verified score.</div>
              <p className="meth-l5f-body">
                The L5F model is designed to be resistant to single-venue manipulation
                and to separate structural liquidity quality from ephemeral price
                volatility. Each factor targets a distinct dimension of executable
                liquidity, and the weights reflect empirical importance across market
                stress cycles.
              </p>
              <div className="meth-l5f-formula">
                PoLi = (<span>DQ</span> × 0.30) + (<span>R</span> × 0.20)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (<span>F</span> × 0.15) + (<span>EI</span> × 0.20)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (<span>RS</span> × 0.15)<br />
                <br />
                where all factors are normalised to [0, 100]
              </div>
            </div>
            <div className="meth-l5f-right">
              {[
                { code: 'DQ', name: 'Depth Quality',       weight: '30%', w: 30, color: '#F0C000', desc: 'Notional bid/ask depth within 10, 25, and 100 bps bands. Point-in-time.' },
                { code: 'EI', name: 'Execution Integrity', weight: '20%', w: 20, color: '#00d4ff', desc: 'Trade-to-quote ratio, slippage consistency, and spoofing signal indicators.' },
                { code: 'R',  name: 'Resilience',          weight: '20%', w: 20, color: '#4ade80', desc: 'Speed of depth replenishment after large executions. Requires ~3–5 min buffer.' },
                { code: 'F',  name: 'Fragmentation',       weight: '15%', w: 15, color: '#a78bfa', desc: 'Inverted HHI across venue market shares. Higher score = more distributed liquidity.' },
                { code: 'RS', name: 'Regime Stability',    weight: '15%', w: 15, color: '#fb923c', desc: 'Time in NORMAL or THIN regime vs. stress states over the rolling window.' },
              ].map(f => (
                <div key={f.code} className="meth-factor">
                  <div className="meth-factor-header">
                    <div className="meth-factor-left">
                      <span className="meth-factor-code" style={{ color: f.color }}>{f.code}</span>
                      <span className="meth-factor-name">{f.name}</span>
                    </div>
                    <span className="meth-factor-weight">{f.weight}</span>
                  </div>
                  <div className="meth-factor-bar-track">
                    <div className="meth-factor-bar-fill" style={{ width: `${f.w / 0.30}%`, background: f.color, opacity: 0.6 }} />
                  </div>
                  <div className="meth-factor-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PoLi rating scale */}
          <div className="meth-rating">
            <div className="meth-rating-title">PoLi Rating Scale</div>
            <div className="meth-rating-scale">
              {[
                { grade: 'AAA', range: '90–100', label: 'Exceptional depth, minimal fragmentation, stable regime', color: '#4ade80' },
                { grade: 'AA+', range: '85–89',  label: 'Strong liquidity across venues with high execution integrity', color: '#4ade80' },
                { grade: 'AA',  range: '80–84',  label: 'Above-average depth with minor venue concentration', color: '#86efac' },
                { grade: 'A+',  range: '75–79',  label: 'Adequate liquidity, modest fragmentation or resilience gap', color: '#F0C000' },
                { grade: 'A',   range: '70–74',  label: 'Functional but showing early stress indicators', color: '#F0C000' },
                { grade: 'BBB', range: '60–69',  label: 'Below-par depth or elevated venue concentration', color: '#fb923c' },
                { grade: 'BB',  range: '50–59',  label: 'Material liquidity risk; depth may not support large orders', color: '#fb923c' },
                { grade: 'CCC', range: '30–49',  label: 'Severe fragmentation or confirmed stress regime', color: '#f87171' },
                { grade: 'D',   range: '0–29',   label: 'Effectively illiquid; execution risk is extreme', color: '#ef4444' },
              ].map(b => (
                <div key={b.grade} className="meth-rating-band">
                  <div className="meth-band-grade" style={{ color: b.color }}>{b.grade}</div>
                  <div className="meth-band-range">{b.range}</div>
                  <div className="meth-band-label">{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Regime states */}
          <div className="meth-regimes">
            <div className="meth-regimes-title">Regime Classification States</div>
            <div className="meth-regimes-grid">
              {[
                { name: 'NORMAL',           color: '#4ade80', dot: '#4ade80', body: 'Depth is adequate, spread within historical norms, no cross-venue divergence signals detected.' },
                { name: 'THIN',             color: '#86efac', dot: '#86efac', body: 'Depth has declined modestly relative to baseline. Executions above median size carry elevated impact.' },
                { name: 'EARLY_WARNING',    color: '#F0C000', dot: '#F0C000', body: 'One or more stress indicators are elevated. Resilience or fragmentation beginning to deteriorate.' },
                { name: 'STRESS_BUILDING',  color: '#fb923c', dot: '#fb923c', body: 'Multiple simultaneous stress signals. Cross-venue divergence is statistically significant.' },
                { name: 'STRESSED',         color: '#f87171', dot: '#f87171', body: 'Confirmed structural dislocation. Depth has deteriorated materially. Execution integrity degraded.' },
                { name: 'CONFIRMED_STRESS', color: '#ef4444', dot: '#ef4444', body: 'Persistent STRESSED state. Regime has held for multiple consecutive measurement windows. Maximum alert severity.' },
              ].map(r => (
                <div key={r.name} className="meth-regime">
                  <div className="meth-regime-header">
                    <div className="meth-regime-dot" style={{ background: r.dot }} />
                    <span className="meth-regime-name" style={{ color: r.color }}>{r.name}</span>
                  </div>
                  <div className="meth-regime-body">{r.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Liquidity Horizons */}
          <div className="meth-horizons">
            {[
              { tag: 'NOW', name: 'Immediacy Horizon', window: 'Rolling 60-second window', desc: 'Intra-session snapshot for live execution decisions. Reflects current order book state and recent trade flow. Used by real-time alert thresholds.' },
              { tag: 'SESSION', name: 'Session Horizon', window: 'Current trading session (~8–12h)', desc: 'Smooths intra-day noise to produce a session-representative liquidity state. Used for margin and collateral assessment workflows.' },
              { tag: 'BASELINE', name: 'Structural Baseline', window: '30-day rolling average', desc: 'Long-run structural liquidity norms against which session and immediacy values are compared. Anchors regime classification and stress thresholds.' },
            ].map(h => (
              <div key={h.tag} className="meth-horizon">
                <div className="meth-horizon-tag">{h.tag}</div>
                <div className="meth-horizon-name">{h.name}</div>
                <div className="meth-horizon-window">{h.window}</div>
                <div className="meth-horizon-desc">{h.desc}</div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="meth-cta-strip">
            <div className="meth-cta-text">
              <div className="meth-cta-title">Ready to apply the standard?</div>
              <div className="meth-cta-sub">Request institutional access or contact our research desk for a technical briefing.</div>
            </div>
            <div className="meth-cta-actions">
              <button
                className="meth-cta-primary"
                data-testid="button-methodology-request-access"
                onClick={() => setLocation('/login')}
              >
                Request Access
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button
                className="meth-cta-secondary"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Back to top
              </button>
            </div>
          </div>

        </section>

      </div>
    </>
  );
}
