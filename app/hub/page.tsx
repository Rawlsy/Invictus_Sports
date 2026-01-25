'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Trophy, ChevronRight, X, Loader2, Lock } from 'lucide-react'; // Added Lock icon

export default function Hub() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // --- MODAL STATE ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [scoringType, setScoringType] = useState('PPR');
  const [privacy, setPrivacy] = useState('Private');
  const [password, setPassword] = useState(''); // NEW: Password State
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      
      try {
        const q = query(
          collection(db, 'leagues'), 
          where('memberIDs', 'array-contains', u.uid)
        ); 
        
        const snap = await getDocs(q);
        const userLeagues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLeagues(userLeagues);

      } catch (error) {
        console.error("Error fetching leagues:", error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    // NEW: Validation checks for name and password if private
    if (!newLeagueName.trim() || !user) return;
    if (privacy === 'Private' && !password.trim()) return;

    setCreating(true);
    try {
        // 1. Create the League Document
        const leagueRef = await addDoc(collection(db, 'leagues'), {
            name: newLeagueName,
            scoringType: scoringType,
            privacy: privacy,
            password: privacy === 'Private' ? password : null, // NEW: Save Password
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            memberIDs: [user.uid], 
            memberCount: 1
        });

        // 2. Add Creator to the 'Members' subcollection
        await setDoc(doc(db, 'leagues', leagueRef.id, 'Members', user.uid), {
            username: user.displayName || 'Commissioner',
            joinedAt: new Date().toISOString(),
            scores: { "Total": 0.0 }
        });

        // 3. Update UI locally
        const newLeague = {
            id: leagueRef.id,
            name: newLeagueName,
            scoringType,
            memberCount: 1
        };
        setLeagues([...leagues, newLeague]);
        
        // 4. Close Modal & Reset
        setShowCreateModal(false);
        setNewLeagueName('');
        setPassword(''); // Reset password
        setCreating(false);

    } catch (error) {
        console.error("Error creating league:", error);
        setCreating(false);
    }
  };

  // Helper to check if form is valid
  const isFormValid = newLeagueName.trim().length > 0 && (privacy === 'Public' || password.trim().length > 0);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-20 relative">
      
      {/* Top Bar */}
      <header className="px-6 py-6 flex justify-between items-center max-w-5xl mx-auto">
        <h1 className="text-xl font-black italic tracking-tighter uppercase"><span className="text-[#22c55e]">HUB</span></h1>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Welcome Back, <br /> <span className="text-slate-500">{user?.displayName || 'Coach'}</span></h2>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Leagues</span>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#22c55e] text-[#020617] px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#16a34a] transition-all"
          >
            <Plus size={14} /> Create League
          </button>
        </div>

        {/* League Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-xs font-bold uppercase animate-pulse">Loading Hub...</div>
        ) : leagues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leagues.map((league) => (
              <Link href={`/league/${league.id}`} key={league.id} className="group relative bg-slate-900/60 border border-slate-800 hover:border-[#22c55e]/50 p-6 rounded-2xl transition-all hover:bg-slate-900">
                <div className="absolute top-6 right-6 text-slate-600 group-hover:text-[#22c55e] transition-colors">
                  <ChevronRight size={20} />
                </div>
                <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 mb-4 group-hover:border-[#22c55e]/30">
                  <Trophy size={20} className="text-slate-400 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#22c55e] transition-colors">{league.name}</h3>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>{league.scoringType || 'PPR'}</span>
                  <span>•</span>
                  <span>{league.memberCount || 0} Members</span>
                </div>
              </Link>
            ))}
            
            <button 
                onClick={() => setShowCreateModal(true)}
                className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-white hover:border-slate-600 transition-all min-h-[160px]"
            >
              <Plus size={24} />
              <span className="text-xs font-bold uppercase tracking-widest">Create New League</span>
            </button>
          </div>
        ) : (
            <div className="border border-slate-800 bg-slate-900/50 rounded-2xl p-8 text-center">
                <p className="text-slate-400 mb-4">You haven't joined any leagues yet.</p>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#22c55e] text-[#020617] px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#16a34a] transition-all"
                >
                    Create Your First League
                </button>
            </div>
        )}
      </main>

      {/* --- CREATE LEAGUE MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#020617]/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                
                <button 
                    onClick={() => setShowCreateModal(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6">Create New League</h3>
                
                <form onSubmit={handleCreateLeague} className="space-y-4">
                    
                    {/* League Name */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">League Name</label>
                        <input 
                            type="text" 
                            value={newLeagueName}
                            onChange={(e) => setNewLeagueName(e.target.value)}
                            placeholder="e.g. Invictus Championship 2026"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors font-bold"
                            autoFocus
                        />
                    </div>

                    {/* Scoring Type */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Scoring Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['PPR', 'Half-PPR', 'Standard'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setScoringType(type)}
                                    className={`px-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                        scoringType === type 
                                        ? 'bg-[#22c55e] text-[#020617] border-[#22c55e]' 
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Privacy */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Privacy</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Private', 'Public'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPrivacy(p)}
                                    className={`px-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                        privacy === p 
                                        ? 'bg-white text-[#020617] border-white' 
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* NEW: Password Field (Only if Private) */}
                    {privacy === 'Private' && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-2 flex items-center gap-1">
                                <Lock size={10} /> Set League Password *
                            </label>
                            <input 
                                type="text" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="e.g. Touchdown2026"
                                className="w-full bg-slate-950 border border-[#22c55e]/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors font-bold"
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={creating || !isFormValid}
                        className="w-full bg-[#22c55e] text-[#020617] font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#16a34a] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : 'Launch League'}
                    </button>

                </form>
            </div>
        </div>
      )}

    </div>
  );
}