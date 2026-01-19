'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Home, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const [username, setUsername] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) return null;

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 px-6 shadow-2xl">
      {/* Subtle Green Top Accent */}
      <div className="h-[2px] w-full bg-green-500/50 absolute top-0 left-0" />

      <div className="max-w-7xl mx-auto flex justify-between items-center h-20">
        
        {/* LEFT: Navigation Links */}
        <nav className="flex items-center space-x-8 flex-1">
          <Link 
            href="/" 
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
              pathname === '/' ? 'text-green-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Home size={14} className={pathname === '/' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} /> 
            <span>Home</span>
          </Link>
          <Link 
            href="/hub" 
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
              pathname === '/hub' ? 'text-green-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} className={pathname === '/hub' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} /> 
            <span>Hub</span>
          </Link>
        </nav>

        {/* CENTER: The Logo (Moved Down) */}
        <div className="flex-shrink-0 px-4 transition-transform duration-300 hover:scale-105">
          <Link href="/" className="group">
            <svg 
              viewBox="0 0 320 80" 
              className="h-12 w-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 10L40 70L70 10" stroke="#22c55e" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M25 10L40 40L55 10" stroke="white" strokeWidth="4" fill="none" className="opacity-40" />
              <text x="85" y="48" fill="white" style={{ font: 'italic 900 42px sans-serif', letterSpacing: '-1px' }}>INVICTUS</text>
              <text x="85" y="68" fill="#22c55e" style={{ font: 'bold 12px sans-serif', letterSpacing: '8px' }}>SPORTS</text>
            </svg>
          </Link>
        </div>

        {/* RIGHT: User Info & Logout */}
        <div className="flex items-center justify-end space-x-6 flex-1">
          <div className="text-right hidden sm:block border-r border-gray-800 pr-6">
            <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.1em] leading-none mb-1">Authenticated As</p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">
              {username || user.email?.split('@')[0]}
            </p>
          </div>
          
          <button 
            onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="group flex items-center space-x-2 px-5 py-2.5 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-lg"
          >
            <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </header>
  );
}