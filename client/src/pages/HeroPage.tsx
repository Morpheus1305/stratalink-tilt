import { useLocation } from 'wouter';

export default function HeroPage() {
  const [, setLocation] = useLocation();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

        .hp-root {
          font-family: 'Inter', sans-serif;
          background: #03060f;
          color: #e2e8f0;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .hp-serif { font-family: 'Cormorant Garamond', serif; }

        .hp-bg { position: absolute; inset: 0; z-index: 0; }
        .hp-bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.35; mix-blend-mode: luminosity; }
        .hp-bg-wash {
          position: absolute; inset: 0;
          background:
            linear-gradient(to right, #03060f 42%, rgba(3,6,15,0.6) 68%, rgba(3,6,15,0.13) 100%),
            linear-gradient(to bottom, rgba(3,6,15,0.87) 0%, transparent 28%, rgba(3,6,15,0.8) 80%, #03060f 100%);
        }

        .hp-nav {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .hp-nav-brand { display: flex; align-items: center; gap: 0.75rem; }
        .hp-nav-wordmark { font-weight: 700; font-size: 0.75rem; letter-spacing: 0.25em; text-transform: uppercase; color: #fff; }
        .hp-nav-pipe { color: rgba(255,255,255,0.2); }
        .hp-nav-subtitle { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.38); font-weight: 500; }
        .hp-nav-actions { display: flex; align-items: center; gap: 1.5rem; }
        .hp-nav-link { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.38); text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; }
        .hp-nav-btn { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 1.25rem; background: rgba(255,255,255,0.04); cursor: pointer; font-family: 'Inter', sans-serif; }
        .hp-nav-btn:hover { background: rgba(255,255,255,0.08); }

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
        .hp-right-glow { position: absolute; top: 50%; left: 30%; transform: translate(-50%, -50%); width: 60%; height: 60%; background: radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%); pointer-events: none; }

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

        .hp-footer { position: relative; z-index: 10; border-top: 1px solid rgba(255,255,255,0.05); padding: 1rem 3rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; background: linear-gradient(to top, rgba(3,6,15,0.9), transparent); }
        .hp-footer-label { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.2); white-space: nowrap; }
        .hp-footer-badges { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
        .hp-footer-badge { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.18); }
      ` }} />

      <div className="hp-root">
        {/* Background */}
        <div className="hp-bg">
          <img src="/images/cinematic-ocean-bg.png" alt="" />
          <div className="hp-bg-wash" />
        </div>

        {/* Nav */}
        <nav className="hp-nav">
          <div className="hp-nav-brand">
            <span className="hp-nav-wordmark">StrataLink Labs</span>
            <span className="hp-nav-pipe">|</span>
            <span className="hp-nav-subtitle">Institutional Liquidity Terminal</span>
          </div>
          <div className="hp-nav-actions">
            <button className="hp-nav-link" onClick={() => setLocation('/login')}>Methodology</button>
            <button className="hp-nav-link" onClick={() => setLocation('/login')}>Regulators</button>
            <button className="hp-nav-btn" onClick={() => setLocation('/login')}>Client Login</button>
          </div>
        </nav>

        {/* Split layout */}
        <main className="hp-main">

          {/* LEFT — proposition */}
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
                onClick={() => setLocation('/login')}
              >
                View Methodology
              </button>
            </div>
          </div>

          {/* RIGHT — live terminal preview */}
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
                  {/* PoLi Gauge */}
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

                  {/* Aggregated Depth */}
                  <div className="hp-depth-card">
                    <div className="hp-card-label">Aggregated Depth</div>
                    <div className="hp-depth-rows">
                      {[['98,246','30%','ask'],['98,245','55%','ask'],['98,244','78%','ask']].map(([p,w]) => (
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

                {/* Token table */}
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

        {/* Footer */}
        <footer className="hp-footer">
          <span className="hp-footer-label">Trusted by</span>
          <div className="hp-footer-badges">
            {['Central Clearing Counterparties', 'Tier-1 Exchanges', 'Regulatory Bodies', 'Institutional Risk Desks', 'Digital Asset Protocols'].map(b => (
              <span key={b} className="hp-footer-badge">{b}</span>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
