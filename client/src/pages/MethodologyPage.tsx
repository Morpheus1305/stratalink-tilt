import { useLocation } from 'wouter';

export default function MethodologyPage() {
  const [, setLocation] = useLocation();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

        .mp-page {
          font-family: 'Inter', sans-serif;
          background: #03060f;
          color: #e2e8f0;
          min-height: 100dvh;
          overflow-y: auto;
        }

        /* Nav */
        .mp-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(3,6,15,0.92);
          backdrop-filter: blur(12px);
        }
        .mp-nav-brand { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
        .mp-nav-wordmark { font-weight: 700; font-size: 0.75rem; letter-spacing: 0.25em; text-transform: uppercase; color: #fff; }
        .mp-nav-pipe { color: rgba(255,255,255,0.2); }
        .mp-nav-subtitle { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.38); font-weight: 500; }
        .mp-nav-actions { display: flex; align-items: center; gap: 1.5rem; }
        .mp-nav-link { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.38); background: none; border: none; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; }
        .mp-nav-link:hover { color: rgba(255,255,255,0.7); }
        .mp-nav-link-active { color: rgba(255,255,255,0.8) !important; }
        .mp-nav-btn { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 1.25rem; background: rgba(255,255,255,0.04); cursor: pointer; font-family: 'Inter', sans-serif; }
        .mp-nav-btn:hover { background: rgba(255,255,255,0.08); }

        /* Hero banner */
        .mp-hero {
          padding: 5rem 3rem 4rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(to bottom, rgba(3,6,15,1) 0%, rgba(5,10,20,1) 100%);
          position: relative; overflow: hidden;
        }
        .mp-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 60% at 70% 50%, rgba(0,212,255,0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        .mp-hero-eyebrow { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; }
        .mp-hero-line { width: 2.5rem; height: 1px; background: rgba(140,170,255,0.3); }
        .mp-hero-eyebrow-text { font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase; color: rgba(140,170,255,0.5); font-weight: 600; }
        .mp-hero-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-style: italic; font-size: clamp(2.5rem, 4.5vw, 4.25rem); color: #fff; line-height: 1.08; margin-bottom: 1.5rem; max-width: 42rem; }
        .mp-hero-title strong { font-style: normal; font-weight: 600; }
        .mp-hero-intro { font-size: 0.9rem; color: rgba(255,255,255,0.42); line-height: 1.85; font-weight: 300; max-width: 48rem; }

        /* Section header */
        .mp-section { padding: 4rem 3rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .mp-section:last-of-type { border-bottom: none; }
        .mp-section-tag { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: 2.5rem; display: flex; align-items: center; gap: 0.75rem; }
        .mp-section-tag::before { content: ''; display: block; width: 1.5rem; height: 1px; background: rgba(255,255,255,0.15); }

        /* ── 1. Framework overview pillars ── */
        .mp-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 3rem; }
        .mp-pillar { background: #03060f; padding: 1.75rem 1.5rem; transition: background 0.15s; }
        .mp-pillar:hover { background: rgba(255,255,255,0.02); }
        .mp-pillar-num { font-size: 0.5rem; font-weight: 700; letter-spacing: 0.25em; color: rgba(255,255,255,0.15); margin-bottom: 1.1rem; }
        .mp-pillar-icon { margin-bottom: 0.9rem; }
        .mp-pillar-icon svg { width: 18px; height: 18px; }
        .mp-pillar-name { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.82); margin-bottom: 0.25rem; }
        .mp-pillar-abbr { font-size: 0.6rem; letter-spacing: 0.12em; color: rgba(255,255,255,0.22); margin-bottom: 0.875rem; font-style: italic; }
        .mp-pillar-body { font-size: 0.72rem; color: rgba(255,255,255,0.36); line-height: 1.7; font-weight: 300; }

        /* ── 2. L5F ── */
        .mp-l5f { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start; }
        .mp-l5f-copy-tag { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 0.5rem; }
        .mp-l5f-heading { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: clamp(1.5rem, 2.5vw, 2.25rem); color: #fff; margin-bottom: 1rem; line-height: 1.15; }
        .mp-l5f-body { font-size: 0.8rem; color: rgba(255,255,255,0.36); line-height: 1.75; font-weight: 300; margin-bottom: 1.5rem; }
        .mp-formula { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); padding: 1.25rem 1.5rem; font-size: 0.72rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.4); line-height: 1.7; }
        .mp-formula em { color: #00d4ff; font-style: normal; }
        .mp-factor { margin-bottom: 1.25rem; }
        .mp-factor:last-child { margin-bottom: 0; }
        .mp-factor-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }
        .mp-factor-left { display: flex; align-items: center; gap: 0.75rem; }
        .mp-factor-code { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; width: 22px; }
        .mp-factor-name { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.7); }
        .mp-factor-weight { font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.28); }
        .mp-factor-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 1px; margin-bottom: 0.25rem; }
        .mp-factor-fill { height: 3px; border-radius: 1px; opacity: 0.65; }
        .mp-factor-desc { font-size: 0.67rem; color: rgba(255,255,255,0.27); }

        /* ── 3. PoLi rating scale ── */
        .mp-rating-scale { display: flex; gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .mp-band { flex: 1; background: #03060f; padding: 1.1rem 0.75rem; }
        .mp-band-grade { font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem; }
        .mp-band-range { font-size: 0.52rem; font-weight: 600; letter-spacing: 0.08em; color: rgba(255,255,255,0.25); margin-bottom: 0.5rem; }
        .mp-band-label { font-size: 0.6rem; color: rgba(255,255,255,0.28); line-height: 1.4; }

        /* ── 4. PoMI ── */
        .mp-pomi-intro { font-size: 0.85rem; color: rgba(255,255,255,0.4); line-height: 1.8; font-weight: 300; max-width: 48rem; margin-bottom: 2.5rem; }
        .mp-pomi-pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 2.5rem; }
        .mp-pomi-pillar { background: #03060f; padding: 1.75rem 1.5rem; }
        .mp-pomi-pillar-label { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 0.5rem; }
        .mp-pomi-pillar-name { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.82); margin-bottom: 0.75rem; }
        .mp-pomi-pillar-body { font-size: 0.72rem; color: rgba(255,255,255,0.35); line-height: 1.7; font-weight: 300; }
        .mp-pomi-states { display: flex; gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .mp-pomi-state { flex: 1; background: #03060f; padding: 1.1rem 1.25rem; }
        .mp-pomi-state-dot-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
        .mp-pomi-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .mp-pomi-state-name { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; }
        .mp-pomi-state-body { font-size: 0.67rem; color: rgba(255,255,255,0.3); line-height: 1.5; }

        /* ── 5. Regime ── */
        .mp-regimes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .mp-regime { background: #03060f; padding: 1.25rem 1.5rem; }
        .mp-regime-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .mp-regime-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .mp-regime-name { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; }
        .mp-regime-body { font-size: 0.68rem; color: rgba(255,255,255,0.3); line-height: 1.5; }

        /* ── 6. STRATA AI ── */
        .mp-ai-intro { font-size: 0.85rem; color: rgba(255,255,255,0.4); line-height: 1.8; font-weight: 300; max-width: 48rem; margin-bottom: 2.5rem; }
        .mp-ai-categories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 2.5rem; }
        .mp-ai-cat { background: #03060f; padding: 1.75rem 1.5rem; }
        .mp-ai-cat-tag { font-size: 0.5rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.18); margin-bottom: 0.75rem; }
        .mp-ai-cat-icon { margin-bottom: 0.75rem; }
        .mp-ai-cat-icon svg { width: 16px; height: 16px; }
        .mp-ai-cat-name { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.8); margin-bottom: 0.25rem; }
        .mp-ai-cat-sub { font-size: 0.62rem; color: rgba(255,255,255,0.22); margin-bottom: 0.75rem; letter-spacing: 0.04em; }
        .mp-ai-cat-body { font-size: 0.7rem; color: rgba(255,255,255,0.33); line-height: 1.65; font-weight: 300; }
        .mp-ai-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start; margin-bottom: 2.5rem; }
        .mp-ai-col-heading { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: clamp(1.25rem, 2vw, 1.875rem); color: #fff; margin-bottom: 0.75rem; line-height: 1.2; }
        .mp-ai-col-body { font-size: 0.78rem; color: rgba(255,255,255,0.36); line-height: 1.75; font-weight: 300; }
        .mp-ai-inputs { display: flex; flex-direction: column; gap: 0.625rem; margin-top: 1.25rem; }
        .mp-ai-input { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
        .mp-ai-input-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
        .mp-ai-input-label { font-size: 0.68rem; font-weight: 600; color: rgba(255,255,255,0.65); margin-bottom: 0.1rem; }
        .mp-ai-input-sub { font-size: 0.63rem; color: rgba(255,255,255,0.28); line-height: 1.45; }
        .mp-ai-outputs { display: flex; flex-direction: column; gap: 0.625rem; margin-top: 1.25rem; }
        .mp-ai-output { padding: 0.75rem 1rem; border-left: 2px solid; }
        .mp-ai-output-name { font-size: 0.68rem; font-weight: 600; margin-bottom: 0.1rem; }
        .mp-ai-output-sub { font-size: 0.63rem; color: rgba(255,255,255,0.28); line-height: 1.45; }

        /* ── 7. Liquidity Horizons ── */
        .mp-horizons { display: flex; gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .mp-horizon { flex: 1; background: #03060f; padding: 1.75rem 1.5rem; }
        .mp-horizon-tag { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.18em; color: #00d4ff; margin-bottom: 0.5rem; }
        .mp-horizon-name { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 0.35rem; }
        .mp-horizon-window { font-size: 0.63rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.22); margin-bottom: 0.5rem; }
        .mp-horizon-desc { font-size: 0.7rem; color: rgba(255,255,255,0.33); line-height: 1.55; }

        /* ── 8. Venue Role Doctrine ── */
        .mp-venues { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .mp-venue-role { background: #03060f; padding: 1.75rem 1.5rem; }
        .mp-venue-role-tag { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 0.5rem; }
        .mp-venue-role-name { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.82); margin-bottom: 0.6rem; }
        .mp-venue-role-examples { font-size: 0.62rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.22); margin-bottom: 0.6rem; }
        .mp-venue-role-body { font-size: 0.72rem; color: rgba(255,255,255,0.35); line-height: 1.65; font-weight: 300; }

        /* Bottom CTA */
        .mp-cta { padding: 4rem 3rem; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .mp-cta-title { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: clamp(1.25rem, 2vw, 1.875rem); color: #fff; margin-bottom: 0.4rem; }
        .mp-cta-sub { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .mp-cta-btns { display: flex; gap: 1rem; flex-shrink: 0; }
        .mp-btn-primary { padding: 0.875rem 2rem; background: #fff; color: #03060f; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; border: none; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 0.5rem; }
        .mp-btn-primary:hover { background: #e8edf5; }
        .mp-btn-ghost { padding: 0.875rem 1.75rem; background: transparent; color: rgba(255,255,255,0.48); font-size: 0.65rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-family: 'Inter', sans-serif; }
        .mp-btn-ghost:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }
      ` }} />

      <div className="mp-page">

        {/* ── NAV ── */}
        <nav className="mp-nav">
          <div className="mp-nav-brand" onClick={() => setLocation('/')}>
            <img src="/images/stratalink-logo.png" alt="StrataLink" style={{ height: 28, width: "auto" }} />
            <span className="mp-nav-wordmark">StrataLink Labs</span>
            <span className="mp-nav-pipe">|</span>
            <span className="mp-nav-subtitle">The Institutional Liquidity Truth Terminal</span>
          </div>
          <div className="mp-nav-actions">
            <button className="mp-nav-link mp-nav-link-active" data-testid="nav-methodology-active">Methodology</button>
            <button className="mp-nav-link" onClick={() => setLocation('/')}>Regulators</button>
            <button className="mp-nav-btn" onClick={() => setLocation('/login')}>Client Login</button>
          </div>
        </nav>

        {/* ── HERO BANNER ── */}
        <div className="mp-hero">
          <div className="mp-hero-eyebrow">
            <span className="mp-hero-line" />
            <span className="mp-hero-eyebrow-text">Technical Framework · v2.4</span>
          </div>
          <h1 className="mp-hero-title">
            A formally verified framework<br />
            for <strong>liquidity truth.</strong>
          </h1>
          <p className="mp-hero-intro">
            StrataLink's methodology formalises what liquidity means for institutional participants — moving beyond
            price-impact estimates and static bid-ask spreads toward a cryptographically provable, multi-venue,
            time-aware standard that includes market integrity verification and AI-driven anomaly detection.
            Every metric traces to a single immutable source of record: DACT.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1 — Framework Overview (8 pillars)
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">Framework Overview</div>
          <div className="mp-pillars">
            {[
              {
                n: '01', color: '#F0C000',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                name: 'DACT', abbr: 'Digital Asset Consolidated Tape',
                body: 'Cryptographically anchored, read-only consolidated tape. Every market event records source venue, transport method, and sequence number. The immutable ground truth from which all analytics derive.'
              },
              {
                n: '02', color: '#00d4ff',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                name: 'PoLi', abbr: 'Proof of Liquidity Score',
                body: 'A 0–100 numeric score with AAA–D rating bands quantifying the quality, depth, and continuity of executable liquidity. Computed from the L5F composite model across 14 integrated venues.'
              },
              {
                n: '03', color: '#a78bfa',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                name: 'L5F', abbr: 'Liquidity 5-Factor Model',
                body: 'Weighted composite across five orthogonal factors: Depth Quality (30%), Execution Integrity (20%), Resilience (20%), Fragmentation (15%), Regime Stability (15%).'
              },
              {
                n: '04', color: '#4ade80',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                name: 'TSLE', abbr: 'Time-Series Liquidity Engine',
                body: 'Formalises three price-independent invariants: intensity, resilience, and continuity. Powers the 360-point ring buffer (~1 hour at 10s intervals) consumed by L5F analytics.'
              },
              {
                n: '05', color: '#f87171',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                name: 'Regime', abbr: 'Market Liquidity State Detection',
                body: 'Dynamic classification into six states — NORMAL through CONFIRMED_STRESS — derived from cross-venue divergence, spread expansion, resilience decay, and funding rate dislocation.'
              },
              {
                n: '06', color: '#fb923c',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                name: 'Venue Doctrine', abbr: 'Cross-Venue Role Classification',
                body: 'Each venue is assigned a structural role — REFERENCE, STRESS, DARK, or ATTESTATION — enabling divergence detection between venue classes before dislocations appear in consolidated price.'
              },
              {
                n: '07', color: '#38bdf8',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
                name: 'PoMI', abbr: 'Proof of Market Integrity',
                body: 'A three-pillar score measuring market coordination: Threshold Score (circuit-breaker status), Throttle Score (volatility regime), and Venue Sync Score (perp basis cross-venue alignment).'
              },
              {
                n: '08', color: '#c084fc',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M22 2L12 12"/><path d="M16 2h6v6"/></svg>,
                name: 'STRATA AI', abbr: 'AI Market Surveillance Engine',
                body: 'ML-powered anomaly detection across six detection categories: spoofing, wash trading, depth manipulation, regime forecasting, cross-venue arbitrage anomalies, and early-warning detection system (EWDS).'
              },
            ].map(p => (
              <div key={p.n} className="mp-pillar">
                <div className="mp-pillar-num">{p.n}</div>
                <div className="mp-pillar-icon" style={{ color: p.color }}>{p.icon}</div>
                <div className="mp-pillar-name">{p.name}</div>
                <div className="mp-pillar-abbr">{p.abbr}</div>
                <div className="mp-pillar-body">{p.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2 — L5F Five-Factor Model
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">L5F · Liquidity 5-Factor Model</div>
          <div className="mp-l5f">
            <div>
              <div className="mp-l5f-copy-tag">Composite Scoring Formula</div>
              <div className="mp-l5f-heading">Five orthogonal factors.<br />One verified score.</div>
              <p className="mp-l5f-body">
                The L5F model is resistant to single-venue manipulation and separates structural
                liquidity quality from ephemeral price volatility. Each factor targets a distinct
                dimension of executable liquidity; weights reflect empirical importance across
                market stress cycles. DQ and Fragmentation are point-in-time; Resilience and
                Regime Stability require a minimum 3–5 minutes of buffer history before
                reflecting real values.
              </p>
              <div className="mp-formula">
                PoLi = (<em>DQ</em> × 0.30) + (<em>EI</em> × 0.20)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (<em>R</em> × 0.20) + (<em>F</em> × 0.15)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (<em>RS</em> × 0.15)<br />
                <br />
                where all factors ∈ [0, 100]
              </div>
            </div>
            <div>
              {[
                { code: 'DQ', name: 'Depth Quality',       weight: '30%', w: 100, color: '#F0C000', desc: 'Notional bid/ask depth within 10, 25, and 100 bps bands across all venues. Point-in-time calculation.' },
                { code: 'EI', name: 'Execution Integrity', weight: '20%', w: 67,  color: '#00d4ff', desc: 'Trade-to-quote ratio, slippage consistency, and spoofing signal indicators from STRATA AI detection pipeline.' },
                { code: 'R',  name: 'Resilience',          weight: '20%', w: 67,  color: '#4ade80', desc: 'Speed of depth replenishment after large executions. Requires ~3–5 min buffer history before reflecting live values.' },
                { code: 'F',  name: 'Fragmentation',       weight: '15%', w: 50,  color: '#a78bfa', desc: 'Inverted HHI across venue market shares. Higher score = more distributed, less concentrated liquidity.' },
                { code: 'RS', name: 'Regime Stability',    weight: '15%', w: 50,  color: '#fb923c', desc: 'Proportion of time in NORMAL or THIN regime vs. stress states over the rolling TSLE window.' },
              ].map(f => (
                <div key={f.code} className="mp-factor">
                  <div className="mp-factor-row">
                    <div className="mp-factor-left">
                      <span className="mp-factor-code" style={{ color: f.color }}>{f.code}</span>
                      <span className="mp-factor-name">{f.name}</span>
                    </div>
                    <span className="mp-factor-weight">{f.weight}</span>
                  </div>
                  <div className="mp-factor-track">
                    <div className="mp-factor-fill" style={{ width: `${f.w}%`, background: f.color }} />
                  </div>
                  <div className="mp-factor-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3 — PoLi Rating Scale
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">PoLi · Rating Scale</div>
          <div className="mp-rating-scale">
            {[
              { grade: 'AAA', range: '90–100', label: 'Exceptional depth, minimal fragmentation, stable regime', color: '#4ade80' },
              { grade: 'AA+', range: '85–89',  label: 'Strong liquidity with high execution integrity',         color: '#4ade80' },
              { grade: 'AA',  range: '80–84',  label: 'Above-average depth with minor venue concentration',    color: '#86efac' },
              { grade: 'A+',  range: '75–79',  label: 'Adequate; modest fragmentation or resilience gap',      color: '#F0C000' },
              { grade: 'A',   range: '70–74',  label: 'Functional but showing early stress indicators',        color: '#F0C000' },
              { grade: 'BBB', range: '60–69',  label: 'Below-par depth or elevated venue concentration',       color: '#fb923c' },
              { grade: 'BB',  range: '50–59',  label: 'Material risk; depth may not support large orders',     color: '#fb923c' },
              { grade: 'CCC', range: '30–49',  label: 'Severe fragmentation or confirmed stress regime',       color: '#f87171' },
              { grade: 'D',   range: '0–29',   label: 'Effectively illiquid; execution risk is extreme',       color: '#ef4444' },
            ].map(b => (
              <div key={b.grade} className="mp-band">
                <div className="mp-band-grade" style={{ color: b.color }}>{b.grade}</div>
                <div className="mp-band-range">{b.range}</div>
                <div className="mp-band-label">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 4 — PoMI · Proof of Market Integrity
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">PoMI · Proof of Market Integrity</div>
          <p className="mp-pomi-intro">
            PoMI extends beyond liquidity depth to verify the structural integrity of market
            coordination mechanisms. It scores the health of the cross-venue stabilisation
            infrastructure — circuit breakers, volatility throttles, and perp-spot basis
            alignment — producing a single composite score with the same AAA–D rating bands
            as PoLi, displayed alongside it on the PoLi / PoMI terminal tab.
          </p>
          <div className="mp-pomi-pillars">
            {[
              {
                color: '#F0C000', label: 'Pillar 01',
                name: 'Threshold Score',
                body: 'Evaluates the status of cross-venue circuit breakers and price-band thresholds. ACTIVE (96) indicates mechanisms are operational; WEAKENING (75) signals narrowing coordination window; BREACHED (40) indicates threshold failure. Derived from the worst-case RAG status across all monitored venues in the current TSLE snapshot.'
              },
              {
                color: '#00d4ff', label: 'Pillar 02',
                name: 'Throttle Score',
                body: 'Maps the current volatility regime (NORMAL → ELEVATED → STRESS) from the TSLE aggregate to a scored pillar: STANDBY (91) in NORMAL regime, PARTIAL (70) in ELEVATED, ACTIVE (30) in STRESS. Reflects whether the market is operating under throttle conditions that constrain normal order flow and execution patterns.'
              },
              {
                color: '#4ade80', label: 'Pillar 03',
                name: 'Venue Sync Score',
                body: 'Measures cross-venue perpetual-spot basis alignment. COORDINATED (89) when perp basis < 3 bps; MINOR DRIFT (65) at 3–8 bps; FRAGMENTING (30) above 8 bps. Basis divergence above threshold signals that venues are not pricing the same underlying consistently — a leading indicator of structural dislocation.'
              },
            ].map(p => (
              <div key={p.name} className="mp-pomi-pillar">
                <div className="mp-pomi-pillar-label" style={{ color: p.color }}>{p.label}</div>
                <div className="mp-pomi-pillar-name">{p.name}</div>
                <div className="mp-pomi-pillar-body">{p.body}</div>
              </div>
            ))}
          </div>
          <div className="mp-pomi-states">
            {[
              { name: 'STABLE',      color: '#4ade80', body: 'All three pillars ≥ 85. Coordination mechanisms intact, stability infrastructure fully operational.' },
              { name: 'MONITORING',  color: '#86efac', body: 'Composite 70–84. Coordination window narrowing; monitoring for escalation triggers across one or more pillars.' },
              { name: 'PARTIAL',     color: '#F0C000', body: 'Composite 50–69. Partial throttle engagement advisable. Threshold monitoring active on at least one venue cluster.' },
              { name: 'CONSTRAINED', color: '#f87171', body: 'Composite < 50. Cross-venue stabilisation integrity compromised. Systemic coordination capacity severely constrained.' },
            ].map(s => (
              <div key={s.name} className="mp-pomi-state">
                <div className="mp-pomi-state-dot-row">
                  <div className="mp-pomi-dot" style={{ background: s.color }} />
                  <span className="mp-pomi-state-name" style={{ color: s.color }}>{s.name}</span>
                </div>
                <div className="mp-pomi-state-body">{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 5 — Regime Classification
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">Regime Classification · Six-State Model</div>
          <div className="mp-regimes-grid">
            {[
              { name: 'NORMAL',           color: '#4ade80', body: 'Depth adequate, spread within historical norms, no cross-venue divergence. All PoMI pillars ACTIVE.' },
              { name: 'THIN',             color: '#86efac', body: 'Depth declined modestly vs. baseline. Executions above median size carry elevated impact. PoLi typically 70–84.' },
              { name: 'EARLY_WARNING',    color: '#F0C000', body: 'One or more stress indicators elevated. Resilience or fragmentation beginning to deteriorate. STRATA AI EWDS activated.' },
              { name: 'STRESS_BUILDING',  color: '#fb923c', body: 'Multiple simultaneous stress signals. Cross-venue divergence statistically significant. PoMI Throttle Score degrading.' },
              { name: 'STRESSED',         color: '#f87171', body: 'Confirmed structural dislocation. Depth deteriorated materially. Execution integrity degraded. PoLi typically < 60.' },
              { name: 'CONFIRMED_STRESS', color: '#ef4444', body: 'Persistent STRESSED state across multiple consecutive windows. Maximum alert severity. PoMI likely CONSTRAINED.' },
            ].map(r => (
              <div key={r.name} className="mp-regime">
                <div className="mp-regime-head">
                  <div className="mp-regime-dot" style={{ background: r.color }} />
                  <span className="mp-regime-name" style={{ color: r.color }}>{r.name}</span>
                </div>
                <div className="mp-regime-body">{r.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 6 — STRATA AI
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">STRATA AI · Market Surveillance Engine</div>
          <p className="mp-ai-intro">
            STRATA AI is the ML-powered market surveillance layer embedded within the Terminal.
            It operates continuously across the full DACT event stream, evaluating six detection
            categories in parallel and surfacing a prioritised signal feed of NORMAL, ELEVATED,
            and CRITICAL anomalies. Each signal includes a supporting evidence string, severity
            classification, and millisecond-precision timestamp for audit purposes.
          </p>

          {/* 6 detection categories */}
          <div className="mp-ai-categories">
            {[
              {
                n: '01', color: '#f87171',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                name: 'Spoofing Detection', sub: 'Order-book manipulation',
                body: 'Identifies large orders placed and rapidly withdrawn to create false depth impressions. Evaluates order-to-trade ratios, lifetime distributions, and cancel velocity relative to venue-specific baselines. Scores against the EI factor in L5F.'
              },
              {
                n: '02', color: '#fb923c',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
                name: 'Wash Trading', sub: 'Volume inflation detection',
                body: 'Detects artificial volume through counterparty clustering, timing correlation between buys and sells, and abnormal self-cross patterns. Volume inflation degrades PoLi Execution Integrity and triggers ELEVATED signals in the detection feed.'
              },
              {
                n: '03', color: '#F0C000',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                name: 'Depth Manipulation', sub: 'Layering & quote stuffing',
                body: 'Monitors for abnormal depth band distributions — disproportionate liquidity concentrations at specific price levels — and quote-stuffing patterns that saturate matching engine capacity without genuine trading intent.'
              },
              {
                n: '04', color: '#4ade80',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                name: 'Regime Forecasting', sub: 'Predictive stress classification',
                body: 'Applies a rolling ensemble of momentum, volatility, and order-flow features to forecast regime transitions 2–10 minutes ahead. Early regime forecasts trigger EARLY_WARNING state and alert dispatch before the regime scores confirm stress.'
              },
              {
                n: '05', color: '#38bdf8',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                name: 'Cross-Venue Anomalies', sub: 'Inter-exchange divergence',
                body: 'Compares price, spread, and depth across REFERENCE and STRESS venues simultaneously. Statistical divergence above threshold — particularly when a stress venue leads a reference venue on spread — is a leading indicator of structural dislocation.'
              },
              {
                n: '06', color: '#c084fc',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
                name: 'EWDS', sub: 'Early Warning Detection System',
                body: 'A composite trigger combining all five other detection categories plus regime forecasting. EWDS fires when two or more detection categories simultaneously reach ELEVATED or higher, or when regime forecast probability of STRESSED exceeds 70%, activating high-priority alert dispatch.'
              },
            ].map(c => (
              <div key={c.n} className="mp-ai-cat">
                <div className="mp-ai-cat-tag">{c.n}</div>
                <div className="mp-ai-cat-icon" style={{ color: c.color }}>{c.icon}</div>
                <div className="mp-ai-cat-name">{c.name}</div>
                <div className="mp-ai-cat-sub">{c.sub}</div>
                <div className="mp-ai-cat-body">{c.body}</div>
              </div>
            ))}
          </div>

          {/* Inputs → Outputs */}
          <div className="mp-ai-two-col">
            <div>
              <div className="mp-ai-col-heading">What STRATA AI consumes</div>
              <p className="mp-ai-col-body">
                The engine reads directly from the DACT event stream and the TSLE ring buffer,
                requiring no additional data pipelines. All inputs are already validated and
                provenance-stamped before reaching the detection layer.
              </p>
              <div className="mp-ai-inputs">
                {[
                  { color: '#F0C000', label: 'DACT Event Stream', sub: 'DEPTH_UPDATE, TRADE, LIQUIDATION, FUNDING, SPREAD_CHANGE at raw tick rate' },
                  { color: '#00d4ff', label: 'TSLE Ring Buffer',   sub: '360-point LIS snapshot history (~1 hour) for rolling feature extraction' },
                  { color: '#4ade80', label: 'L5F Factor Scores',  sub: 'Real-time DQ, R, F, EI, RS used as features in regime forecasting model' },
                  { color: '#a78bfa', label: 'PoMI Pillar Scores', sub: 'Threshold, Throttle, and Venue Sync scores feed EWDS composite trigger' },
                ].map(i => (
                  <div key={i.label} className="mp-ai-input">
                    <div className="mp-ai-input-dot" style={{ background: i.color }} />
                    <div>
                      <div className="mp-ai-input-label">{i.label}</div>
                      <div className="mp-ai-input-sub">{i.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mp-ai-col-heading">What STRATA AI produces</div>
              <p className="mp-ai-col-body">
                Outputs are surfaced in real time on the STRATA AI terminal tab and feed into
                the alert dispatch system, the L5F Execution Integrity factor, and the
                regime classification engine.
              </p>
              <div className="mp-ai-outputs">
                {[
                  { color: '#f87171', name: 'Prioritised Signal Feed', sub: 'NORMAL / ELEVATED / CRITICAL signals with supporting evidence, category, and timestamp', bc: 'rgba(248,113,113,0.08)', bl: '#f87171' },
                  { color: '#F0C000', name: 'STRATA AI Composite Score', sub: 'Aggregate integrity score (0–100) across all six detection categories, updated every tick', bc: 'rgba(240,192,0,0.06)', bl: '#F0C000' },
                  { color: '#4ade80', name: 'EWDS Status', sub: 'Binary ARMED / STANDBY status with supporting detection category breakdown', bc: 'rgba(74,222,128,0.06)', bl: '#4ade80' },
                  { color: '#c084fc', name: 'EI Factor Update', sub: 'Execution Integrity pillar fed directly into L5F PoLi computation on each detection cycle', bc: 'rgba(192,132,252,0.06)', bl: '#c084fc' },
                ].map(o => (
                  <div key={o.name} className="mp-ai-output" style={{ borderColor: o.bl, background: o.bc }}>
                    <div className="mp-ai-output-name" style={{ color: o.color }}>{o.name}</div>
                    <div className="mp-ai-output-sub">{o.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 7 — Liquidity Horizons
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">Liquidity Horizons · Context-Aware Timeframes</div>
          <div className="mp-horizons">
            {[
              { tag: 'NOW', name: 'Immediacy Horizon', window: 'Rolling 60-second window', desc: 'Intra-session snapshot for live execution decisions. Reflects current order book state and recent trade flow. Used by real-time alert thresholds and STRATA AI detection triggers.' },
              { tag: 'SESSION', name: 'Session Horizon', window: 'Current trading session (~8–12 hours)', desc: 'Smooths intra-day noise to produce a session-representative liquidity state. Used for margin and collateral assessment workflows including the CCP Margin Verification Console.' },
              { tag: 'BASELINE', name: 'Structural Baseline', window: '30-day rolling average', desc: 'Long-run structural liquidity norms against which session and immediacy values are compared. Anchors regime classification thresholds and PoMI Venue Sync scoring ranges.' },
            ].map(h => (
              <div key={h.tag} className="mp-horizon">
                <div className="mp-horizon-tag">{h.tag}</div>
                <div className="mp-horizon-name">{h.name}</div>
                <div className="mp-horizon-window">{h.window}</div>
                <div className="mp-horizon-desc">{h.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 8 — Venue Role Doctrine
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="mp-section">
          <div className="mp-section-tag">Venue Role Doctrine · 14-Venue Classification</div>
          <div className="mp-venues">
            {[
              {
                color: '#F0C000', tag: 'REFERENCE_VENUE',
                name: 'Reference Venue',
                examples: 'Binance, Coinbase, Kraken, OKX',
                body: 'High-volume, regulated, or near-regulated exchanges that serve as the primary price-discovery anchors. PoLi scores are calibrated relative to reference venue depth norms. The Binance Authenticity Rule requires venue === "binance" AND provenance.sourceVenue === "binance" AND provenance.transport === "relay" — enforced across DACT, LIS, and all depth relays to prevent fallback mislabelling.'
              },
              {
                color: '#f87171', tag: 'STRESS_VENUE',
                name: 'Stress Venue',
                examples: 'Hyperliquid, dYdX, GMX, Bybit Perps',
                body: 'Perpetual DEXs and high-leverage perp venues that amplify stress signals during market dislocations. When a stress venue\'s spread or funding rate diverges materially from a reference venue, STRATA AI cross-venue anomaly detection fires. These venues provide the earliest leading indicators of structural stress events.'
              },
              {
                color: '#38bdf8', tag: 'DARK_VENUE',
                name: 'Dark Venue',
                examples: 'OTC RFQ Desk, Canton Network',
                body: 'Bilateral RFQ desks and DLT-native attestation venues. OTC depth is available at large notional sizes and represents genuine institutional executable liquidity invisible to the order book. Canton Network provides cryptographically attested on-chain liquidity commitments at the PoLi L5 trust tier.'
              },
              {
                color: '#4ade80', tag: 'ATTESTATION_VENUE',
                name: 'Attestation Venue',
                examples: 'Canton Network (Digital Asset / Daml)',
                body: 'Daml-contract-based venues where liquidity is expressed as on-chain attestations rather than traditional order books. Depth is normalised to LISSnapshot format and marked with transport: "attestation". Provides the highest trust-tier confirmation of executable liquidity for regulatory and CCP margin workflows.'
              },
            ].map(v => (
              <div key={v.tag} className="mp-venue-role">
                <div className="mp-venue-role-tag" style={{ color: v.color }}>{v.tag}</div>
                <div className="mp-venue-role-name">{v.name}</div>
                <div className="mp-venue-role-examples">{v.examples}</div>
                <div className="mp-venue-role-body">{v.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div className="mp-cta">
          <div>
            <div className="mp-cta-title">Apply the standard to your institution.</div>
            <div className="mp-cta-sub">Request institutional access or contact our research desk for a technical briefing.</div>
          </div>
          <div className="mp-cta-btns">
            <button
              className="mp-btn-primary"
              data-testid="button-methodology-request-access"
              onClick={() => setLocation('/login')}
            >
              Request Access
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="mp-btn-ghost" onClick={() => setLocation('/')}>Back to Cover</button>
          </div>
        </div>

      </div>
    </>
  );
}
