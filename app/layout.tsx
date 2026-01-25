import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

// If you have a Sidebar component, import it here. 
// If you are coding it inline, see the 'aside' tag below.
// import Sidebar from '@/components/Sidebar'; 

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
        <div className="flex min-h-screen relative">
          
          {/* --- SIDEBAR FIX --- 
              1. 'hidden': Hides it by default (Mobile)
              2. 'md:block': Shows it only on medium screens and up (Desktop)
              3. 'fixed' or 'sticky': Keeps it in place
          */}
          <aside className="hidden md:block w-64 shrink-0 border-r border-slate-800 bg-[#020617] h-screen sticky top-0 overflow-y-auto z-40">
            {/* YOUR SIDEBAR CONTENT GOES HERE.
               If you have a <Sidebar /> component, wrap it in this aside tag 
               or add the className="hidden md:block..." directly to your component.
            */}
             <div className="p-6">
                <h1 className="text-xl font-black italic tracking-tighter text-white uppercase mb-6">
                  INVICTUS<span className="text-[#22c55e]">SPORTS</span>
                </h1>
                {/* Add your nav links here if they aren't already */}
             </div>
          </aside>

          {/* --- MAIN CONTENT --- 
              1. 'flex-1': Takes up remaining space
              2. 'w-full': Ensures it doesn't shrink weirdly
              3. 'max-w-[100vw]': Prevents horizontal scroll blowout
          */}
          <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}