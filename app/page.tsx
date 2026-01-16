import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-green-400 selection:text-black">
      
      {/* --- NAV HEADER --- */}
      <header className="max-w-7xl mx-auto px-12 py-24 relative flex items-center justify-end">
        
        {/* Centered Logo (Stacked: Invictus over Sports) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center leading-none select-none">
          <span className="text-5xl md:text-5xl font-black tracking-tighter text-green-400">INVICTUS</span>
          <span className="text-lg md:text-3xl font-bold tracking-[0.2em] text-white mt-1 md:mt-0">SPORTS</span>
        </div>

        {/* Right Aligned Nav */}
        <nav className="relative z-10">
          <Link 
            href="/login" 
            className="px-6 py-2.5 text-sm font-bold bg-white text-gray-900 rounded-full hover:bg-green-400 hover:text-black transition-colors shadow-lg"
          >
            Log In
          </Link>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="px-6 py-6 text-center max-w-4xl mx-auto">
        <div className="inline-block px-3 py-1 mb-6 border border-green-400/30 rounded-full bg-green-400/10 text-green-300 text-xs font-bold uppercase tracking-widest">
          The New Standard
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
          Fantasy Sports. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-200">
            Unleashed.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Experience the next generation of league management. Real-time stats, 
          deep dynasty customization putting the power in the players. Play how you want to play.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/league/test_league_1" 
            className="px-8 py-4 bg-green-500 text-black font-bold text-lg rounded-xl hover:bg-green-400 hover:scale-105 transition-all shadow-lg shadow-green-400/20"
          >
            Start Your Dynasty
          </Link>
          <a 
            href="#features" 
            className="px-8 py-4 bg-gray-800 text-white font-bold text-lg rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
          >
            View Features
          </a>
        </div>
      </section>

      {/* --- FEATURE GRID (SEO RICH) --- */}
      <section id="features" className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for the Commish</h2>
            <p className="text-gray-400">Everything you need to run a professional league.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-gray-900 rounded-2xl border border-gray-800 hover:border-green-400/50 transition-colors">
              <div className="w-12 h-12 bg-green-400/10 text-green-400 rounded-lg flex items-center justify-center mb-6 text-2xl">⚡</div>
              <h3 className="text-xl font-bold mb-3">Daily Scoring</h3>
              <p className="text-gray-400 leading-relaxed">
                Powered by Tank01 APIs Daily.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-gray-900 rounded-2xl border border-gray-800 hover:border-green-400/50 transition-colors">
              <div className="w-12 h-12 bg-green-400/10 text-green-400 rounded-lg flex items-center justify-center mb-6 text-2xl">🛡️</div>
              <h3 className="text-xl font-bold mb-3">Dynasty Focus</h3>
              <p className="text-gray-400 leading-relaxed">
                Built for the long haul. Our goal is to change the way we play fantasy sports introducing new ways to compete.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-gray-900 rounded-2xl border border-gray-800 hover:border-green-400/50 transition-colors">
              <div className="w-12 h-12 bg-green-400/10 text-green-400 rounded-lg flex items-center justify-center mb-6 text-2xl">💰</div>
              <h3 className="text-xl font-bold mb-3">Prop Bets & Lines</h3>
              <p className="text-gray-400 leading-relaxed">
                Integrated betting lines and player props right in your dashboard. 
                Coming Soon...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- BLOG / CONTENT SECTION --- */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-10 border-l-4 border-green-400 pl-4">Latest Analysis</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mock Article 1 */}
          <article className="group cursor-pointer">
            <div className="h-48 bg-gray-800 rounded-xl mb-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gray-700 group-hover:bg-gray-600 transition-colors flex items-center justify-center text-gray-500 font-bold">
                [Image: Week 19 QB Rankings]
              </div>
            </div>
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Strategy</span>
            <h3 className="text-xl font-bold mt-2 group-hover:text-green-400 transition-colors">
              Wildcard Weekend: The QB Dilemma
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Why trusting the rookie quarterbacks this weekend might be the edge you need in DFS tournaments.
            </p>
          </article>

          {/* Mock Article 2 */}
          <article className="group cursor-pointer">
            <div className="h-48 bg-gray-800 rounded-xl mb-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gray-700 group-hover:bg-gray-600 transition-colors flex items-center justify-center text-gray-500 font-bold">
                [Image: Sleepers]
              </div>
            </div>
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Sleepers</span>
            <h3 className="text-xl font-bold mt-2 group-hover:text-green-400 transition-colors">
              Hidden Gems in the AFC South
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Three wide receivers rostered in less than 5% of leagues that could break out in 2026.
            </p>
          </article>

           {/* Placeholder Ad Block */}
           <div className="h-full min-h-[300px] bg-gray-800/50 border border-dashed border-gray-700 rounded-xl flex items-center justify-center flex-col text-center p-6">
              <span className="text-gray-500 font-mono text-sm mb-2">Advertisement</span>
              <p className="text-gray-600 text-sm">
                (Google AdSense Space <br/> 300x250)
              </p>
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-gray-800 py-12 text-center text-gray-500 text-sm">
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