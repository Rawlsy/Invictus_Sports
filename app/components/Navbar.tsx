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
  const [loading, setLoading] = useState(true); // Added loading state to prevent flickering
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch username if available
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
            setUsername(userDoc.data().username);
            }
        } catch (e) {
            console.log("Error fetching user details", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Prevent hydration mismatch or white screen by returning a simple placeholder while loading
  if (loading) return <div className="h-20 bg-gray-900 border-b border-gray-800"></div>;
  
  if (!user) return null;

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 px-4 md:px-6 shadow-2xl w-full overflow-hidden">
      {/* Subtle Green Top Accent */}
      <div className="h-[2px] w-full bg-green-500/50 absolute top-0 left-0" />

      <div className="max-w-7xl mx-auto flex justify-between items-center h-16 md:h-20">
        
        {/* LEFT: Navigation Links */}
        <nav className="flex items-center space-x-4 md:space-x-8 flex-1">
          <Link 
            href="/" 
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
              pathname === '/' ? 'text-green-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Home size={18} className={`md:w-3.5 md:h-3.5 ${pathname === '/' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} /> 
            {/* Hidden text on mobile */}
            <span className="hidden md:inline">Home</span>
          </Link>
          <Link 
            href="/hub" 
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
              pathname === '/hub' ? 'text-green-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} className={`md:w-3.5 md:h-3.5 ${pathname === '/hub' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} /> 
            {/* Hidden text on mobile */}
            <span className="hidden md:inline">Hub</span>
          </Link>
        </nav>

        {/* CENTER: The Logo */}
        <div className="flex-shrink-0 px-2 transition-transform duration-300 hover:scale-105">
          <Link href="/" className="group">
            <svg 
              viewBox="0 0 320 80" 
              // Adjusted height: h-8 on mobile, h-12 on desktop
              className="h-8 md:h-12 w-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]"
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
        <div className="flex items-center justify-end space-x-2 md:space-x-6 flex-1">
          
          {/* User Details: Hidden on mobile */}
          <div className="text-right hidden md:block border-r border-gray-800 pr-6">
            <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.1em] leading-none mb-1">Authenticated As</p>
            <p className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-[150px]">
              {username || user.email?.split('@')[0]}
            </p>
          </div>
          
          {/* Sign Out Button: Condensed on mobile */}
          <button 
            onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="group flex items-center justify-center space-x-0 md:space-x-2 p-2 md:px-5 md:py-2.5 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-lg"
          >
            <LogOut size={16} className="md:w-3.5 md:h-3.5 group-hover:-translate-x-1 transition-transform" />
            {/* Hidden text on mobile */}
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>

      </div>
    </header>
  );
}