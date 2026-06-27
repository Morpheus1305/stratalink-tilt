import React from 'react';

export function CinematicDeep() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

        .cd-root {
          font-family: 'Inter', sans-serif;
          background: #03060f;
          color: #e2e8f0;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .cd-serif { font-family: 'Cormorant Garamond', serif; }

        .cd-bg {
          position: absolute; inset: 0; z-index: 0;
        }
        .cd-bg img {
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0.35; mix-blend-mode: luminosity;
        }
        .cd-bg-wash {
          position: absolute; inset: 0;
          background: linear-gradient(to right, #03060f 42%, #03060f99 68%, #03060f22 100%),
                      linear-gradient(to bottom, #03060fdd 0%, transparent 30%, #03060fcc 80%, #03060f 100%);
        }

        .cd-nav {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cd-nav-brand {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .cd-nav-wordmark {
          font-weight: 700; font-size: 0.75rem; letter-spacing: 0.25em;
          text-transform: uppercase; color: #fff;
        }
        .cd-nav-divider { color: rgba(255,255,255,0.2); }
        .cd-nav-subtitle {
          font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(255,255,255,0.4); font-weight: 500;
        }
        .cd-nav-actions { display: flex; align-items: center; gap: 1.5rem; }
        .cd-nav-link {
          font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
          text-decoration: none;
        }
        .cd-nav-btn {
          font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em;
          text-transform: uppercase; color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 1.25rem;
          background: rgba(255,255,255,0.04); cursor: pointer;
        }

        .cd-main {
          position: relative; z-index: 10;
          flex: 1; display: flex;
        }

        /* LEFT COLUMN */
        .cd-left {
          width: 52%; display: flex; flex-direction: column;
          justify-content: center; padding: 4rem 3rem 4rem 3rem;
        }
        .cd-live-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(0, 212, 255, 0.06);
          border: 1px solid rgba(0, 212, 255, 0.18);
          color: #00d4ff; font-size: 0.65rem; font-family: 'Inter', monospace;
          font-weight: 600; letter-spacing: 0.15em; margin-bottom: 2.5rem;
          width: fit-content;
        }
        .cd-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #00d4ff; animation: cdpulse 2s infinite;
        }
        @keyframes cdpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .cd-eyebrow {
          display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;
        }
        .cd-eyebrow-line { width: 2.5rem; height: 1px; background: rgba(140,170,255,0.3); }
        .cd-eyebrow-text {
          font-size: 0.6rem; letter-spacing: 0.35em; text-transform: uppercase;
          color: rgba(140,170,255,0.5); font-weight: 600;
        }
        .cd-headline {
          margin-bottom: 2rem; line-height: 0.88;
        }
        .cd-headline-pre {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300; font-style: italic;
          font-size: clamp(2rem, 3.5vw, 3.25rem);
          color: rgba(255,255,255,0.55); display: block;
          letter-spacing: 0.02em; margin-bottom: 0.15em;
        }
        .cd-headline-mid {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300; font-style: italic;
          font-size: clamp(2rem, 3.5vw, 3.25rem);
          color: rgba(255,255,255,0.55); display: block;
          letter-spacing: 0.02em; margin-bottom: 0.1em;
        }
        .cd-headline-main {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600; font-style: normal;
          font-size: clamp(4rem, 8vw, 7.5rem);
          color: #fff; display: block;
          letter-spacing: -0.01em;
          text-shadow: 0 0 80px rgba(255,255,255,0.06);
        }
        .cd-body {
          font-size: 0.9rem; color: rgba(255,255,255,0.45); line-height: 1.8;
          max-width: 28rem; margin-bottom: 2.5rem;
          border-left: 1px solid rgba(255,255,255,0.08); padding-left: 1.5rem;
          font-weight: 300; letter-spacing: 0.02em;
        }

        /* Differentiators */
        .cd-bullets { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 2.75rem; }
        .cd-bullet { display: flex; align-items: flex-start; gap: 0.875rem; }
        .cd-bullet-icon {
          width: 30px; height: 30px; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .cd-bullet-icon svg { width: 14px; height: 14px; }
        .cd-bullet-text {}
        .cd-bullet-title { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 0.1rem; }
        .cd-bullet-sub { font-size: 0.7rem; color: rgba(255,255,255,0.35); line-height: 1.5; }

        /* CTAs */
        .cd-ctas { display: flex; align-items: center; gap: 1.25rem; }
        .cd-cta-primary {
          padding: 0.875rem 2rem;
          background: #fff; color: #03060f;
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; border: none; cursor: pointer;
          box-shadow: 0 0 40px rgba(255,255,255,0.08);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .cd-cta-secondary {
          padding: 0.875rem 1.75rem;
          background: transparent; color: rgba(255,255,255,0.5);
          font-size: 0.65rem; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
        }

        /* RIGHT COLUMN */
        .cd-right {
          width: 48%; display: flex; align-items: center; justify-content: center;
          padding: 3rem 3rem 3rem 2rem; position: relative;
        }
        .cd-right-glow {
          position: absolute; top: 50%; left: 30%;
          transform: translate(-50%, -50%);
          width: 60%; height: 60%;
          background: radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .cd-panel {
          width: 100%; max-width: 440px;
          background: rgba(6, 12, 22, 0.92);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.04);
          display: flex; flex-direction: column;
          position: relative; z-index: 1;
          backdrop-filter: blur(8px);
        }
        .cd-panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(3,6,15,0.8);
        }
        .cd-panel-header-left { display: flex; align-items: center; gap: 0.5rem; }
        .cd-panel-header-label { font-size: 0.65rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.35); letter-spacing: 0.12em; }
        .cd-panel-dots { display: flex; gap: 4px; }
        .cd-panel-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.08); }

        .cd-panel-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

        /* Gauge + Depth row */
        .cd-row { display: flex; gap: 0.875rem; }
        .cd-gauge-card, .cd-depth-card {
          flex: 1;
          background: rgba(3,6,15,0.9);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 0.875rem;
          display: flex; flex-direction: column;
        }
        .cd-card-label {
          font-size: 0.55rem; font-family: 'Inter', monospace;
          color: rgba(255,255,255,0.3); letter-spacing: 0.15em; text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .cd-gauge-wrap {
          display: flex; align-items: center; justify-content: center; flex: 1;
        }
        .cd-gauge-inner {
          position: relative; width: 90px; height: 90px;
        }
        .cd-gauge-inner svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .cd-gauge-text {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .cd-gauge-score { font-size: 1.5rem; font-family: 'Inter', monospace; font-weight: 700; color: #fff; line-height: 1; }
        .cd-gauge-rating { font-size: 0.5rem; font-family: 'Inter', monospace; font-weight: 700; color: #F0C000; margin-top: 2px; letter-spacing: 0.1em; }

        .cd-depth-rows { display: flex; flex-direction: column; gap: 2px; }
        .cd-depth-row { display: flex; align-items: center; gap: 6px; }
        .cd-depth-price { font-size: 0.55rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.3); width: 52px; text-align: right; flex-shrink: 0; }
        .cd-depth-bar { height: 5px; border-radius: 0 1px 1px 0; }
        .cd-depth-mid { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
        .cd-depth-mid-price { font-size: 0.6rem; font-family: 'Inter', monospace; font-weight: 700; color: #fff; width: 52px; text-align: right; }
        .cd-depth-spread { font-size: 0.5rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.2); }

        /* Token table */
        .cd-table {
          background: rgba(3,6,15,0.9);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .cd-table-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.5rem 0.875rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cd-table-head-l { font-size: 0.55rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.3); letter-spacing: 0.15em; text-transform: uppercase; }
        .cd-table-head-r { font-size: 0.55rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.2); }
        .cd-table-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.45rem 0.875rem;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cd-table-row:last-child { border-bottom: none; }
        .cd-token-left { display: flex; align-items: center; gap: 0.6rem; }
        .cd-token-sym { font-size: 0.7rem; font-family: 'Inter', monospace; font-weight: 700; color: #fff; width: 32px; }
        .cd-token-name { font-size: 0.6rem; font-family: 'Inter', monospace; color: rgba(255,255,255,0.3); }
        .cd-token-right { display: flex; align-items: center; gap: 0.75rem; }
        .cd-token-score { font-size: 0.65rem; font-family: 'Inter', monospace; }
        .cd-token-badge { font-size: 0.5rem; font-family: 'Inter', monospace; font-weight: 700; padding: 1px 6px; border-radius: 1px; }

        /* Footer */
        .cd-footer {
          position: relative; z-index: 10;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 3rem;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(to top, rgba(3,6,15,0.9), transparent);
        }
        .cd-footer-label { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.2); white-space: nowrap; }
        .cd-footer-badges { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
        .cd-footer-badge { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.18); }
      `}} />

      <div className="cd-root">
        {/* Background */}
        <div className="cd-bg">
          <img src="/__mockup/images/cinematic-ocean-bg.png" alt="" />
          <div className="cd-bg-wash" />
        </div>

        {/* Nav */}
        <nav className="cd-nav">
          <div className="cd-nav-brand">
            <span className="cd-nav-wordmark">StrataLink Labs</span>
            <span className="cd-nav-divider">|</span>
            <span className="cd-nav-subtitle">Institutional Liquidity Terminal</span>
          </div>
          <div className="cd-nav-actions">
            <a href="#" className="cd-nav-link">Methodology</a>
            <a href="#" className="cd-nav-link">Regulators</a>
            <button className="cd-nav-btn">Client Login</button>
          </div>
        </nav>

        {/* Main split */}
        <main className="cd-main">

          {/* LEFT */}
          <div className="cd-left">
            <div className="cd-live-badge">
              <span className="cd-live-dot" />
              SYSTEM LIVE · v2.4.0
            </div>

            <div className="cd-eyebrow">
              <span className="cd-eyebrow-line" />
              <span className="cd-eyebrow-text">Institutional Digital Asset Markets</span>
            </div>

            <div className="cd-headline">
              <span className="cd-headline-pre">The Standard for</span>
              <span className="cd-headline-mid">Liquidity</span>
              <span className="cd-headline-main">VERIFICATION</span>
            </div>

            <p className="cd-body">
              The world's first and only liquidity verification infrastructure. Cryptographically anchored across 14 venues — the immutable ground truth for institutional risk management.
            </p>

            <div className="cd-bullets">
              <div className="cd-bullet">
                <div className="cd-bullet-icon" style={{ color: '#F0C000' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="cd-bullet-text">
                  <div className="cd-bullet-title">Cryptographically anchored DACT</div>
                  <div className="cd-bullet-sub">Immutable consolidated tape — provenance-complete, venue-authentic.</div>
                </div>
              </div>
              <div className="cd-bullet">
                <div className="cd-bullet-icon" style={{ color: '#00d4ff' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div className="cd-bullet-text">
                  <div className="cd-bullet-title">14-venue PoLi scoring</div>
                  <div className="cd-bullet-sub">Real-time Proof of Liquidity across CEX, DEX, and dark markets.</div>
                </div>
              </div>
              <div className="cd-bullet">
                <div className="cd-bullet-icon" style={{ color: '#4ade80' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="cd-bullet-text">
                  <div className="cd-bullet-title">Sub-second regime detection</div>
                  <div className="cd-bullet-sub">Identify STRESSED and EARLY_WARNING states before they cascade.</div>
                </div>
              </div>
            </div>

            <div className="cd-ctas">
              <button className="cd-cta-primary">
                Request Access
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
              <button className="cd-cta-secondary">View Methodology</button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="cd-right">
            <div className="cd-right-glow" />
            <div className="cd-panel">
              <div className="cd-panel-header">
                <div className="cd-panel-header-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                  <span className="cd-panel-header-label">TILT · LIVE FEED</span>
                </div>
                <div className="cd-panel-dots">
                  <div className="cd-panel-dot" />
                  <div className="cd-panel-dot" />
                  <div className="cd-panel-dot" />
                </div>
              </div>

              <div className="cd-panel-body">
                <div className="cd-row">
                  {/* PoLi Gauge */}
                  <div className="cd-gauge-card">
                    <div className="cd-card-label">Global PoLi</div>
                    <div className="cd-gauge-wrap">
                      <div className="cd-gauge-inner">
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.07)" strokeWidth="7" fill="none" strokeDasharray="251.2" strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="40" stroke="#F0C000" strokeWidth="7" fill="none" strokeDasharray="251.2" strokeDashoffset="50" strokeLinecap="round" />
                        </svg>
                        <div className="cd-gauge-text">
                          <span className="cd-gauge-score">80</span>
                          <span className="cd-gauge-rating">AA+</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Depth */}
                  <div className="cd-depth-card">
                    <div className="cd-card-label">Aggregated Depth</div>
                    <div className="cd-depth-rows">
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,246</span>
                        <div className="cd-depth-bar" style={{ width: '30%', background: 'rgba(248,113,113,0.7)' }} />
                      </div>
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,245</span>
                        <div className="cd-depth-bar" style={{ width: '55%', background: 'rgba(248,113,113,0.7)' }} />
                      </div>
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,244</span>
                        <div className="cd-depth-bar" style={{ width: '78%', background: 'rgba(248,113,113,0.7)' }} />
                      </div>
                      <div className="cd-depth-mid">
                        <span className="cd-depth-mid-price">98,243</span>
                        <span className="cd-depth-spread">0.50 SPREAD</span>
                      </div>
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,242</span>
                        <div className="cd-depth-bar" style={{ width: '100%', background: 'rgba(52,211,153,0.7)' }} />
                      </div>
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,241</span>
                        <div className="cd-depth-bar" style={{ width: '65%', background: 'rgba(52,211,153,0.7)' }} />
                      </div>
                      <div className="cd-depth-row">
                        <span className="cd-depth-price">98,240</span>
                        <div className="cd-depth-bar" style={{ width: '35%', background: 'rgba(52,211,153,0.7)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Table */}
                <div className="cd-table">
                  <div className="cd-table-head">
                    <span className="cd-table-head-l">Asset Coverage</span>
                    <span className="cd-table-head-r">LIVE · 14 VENUES</span>
                  </div>
                  {[
                    { sym: 'BTC', name: 'Bitcoin',  score: 92, rating: 'AAA', sc: '#4ade80', bc: 'rgba(52,211,153,0.08)', bb: 'rgba(52,211,153,0.2)' },
                    { sym: 'ETH', name: 'Ethereum', score: 88, rating: 'AA+', sc: '#4ade80', bc: 'rgba(52,211,153,0.08)', bb: 'rgba(52,211,153,0.2)' },
                    { sym: 'SOL', name: 'Solana',   score: 76, rating: 'AA',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',  bb: 'rgba(240,192,0,0.25)' },
                    { sym: 'XRP', name: 'Ripple',   score: 68, rating: 'A+',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',  bb: 'rgba(240,192,0,0.25)' },
                    { sym: 'BNB', name: 'BNB',      score: 81, rating: 'AA',  sc: '#F0C000', bc: 'rgba(240,192,0,0.08)',  bb: 'rgba(240,192,0,0.25)' },
                  ].map(t => (
                    <div key={t.sym} className="cd-table-row">
                      <div className="cd-token-left">
                        <span className="cd-token-sym">{t.sym}</span>
                        <span className="cd-token-name">{t.name}</span>
                      </div>
                      <div className="cd-token-right">
                        <span className="cd-token-score" style={{ color: t.sc }}>{t.score}</span>
                        <span className="cd-token-badge" style={{ color: t.sc, background: t.bc, border: `1px solid ${t.bb}` }}>{t.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="cd-footer">
          <span className="cd-footer-label">Trusted by</span>
          <div className="cd-footer-badges">
            {['Central Clearing Counterparties','Tier-1 Exchanges','Regulatory Bodies','Institutional Risk Desks','Digital Asset Protocols'].map(b => (
              <span key={b} className="cd-footer-badge">{b}</span>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
