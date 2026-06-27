import React from "react";

export function TerminalDark() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0a0c10] text-[#8fa3b0]" style={{ fontFamily: "'Space Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        .grid-bg {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, #1a2030 1px, transparent 1px),
            linear-gradient(to bottom, #1a2030 1px, transparent 1px);
          opacity: 0.3;
        }

        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          background-color: #11141a;
          border-top: 1px solid #1a2030;
          white-space: nowrap;
          padding: 8px 0;
        }

        .ticker-move {
          display: inline-block;
          animation: ticker 30s linear infinite;
        }

        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .metric-tile {
          background: rgba(17, 20, 26, 0.6);
          border: 1px solid #1a2030;
          backdrop-filter: blur(4px);
        }

        .glitch-text {
          position: relative;
        }
        
        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>

      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Top Nav */}
      <header className="relative z-10 flex justify-between items-center p-4 border-b border-[#1a2030] bg-[#0a0c10]/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#F0C000]" />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ fontFamily: "'Inter', sans-serif" }}>STRATALINK<span className="text-[#F0C000]">LABS</span></h1>
        </div>
        <div className="text-sm tracking-widest text-[#00D4FF] flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00D4FF] pulse-dot" />
          INSTITUTIONAL LIQUIDITY TERMINAL
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Metrics */}
          <div className="hidden lg:flex flex-col gap-4 col-span-3">
            <div className="metric-tile p-4 flex flex-col gap-1">
              <span className="text-xs text-[#5c6e7a]">SYS.STATUS</span>
              <span className="text-sm text-[#00D4FF]">ONLINE // ACTIVE</span>
            </div>
            <div className="metric-tile p-4 flex flex-col gap-1 border-l-2 border-l-[#F0C000]">
              <span className="text-xs text-[#5c6e7a]">POLI_SCORE_AGGR</span>
              <span className="text-2xl text-white font-bold">94 <span className="text-sm text-[#F0C000]">/AAA</span></span>
            </div>
            <div className="metric-tile p-4 flex flex-col gap-1">
              <span className="text-xs text-[#5c6e7a]">CONNECTED_VENUES</span>
              <span className="text-xl text-white">14 <span className="text-xs text-[#5c6e7a]">NODES</span></span>
            </div>
          </div>

          {/* Center Hero */}
          <div className="col-span-1 lg:col-span-6 flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#11141a] border border-[#1a2030] text-xs text-[#00D4FF] mb-4">
              <span className="pulse-dot">●</span> SUB-SECOND REGIME DETECTION
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase leading-tight tracking-tighter" style={{ fontFamily: "'Inter', sans-serif" }}>
              The World's First <br/>
              <span className="text-[#F0C000] glitch-text">Liquidity Verification</span><br/>
              Infrastructure
            </h2>
            
            <p className="text-sm md:text-base text-[#8fa3b0] max-w-xl mx-auto leading-relaxed">
              Cryptographically anchored consolidated tape (DACT) for Institutional Digital Asset Markets. Trusted by top clearinghouses and regulators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button className="px-8 py-3 bg-[#F0C000] hover:bg-[#F0C000]/90 text-black font-bold tracking-wider text-sm transition-colors uppercase border border-[#F0C000]">
                Access Terminal
              </button>
              <button className="px-8 py-3 bg-transparent hover:bg-[#1a2030] text-white font-bold tracking-wider text-sm transition-colors uppercase border border-[#1a2030]">
                Request Demo
              </button>
            </div>
          </div>

          {/* Right Metrics */}
          <div className="hidden lg:flex flex-col gap-4 col-span-3">
            <div className="metric-tile p-4 flex flex-col gap-1 border-l-2 border-l-[#00D4FF]">
              <span className="text-xs text-[#5c6e7a]">DACT_INTEGRITY</span>
              <span className="text-xl text-[#00D4FF]">ANCHORED</span>
            </div>
            <div className="metric-tile p-4 flex flex-col gap-1">
              <span className="text-xs text-[#5c6e7a]">MARKET_REGIME</span>
              <span className="text-xl text-[#F0C000]">NORMAL</span>
            </div>
            <div className="metric-tile p-4 flex flex-col gap-1">
              <span className="text-xs text-[#5c6e7a]">DEPTH_COVERAGE</span>
              <span className="text-xl text-white">$4.2B</span>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Ticker */}
      <div className="relative z-10">
        <div className="ticker-wrap text-xs font-bold text-[#5c6e7a]">
          <div className="ticker-move">
            <span className="mx-4"><span className="text-white">BTC/USD</span> <span className="text-[#00D4FF]">AAA (98)</span> •</span>
            <span className="mx-4"><span className="text-white">ETH/USD</span> <span className="text-[#00D4FF]">AAA (96)</span> •</span>
            <span className="mx-4"><span className="text-white">SOL/USD</span> <span className="text-[#F0C000]">AA (89)</span> •</span>
            <span className="mx-4"><span className="text-white">XRP/USD</span> <span className="text-[#F0C000]">AA (85)</span> •</span>
            <span className="mx-4"><span className="text-white">ADA/USD</span> <span className="text-white">A (78)</span> •</span>
            <span className="mx-4"><span className="text-white">AVAX/USD</span> <span className="text-white">A (76)</span> •</span>
            <span className="mx-4"><span className="text-white">LINK/USD</span> <span className="text-white">A (74)</span> •</span>
            <span className="mx-4"><span className="text-white">DOT/USD</span> <span className="text-[#00D4FF]">AA (82)</span> •</span>
            <span className="mx-4"><span className="text-white">BTC/USD</span> <span className="text-[#00D4FF]">AAA (98)</span> •</span>
            <span className="mx-4"><span className="text-white">ETH/USD</span> <span className="text-[#00D4FF]">AAA (96)</span> •</span>
            <span className="mx-4"><span className="text-white">SOL/USD</span> <span className="text-[#F0C000]">AA (89)</span> •</span>
            <span className="mx-4"><span className="text-white">XRP/USD</span> <span className="text-[#F0C000]">AA (85)</span> •</span>
            <span className="mx-4"><span className="text-white">ADA/USD</span> <span className="text-white">A (78)</span> •</span>
            <span className="mx-4"><span className="text-white">AVAX/USD</span> <span className="text-white">A (76)</span> •</span>
            <span className="mx-4"><span className="text-white">LINK/USD</span> <span className="text-white">A (74)</span> •</span>
            <span className="mx-4"><span className="text-white">DOT/USD</span> <span className="text-[#00D4FF]">AA (82)</span> •</span>
          </div>
        </div>
      </div>

    </div>
  );
}
