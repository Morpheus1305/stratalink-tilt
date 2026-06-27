import React from "react";
import { Shield, BarChart3, Clock, ArrowRight, Activity } from "lucide-react";

export function PrecisionGrid() {
  return (
    <div 
      className="min-h-screen w-full flex flex-col font-sans text-slate-300 relative overflow-hidden"
      style={{ backgroundColor: "#080d14" }}
    >
      {/* Top Nav */}
      <nav className="w-full flex items-center justify-between px-8 py-6 border-b border-slate-800/50 z-10">
        <div className="flex items-center gap-3 tracking-wide">
          <span className="font-bold text-white tracking-widest text-sm">STRATALINK LABS</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-medium text-xs tracking-widest">INSTITUTIONAL LIQUIDITY TERMINAL</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-xs font-semibold text-slate-300 hover:text-white transition-colors uppercase tracking-wider">
            Documentation
          </button>
          <button className="text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded transition-colors uppercase tracking-wider border border-slate-700">
            Client Login
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto z-10">
        
        {/* Left Half: Brand Proposition */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0 border-r border-slate-800/50">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-mono font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              SYSTEM LIVE: v2.4.0
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              The world's first and only liquidity verification infrastructure for Institutional Digital Asset Markets.
            </h1>
            
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg">
              Empowering clearinghouses, exchanges, and risk managers with cryptographically verifiable liquidity intelligence.
            </p>

            <div className="flex flex-col gap-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-yellow-500 mt-1">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Cryptographically anchored DACT</h3>
                  <p className="text-sm text-slate-500">Immutable consolidated tape across all supported venues.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-500 mt-1">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">14-venue PoLi scoring</h3>
                  <p className="text-sm text-slate-500">Real-time Proof of Liquidity across centralized and decentralized markets.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-500 mt-1">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Sub-second regime detection</h3>
                  <p className="text-sm text-slate-500">Identify market stress and fragmentation before they cascade.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-8 py-4 rounded transition-colors flex items-center gap-2 text-sm tracking-wide">
                REQUEST ACCESS <ArrowRight size={16} />
              </button>
              <button className="bg-transparent hover:bg-slate-900 text-white font-semibold px-8 py-4 rounded border border-slate-700 transition-colors flex items-center gap-2 text-sm tracking-wide">
                VIEW METHODOLOGY
              </button>
            </div>
          </div>
        </div>

        {/* Right Half: Terminal Preview */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
          
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="w-full max-w-lg bg-[#0c121c] border border-slate-800 rounded-xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#080d14]">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-cyan-500" />
                <span className="text-xs font-mono text-slate-400">TILT // LIVE FEED</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Top Row: Gauge & Depth */}
              <div className="flex gap-6">
                
                {/* PoLi Gauge */}
                <div className="flex-1 bg-[#080d14] border border-slate-800 rounded p-4 flex flex-col items-center justify-center relative">
                  <span className="text-[10px] font-mono text-slate-500 uppercase absolute top-3 left-3">GLOBAL POLI</span>
                  
                  <div className="relative w-32 h-32 mt-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {/* Track */}
                      <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset="0" />
                      {/* Fill */}
                      <circle cx="50" cy="50" r="40" stroke="#eab308" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset="62.8" className="transition-all duration-1000" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-mono font-bold text-white">75</span>
                      <span className="text-[10px] font-mono text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-1">AA RATING</span>
                    </div>
                  </div>
                </div>

                {/* Depth Chart Mini */}
                <div className="flex-1 bg-[#080d14] border border-slate-800 rounded p-4 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">AGGREGATED DEPTH</span>
                    <span className="text-[10px] font-mono text-cyan-500">BTC/USD</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 justify-center">
                    {/* Asks */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,245.50</span>
                      <div className="h-1.5 bg-rose-500/80 rounded-r w-1/4"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,245.00</span>
                      <div className="h-1.5 bg-rose-500/80 rounded-r w-1/2"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,244.50</span>
                      <div className="h-1.5 bg-rose-500/80 rounded-r w-3/4"></div>
                    </div>
                    
                    {/* Spread */}
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-[10px] font-mono text-white font-bold w-12 text-right">98,244.00</span>
                      <span className="text-[9px] font-mono text-slate-600">0.50 SPREAD</span>
                    </div>

                    {/* Bids */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,243.50</span>
                      <div className="h-1.5 bg-emerald-500/80 rounded-r w-full"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,243.00</span>
                      <div className="h-1.5 bg-emerald-500/80 rounded-r w-2/3"></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 w-12 text-right">98,242.50</span>
                      <div className="h-1.5 bg-emerald-500/80 rounded-r w-1/3"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Row: Table */}
              <div className="bg-[#080d14] border border-slate-800 rounded flex flex-col">
                <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">ASSET COVERAGE</span>
                  <span className="text-[10px] font-mono text-slate-500">LIVE</span>
                </div>
                <div className="flex flex-col text-xs font-mono">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3"><span className="text-white font-bold w-8">BTC</span><span className="text-slate-500">Bitcoin</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400">92</span>
                      <span className="px-1.5 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded text-[9px]">AAA</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3"><span className="text-white font-bold w-8">ETH</span><span className="text-slate-500">Ethereum</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400">88</span>
                      <span className="px-1.5 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded text-[9px]">AA+</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3"><span className="text-white font-bold w-8">SOL</span><span className="text-slate-500">Solana</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-yellow-400">76</span>
                      <span className="px-1.5 py-0.5 bg-yellow-950/50 text-yellow-400 border border-yellow-900 rounded text-[9px]">AA</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3"><span className="text-white font-bold w-8">XRP</span><span className="text-slate-500">Ripple</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-yellow-400">68</span>
                      <span className="px-1.5 py-0.5 bg-yellow-950/50 text-yellow-400 border border-yellow-900 rounded text-[9px]">A+</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-800/30">
                    <div className="flex items-center gap-3"><span className="text-white font-bold w-8">DOGE</span><span className="text-slate-500">Dogecoin</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-orange-400">54</span>
                      <span className="px-1.5 py-0.5 bg-orange-950/50 text-orange-400 border border-orange-900 rounded text-[9px]">BBB</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Bottom Trusted By Bar */}
      <div className="w-full border-t border-slate-800/50 bg-[#060a10] py-4 px-8 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 opacity-60">
          <span className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase whitespace-nowrap">Trusted By</span>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-12 gap-y-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">
            <span>Central Clearing Counterparties</span>
            <span>Tier-1 Exchanges</span>
            <span>Regulatory Bodies</span>
            <span>Institutional Risk Desks</span>
            <span>Digital Asset Protocols</span>
          </div>
        </div>
      </div>
    </div>
  );
}
