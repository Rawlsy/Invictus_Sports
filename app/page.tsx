import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* --- NAV HEADER --- */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-2xl font-black tracking-tighter text-yellow-400">
          INVICTUS<span className="text-white">.SPORTS</span>
        </div>
        <nav className="flex gap-4">
          <Link 
            href="/login" 
            className="px-5 py-2 text-sm font-bold bg-white text-slate-900 rounded-full hover:bg-yellow-400 transition-colors"
          >
            Log In
          </Link>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-block px-3 py-1 mb-6 border border-yellow-400/30 rounded-full bg-yellow-400/10 text-yellow-300 text-xs font-bold uppercase tracking-widest">
          The New Standard
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
          Fantasy Sports. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
            Unleashed.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Experience the next generation of league management. Real-time stats, 
          deep dynasty customization, and zero ad-clutter for your league mates.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login" 
            className="px-8 py-4 bg-yellow-400 text-black font-bold text-lg rounded-xl hover:bg-yellow-300 hover:scale-105 transition-all shadow-lg shadow-yellow-400/20"
          >
            Start Your Dynasty
          </Link>
          <a 
            href="#features" 
            className="px-8 py-4 bg-slate-800 text-white font-bold text-lg rounded-xl hover:bg-slate-700 transition-all border border-slate-700"
          >
            View Features
          </a>
        </div>
      </section>

      {/* --- FEATURE GRID (SEO RICH) --- */}
      <section id="features" className="bg-slate-950 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the Commish</h2>
            <p className="text-slate-400">Everything you need to run a professional league.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-6 text-2xl">⚡</div>
              <h3 className="text-xl font-bold mb-3">Instant Scoring</h3>
              <p className="text-slate-400 leading-relaxed">
                Powered by Tank01 APIs, our scoring updates happen in milliseconds. 
                Never hit refresh and wonder if your player scored.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-6 text-2xl">🛡️</div>
              <h3 className="text-xl font-bold mb-3">Dynasty Focus</h3>
              <p className="text-slate-400 leading-relaxed">
                Built for the long haul. Trade draft picks up to 3 years out, 
                manage taxi squads, and track historical contracts effortlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-6 text-2xl">💰</div>
              <h3 className="text-xl font-bold mb-3">Prop Bets & Lines</h3>
              <p className="text-slate-400 leading-relaxed">
                Integrated betting lines and player props right in your dashboard. 
                See the spread before you set your lineup.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- BLOG / CONTENT SECTION (CRITICAL FOR ADSENSE) --- */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-10 border-l-4 border-yellow-400 pl-4">Latest Analysis</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mock Article 1 */}
          <article className="group cursor-pointer">
            <div className="h-48 bg-slate-800 rounded-xl mb-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-slate-700 group-hover:bg-slate-600 transition-colors flex items-center justify-center text-slate-500 font-bold">
                [Image: Week 19 QB Rankings]
              </div>
            </div>
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Strategy</span>
            <h3 className="text-xl font-bold mt-2 group-hover:text-yellow-400 transition-colors">
              Wildcard Weekend: The QB Dilemma
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              Why trusting the rookie quarterbacks this weekend might be the edge you need in DFS tournaments.
            </p>
          </article>

          {/* Mock Article 2 */}
          <article className="group cursor-pointer">
            <div className="h-48 bg-slate-800 rounded-xl mb-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-slate-700 group-hover:bg-slate-600 transition-colors flex items-center justify-center text-slate-500 font-bold">
                [Image: Sleepers]
              </div>
            </div>
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Sleepers</span>
            <h3 className="text-xl font-bold mt-2 group-hover:text-yellow-400 transition-colors">
              Hidden Gems in the AFC South
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              Three wide receivers rostered in less than 5% of leagues that could break out in 2026.
            </p>
          </article>

           {/* Placeholder Ad Block */}
           <div className="h-full min-h-[300px] bg-slate-800/50 border border-dashed border-slate-700 rounded-xl flex items-center justify-center flex-col text-center p-6">
              <span className="text-slate-500 font-mono text-sm mb-2">Advertisement</span>
              <p className="text-slate-600 text-sm">
                (Google AdSense Space <br/> 300x250)
              </p>
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 py-12 text-center text-slate-500 text-sm">
        <p>&copy; 2026 Invictus Sports. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href="/login" className="hover:text-white">Login</Link>
          <span className="hover:text-white cursor-pointer">Privacy Policy</span>
          <span className="hover:text-white cursor-pointer">Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}