'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase'; 

// --- INTERFACES ---
interface League {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  privacy: 'public' | 'private';
  members: string[]; 
  ownerId: string;
  password?: string;
  ownerName?: string;
  settings?: {
    ppr?: boolean;
    scoringType?: 'PPR' | 'Half-PPR' | 'Standard Scoring';
  };
}

interface CreateLeagueModalProps {
  onClose: () => void;
  user: User;
}

interface LeagueJoinModalProps {
  league: League;
  user: User;
  onClose: () => void;
}

// --- 1. CREATE LEAGUE MODAL ---
const CreateLeagueModal = ({ onClose, user }: CreateLeagueModalProps) => {
  const router = useRouter();
  const [leagueType, setLeagueType] = useState<'standard' | 'custom'>('standard'); 
  const [leagueName, setLeagueName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleContinue = async () => {
    if (!leagueName.trim()) return;
    if (isPrivate && !password.trim()) return; 

    setIsCreating(true);

    try {
      const ownerDisplayName = user.displayName || user.email?.split('@')[0] || 'Commissioner';

      const leagueRef = await addDoc(collection(db, "leagues"), {
        name: leagueName,
        type: leagueType,
        ownerId: user.uid,
        ownerName: ownerDisplayName, 
        privacy: isPrivate ? 'private' : 'public',
        password: isPrivate ? password : null, 
        createdAt: serverTimestamp(),
        members: [user.uid], 
        settings: { ppr: true, scoringType: 'PPR' },
      });

      const memberRef = doc(db, "leagues", leagueRef.id, "Members", user.uid);
      await setDoc(memberRef, {
        UserID: user.uid,
        username: ownerDisplayName,
        joinedAt: serverTimestamp(),
        "Wild Card Lineup": {},
        "Divisional Lineup": {},
        "Conference Lineup": {},
        "Super Bowl Lineup": {}
      });

      router.push(`/league/${leagueRef.id}`);
    } catch (error) {
      console.error("Error creating league: ", error);
      alert("Failed to create league.");
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-700">
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Create a New League</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">League Name</label>
            <input 
              type="text" 
              placeholder="e.g. The Sunday Showdown"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white placeholder-gray-600 font-bold"
            />
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="flex items-center space-x-3 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-5 text-green-500 bg-gray-900 border-gray-600 rounded focus:ring-green-500 accent-green-500"
              />
              <span className="font-black text-xs uppercase tracking-widest text-gray-300">Make this league Private?</span>
            </label>
            {isPrivate && (
              <div className="ml-8 mt-2">
                <input 
                  type="text" 
                  placeholder="Set a League Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded focus:ring-2 focus:ring-green-500 outline-none text-white font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Select Format:</h4>
            <div className="grid grid-cols-2 gap-6">
              <div 
                onClick={() => setLeagueType('standard')}
                className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${
                  leagueType === 'standard' 
                    ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <h5 className="font-black text-white uppercase tracking-tight">Standard</h5>
                <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Default scoring & rosters</p>
              </div>
              <div 
                className="cursor-not-allowed border-2 border-gray-700 bg-gray-800/50 rounded-xl p-6 opacity-60"
              >
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-gray-400 uppercase tracking-tight">Custom</h5>
                  <span className="text-[8px] font-black bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded uppercase">Soon</span>
                </div>
                 <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">Full control</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cancel</button>
          <button 
            onClick={handleContinue}
            className="px-6 py-2 bg-green-500 text-black rounded-lg font-black uppercase tracking-widest hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
          >
            {isCreating ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. JOIN LEAGUE MODAL ---
const LeagueJoinModal = ({ league, user, onClose }: LeagueJoinModalProps) => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  
  const displayOwner = league.ownerName || 'Commissioner';
  const isPrivate = league.privacy === 'private';

  const handleConfirmJoin = async () => {
    setIsJoining(true);
    setError('');

    try {
      if (isPrivate) {
        if (password.trim() !== league.password) {
          setError("Incorrect password.");
          setIsJoining(false);
          return;
        }
      }

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        members: arrayUnion(user.uid)
      });

      const memberRef = doc(db, "leagues", league.id, "Members", user.uid);
      await setDoc(memberRef, {
        UserID: user.uid,
        username: user.displayName || 'Member',
        joinedAt: serverTimestamp(),
        "Wild Card Lineup": {},
        "Divisional Lineup": {},
        "Conference Lineup": {},
        "Super Bowl Lineup": {}
      }, { merge: true });

      router.push(`/league/${league.id}`);

    } catch (err) {
      console.error("Error joining:", err);
      setError("Failed to join league.");
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-600">
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Join League</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{league.name}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Commissioner: <span className="text-white">{displayOwner}</span>
            </p>
          </div>

          {isPrivate && (
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                Private League
              </label>
              <input 
                type="password"
                placeholder="Enter League Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded focus:ring-2 focus:ring-green-500 outline-none text-white font-bold"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
        </div>

        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex flex-col gap-3">
          <button 
            onClick={handleConfirmJoin}
            disabled={isJoining || (isPrivate && !password)}
            className="w-full py-3 bg-green-500 text-black rounded-lg font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join League'}
          </button>
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. MAIN HUB PAGE COMPONENT ---
export default function HubPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningLeague, setJoiningLeague] = useState<League | null>(null);

  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [activeTab, setActiveTab] = useState<'my-leagues' | 'join'>('my-leagues');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchLeagues(currentUser.uid);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchLeagues = async (uid: string) => {
    try {
      const myLeaguesQuery = query(collection(db, "leagues"), where("members", "array-contains", uid));
      const mySnapshot = await getDocs(myLeaguesQuery);
      const myLeaguesData = mySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
      setMyLeagues(myLeaguesData);

      const publicQuery = query(collection(db, "leagues"), where("privacy", "==", "public"));
      const publicSnapshot = await getDocs(publicQuery);
      const allPublic = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
      
      setPublicLeagues(allPublic.filter(l => !l.members.includes(uid)));

    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-black uppercase tracking-[0.2em] text-xs">Loading Hub...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* HEADER REMOVED: Navigation handled by Global Navbar in layout.tsx */}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div className="flex space-x-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab('my-leagues')}
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'my-leagues' ? 'bg-gray-800 text-green-400 shadow-xl border border-gray-700' : 'text-gray-500 hover:text-white'
              }`}
            >
              My Leagues
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'join' ? 'bg-gray-800 text-green-400 shadow-xl border border-gray-700' : 'text-gray-500 hover:text-white'
              }`}
            >
              Find Leagues
            </button>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Create League</span>
          </button>
        </div>

        {activeTab === 'my-leagues' && (
          <div className="space-y-6">
            {myLeagues.length === 0 ? (
              <div className="text-center py-24 bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-800 flex flex-col items-center">
                <div className="text-gray-600 text-xs font-black uppercase tracking-widest mb-6">No active leagues found.</div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="text-green-500 hover:text-green-400 font-black uppercase tracking-widest text-[10px] border border-green-500/20 px-4 py-2 rounded-lg bg-green-500/5 transition-all"
                >
                  Initiate New League
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myLeagues.map(league => {
                  const scoringFormat = league.settings?.scoringType || (league.settings?.ppr ? 'PPR' : 'Standard Scoring');

                  return (
                    <Link href={`/league/${league.id}`} key={league.id} className="group">
                      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 group-hover:border-green-500/50 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.05)] transition-all duration-500 h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                        <div className="flex flex-wrap gap-2 mb-6">
                          <span className="px-2.5 py-1 text-[8px] font-black uppercase rounded tracking-[0.15em] bg-green-500/10 text-green-400 border border-green-500/20">
                            {scoringFormat}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight group-hover:text-green-400 transition-colors">{league.name}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">{league.members.length} Members Enrolled</p>
                        <div className="mt-auto pt-6 border-t border-gray-800 flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Access League Details →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'join' && (
          <div className="space-y-6">
             {publicLeagues.length === 0 ? (
               <div className="text-center py-24 text-gray-600 text-xs font-black uppercase tracking-widest">No recruitment campaigns active.</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {publicLeagues.map(league => {
                   const scoringFormat = league.settings?.scoringType || (league.settings?.ppr ? 'PPR' : 'Standard Scoring');

                   return (
                    <div key={league.id} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col shadow-lg">
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-2.5 py-1 text-[8px] font-black uppercase rounded tracking-[0.15em] bg-green-500/10 text-green-400 border border-green-500/20">
                          {scoringFormat}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{league.name}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">Commish: <span className="text-gray-300">{league.ownerName || 'Unknown'}</span></p>
                      <button 
                        onClick={() => setJoiningLeague(league)}
                        className="mt-auto w-full py-3 bg-gray-800 hover:bg-green-500 hover:text-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all border border-gray-700 active:scale-95"
                      >
                        Join League
                      </button>
                    </div>
                  );
                 })}
               </div>
             )}
          </div>
        )}
      </main>

      {showCreateModal && user && <CreateLeagueModal onClose={() => setShowCreateModal(false)} user={user} />}
      {joiningLeague && user && <LeagueJoinModal league={joiningLeague} user={user} onClose={() => setJoiningLeague(null)} />}
    </div>
  );
}