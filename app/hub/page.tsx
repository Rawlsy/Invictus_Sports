'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  getDoc, 
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase'; 

// --- 1. CREATE LEAGUE MODAL ---
interface CreateLeagueModalProps {
  onClose: () => void;
  user: User;
}

const CreateLeagueModal = ({ onClose, user }: CreateLeagueModalProps) => {
  const router = useRouter();
  const [leagueType, setLeagueType] = useState<'standard' | 'custom' | null>('standard'); 
  const [leagueName, setLeagueName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleContinue = async () => {
    if (!leagueType || !leagueName.trim()) return;
    if (isPrivate && !password.trim()) return; 

    setIsCreating(true);

    try {
      const ownerDisplayName = user.displayName || user.email?.split('@')[0] || 'Commissioner';

      const docRef = await addDoc(collection(db, "leagues"), {
        name: leagueName,
        type: leagueType,
        ownerId: user.uid,
        ownerName: ownerDisplayName, 
        privacy: isPrivate ? 'private' : 'public',
        password: isPrivate ? password : null, 
        createdAt: serverTimestamp(),
        members: [user.uid], 
        settings: leagueType === 'standard' ? { ppr: true, teams: 10 } : {},
      });

      router.push(`/league/${docRef.id}`);
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
          <h3 className="text-xl font-bold text-white">Create a New League</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">League Name</label>
            <input 
              type="text" 
              placeholder="e.g. The Sunday Showdown"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white placeholder-gray-600"
            />
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="flex items-center space-x-3 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-5 text-green-500 bg-gray-900 border-gray-600 rounded focus:ring-green-500 focus:ring-offset-gray-900 accent-green-500"
              />
              <span className="font-bold text-gray-300">Make this league Private?</span>
            </label>
            {isPrivate && (
              <div className="ml-8 mt-2">
                <input 
                  type="text" 
                  placeholder="Set a League Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded focus:ring-2 focus:ring-green-500 outline-none text-white"
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="text-gray-400 mb-4 font-medium">Select Format:</h4>
            <div className="grid grid-cols-2 gap-6">
              {/* STANDARD OPTION */}
              <div 
                onClick={() => setLeagueType('standard')}
                className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${
                  leagueType === 'standard' 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <h5 className="font-bold text-white">Standard</h5>
                <p className="text-xs text-gray-500 mt-1">Default scoring & rosters</p>
              </div>

              {/* CUSTOM OPTION (DISABLED) */}
              <div 
                className="cursor-not-allowed border-2 border-gray-700 bg-gray-800/50 rounded-xl p-6 opacity-60"
              >
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-gray-400">Custom</h5>
                  <span className="text-[10px] font-bold bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">SOON</span>
                </div>
                 <p className="text-xs text-gray-500 mt-1">Full control</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-colors">Cancel</button>
          <button 
            onClick={handleContinue}
            className="px-6 py-2 bg-green-500 text-black rounded-lg font-bold hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
          >
            {isCreating ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. LEAGUE PREVIEW / JOIN MODAL ---
interface LeagueJoinModalProps {
  league: any;
  user: User;
  onClose: () => void;
}

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
        
        {/* Header */}
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Join League</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* League Details */}
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-white">{league.name}</h2>
            <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
              <span className={`px-2 py-0.5 rounded border ${league.type === 'custom' ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                {league.type === 'custom' ? 'Custom' : 'Standard'}
              </span>
              <span>•</span>
              <span>{league.members?.length || 0} Members</span>
            </div>
            
            <p className="text-sm text-gray-400 pt-2">
              Commissioner: <span className="font-bold text-white">{displayOwner}</span>
            </p>
          </div>

          {/* Password Input (Only if Private) */}
          {isPrivate && (
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                This league is private
              </label>
              <input 
                type="password"
                placeholder="Enter League Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded focus:ring-2 focus:ring-green-500 outline-none text-white"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center font-bold">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex flex-col gap-3">
          <button 
            onClick={handleConfirmJoin}
            disabled={isJoining || (isPrivate && !password)}
            className="w-full py-3 bg-green-500 text-black rounded-lg font-bold hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join League'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. JOIN LEAGUE TAB (MAIN) ---
const JoinLeague = ({ user }: { user: User }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundLeague, setFoundLeague] = useState<any | null>(null);

  const handleFindLeague = async () => {
    if (!inviteCode.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setFoundLeague(null);

    try {
      const leagueRef = doc(db, "leagues", inviteCode.trim());
      const leagueSnap = await getDoc(leagueRef);

      if (!leagueSnap.exists()) {
        setSearchError("League not found. Check the code.");
        setIsSearching(false);
        return;
      }

      const leagueData = { id: leagueSnap.id, ...leagueSnap.data() };
      setFoundLeague(leagueData); 
      setIsSearching(false);

    } catch (error) {
      console.error("Error finding league:", error);
      setSearchError("An error occurred while searching.");
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8 mt-6">
      
      {/* SECTION A: FIND LEAGUE */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Find a League
        </h2>
        <p className="text-gray-400 text-sm mb-4">Enter a League Code (ID) to view details and join.</p>
        
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Paste League Code here..." 
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="flex-1 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none placeholder-gray-600"
          />
          <button 
            onClick={handleFindLeague}
            disabled={isSearching || !inviteCode}
            className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
          >
            {isSearching ? '...' : 'Find'}
          </button>
        </div>
        {searchError && (
          <p className="text-red-400 text-sm mt-3 font-medium">⚠️ {searchError}</p>
        )}
      </div>

      {/* SECTION B: BROWSE PUBLIC LEAGUES (PLACEHOLDER) */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          Browse Public Leagues
        </h2>
        <div className="py-8 text-center border-2 border-dashed border-gray-700 rounded-xl">
           <p className="text-gray-500 italic text-lg">Coming soon...</p>
        </div>
      </div>

      {/* POPUP: LEAGUE JOIN MODAL */}
      {foundLeague && (
        <LeagueJoinModal 
          league={foundLeague} 
          user={user} 
          onClose={() => setFoundLeague(null)} 
        />
      )}
    </div>
  );
};

// --- 4. MY LEAGUES TAB ---
const MyLeagues = ({ user }: { user: User }) => {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const q = query(
          collection(db, "leagues"), 
          where("members", "array-contains", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const leaguesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLeagues(leaguesData);
      } catch (error) {
        console.error("Error fetching leagues:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, [user.uid]);

  const handleShare = (e: React.MouseEvent, leagueId: string) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(leagueId); 
    alert(`League Code copied to clipboard: ${leagueId}`);
  };

  return (
    <>
      <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">My Leagues</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
          >
            + Create League
          </button>
        </div>
        
        {loading ? (
          <div className="text-gray-400 italic">Loading leagues...</div>
        ) : leagues.length === 0 ? (
          <div className="text-gray-500 py-8 text-center border-2 border-dashed border-gray-700 rounded-xl">
            You aren't in any leagues yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <div 
                key={league.id}
                onClick={() => router.push(`/league/${league.id}`)}
                className="relative cursor-pointer border border-gray-700 rounded-lg p-5 hover:shadow-lg hover:border-green-400/50 hover:bg-gray-750 transition-all bg-gray-900 group"
              >
                <div className="flex justify-between items-start">
                   <h3 className="font-bold text-white text-lg group-hover:text-green-400 transition-colors pr-6">{league.name}</h3>
                   <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700">
                      {league.type === 'custom' ? 'Custom' : 'PPR Scoring'}
                   </span>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xs text-gray-500">{league.members?.length || 1} Members</span>
                  
                  <button 
                    onClick={(e) => handleShare(e, league.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors z-10"
                    title="Copy League Code"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreateModal && <CreateLeagueModal user={user} onClose={() => setShowCreateModal(false)} />}
    </>
  );
};

// --- 5. MAIN DASHBOARD PAGE ---
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leagues' | 'join'>('leagues');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans text-white">
       {/* Page Header */}
       <header className="bg-gray-800 border-b border-gray-700 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* Left: Home Link */}
              <div className="flex items-center">
                <Link href="/" className="text-sm font-medium text-gray-400 hover:text-green-400 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>
              </div>

              {/* Right: User Info */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">Hello, <span className="text-white font-bold">{user.displayName || user.email}</span></span>
                <button 
                  onClick={handleSignOut} 
                  className="text-xs text-red-400 font-medium border border-red-900/50 bg-red-900/10 hover:bg-red-900/30 px-4 py-2 rounded-full transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
       </header>

       <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-700 mb-6">
            <button 
              onClick={() => setActiveTab('leagues')} 
              className={`pb-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'leagues' 
                  ? 'text-green-400 border-b-2 border-green-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              My Leagues
            </button>
            <button 
              onClick={() => setActiveTab('join')} 
              className={`pb-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'join' 
                  ? 'text-green-400 border-b-2 border-green-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Join a League
            </button>
          </div>

          <div>
            {activeTab === 'leagues' && <MyLeagues user={user} />}
            {activeTab === 'join' && <JoinLeague user={user} />}
          </div>
       </main>
    </div>
  );
}