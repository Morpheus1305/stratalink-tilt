import React from 'react';

export function CinematicDeep() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        
        .font-serif {
          font-family: 'Cormorant Garamond', serif;
        }
        .font-sans {
          font-family: 'Inter', sans-serif;
        }
      `}} />
      <div className="relative min-h-[100dvh] w-full bg-[#030610] text-slate-100 flex flex-col font-sans overflow-hidden">
        {/* Background Image & Gradient Wash */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/cinematic-ocean-bg.png" 
            alt="Deep ocean flow" 
            className="w-full h-full object-cover opacity-50 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030610]/90 via-[#030610]/60 to-[#030610]/95 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#030610] via-[#030610]/80 to-[#030610]/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen w-full">
          {/* Nav / Header */}
          <header className="w-full px-8 md:px-12 py-8 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
            <div className="text-sm font-semibold tracking-[0.25em] uppercase text-white/90">
              StrataLink
            </div>
            <nav className="hidden md:flex gap-10 text-[11px] font-medium tracking-[0.15em] uppercase text-white/50">
              <a href="#" className="hover:text-white transition-colors duration-300">Terminal</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Methodology</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Regulators</a>
            </nav>
          </header>

          {/* Main Hero */}
          <main className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
            <div className="max-w-5xl">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-16 h-[1px] bg-[#4f7cf6]/50"></div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#86a8ff]/70 font-semibold">
                  Institutional Digital Asset Markets
                </p>
              </div>

              <h1 className="font-serif text-6xl md:text-8xl lg:text-[11rem] leading-[0.85] tracking-tighter mb-8 text-white drop-shadow-2xl">
                <span className="block text-white/60 italic font-light text-3xl md:text-5xl lg:text-7xl mb-4 tracking-normal drop-shadow-none">The standard for</span>
                VERIFICATION
              </h1>

              <p className="text-base md:text-xl text-white/60 max-w-2xl font-light leading-relaxed mb-16 border-l border-white/10 pl-8 tracking-wide">
                The world's first and only liquidity verification infrastructure. Sub-second regime detection. Cryptographically anchored consolidated tape (DACT).
              </p>

              <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                <button className="px-10 py-5 bg-white text-[#030610] text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-slate-200 transition-colors duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  Enter Terminal
                </button>
                <button className="px-8 py-5 text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors duration-300 relative group">
                  <span className="relative z-10">Learn More</span>
                  <span className="absolute bottom-4 left-8 right-8 h-[1px] bg-white/20 group-hover:bg-white transition-colors duration-300"></span>
                </button>
              </div>
            </div>

            {/* Accent Data Points */}
            <div className="absolute right-12 md:right-24 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-20">
              <div className="text-right border-r border-white/10 pr-6">
                <div className="font-serif text-6xl text-white mb-3">14</div>
                <div className="text-[10px] tracking-[0.3em] text-[#86a8ff]/60 uppercase font-semibold">Venues Analyzed</div>
              </div>
              <div className="text-right border-r border-white/10 pr-6">
                <div className="font-serif text-6xl text-white mb-3 italic">PoLi™</div>
                <div className="text-[10px] tracking-[0.3em] text-[#86a8ff]/60 uppercase font-semibold max-w-[140px] ml-auto">Institutional Quality Standard</div>
              </div>
            </div>
          </main>

          {/* Footer Strip */}
          <footer className="w-full px-8 md:px-12 py-6 border-t border-white/5 bg-gradient-to-t from-[#010206] to-transparent">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Trusted by clearinghouses, regulators, and institutional desks worldwide.
              </p>
              <div className="flex gap-8 opacity-20 filter grayscale mix-blend-screen items-center">
                {/* Fake logos using text for mockup */}
                <span className="text-xs font-serif italic tracking-widest">Bank of Int. Settlements</span>
                <span className="text-[10px] font-bold tracking-[0.2em]">CME GROUP</span>
                <span className="text-xs font-medium tracking-tight">LCH</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
