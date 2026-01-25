import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link'; // Import Link for navigation

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invictus Sports',
  description: 'Fantasy Sports League Manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#020617] text-white overflow-x-hidden`}>
        
        {/* CONTAINER: Vertical on Mobile (Header top), Horizontal on Desktop (Sidebar left) */}
        <div className="flex min-h-screen flex-col md:flex-row relative">
          
          {/* --- MOBILE HEADER (Visible only on Mobile) --- */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#020617]/95 backdrop-blur-md sticky top-0 z-50">
            {/* Logo */}
            <div className="text-lg font-black italic tracking-tighter text-white uppercase select-none">
               INVICTUS<span className="text-[#22c55e]">SPORTS</span>
            </div>
            
            {/* Mobile Nav Links */}
            <nav className="flex gap-4 text-xs font-black uppercase tracking-widest text-slate-400">
               <Link href="/" className="hover:text-white transition-colors">Home</Link>
               <Link href="/hub" className="hover:text-white transition-colors">Hub</Link>
            </nav>
          </header>

          {/* --- DESKTOP SIDEBAR (Visible only on Desktop) --- */}
          <aside className="hidden md:block w-64 shrink-0 border-r border-slate-800 bg-[#020617] h-screen sticky top-0 overflow-y-auto z-40">
             <div className="p-8">
                <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-10 select-none">
                  INVICTUS<span className="text-[#22c55e]">SPORTS</span>
                </h1>
                
                {/* Desktop Nav Links */}
                <nav className="flex flex-col gap-6">
                  <Link href="/" className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-sm transition-colors flex items-center gap-3">
                    Home
                  </Link>
                  <Link href="/hub" className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-sm transition-colors flex items-center gap-3">
                    Hub
                  </Link>
                </nav>
             </div>
          </aside>

          {/* --- MAIN CONTENT --- */}
          <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}