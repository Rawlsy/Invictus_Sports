'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [leagueType, setLeagueType] = useState<'standard' | 'custom' | null>(null);
  const [leagueName, setLeagueName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleContinue = async () => {
    if (!leagueType || !leagueName.trim()) return;
    if (isPrivate && !password.trim()) return; 

    setIsCreating(true);

    try {
      const docRef = await addDoc(collection(db, "leagues"), {
        name: leagueName,
        type: leagueType,
        ownerId: user.uid,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Create a New League</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
        </div>
        <div className="p-8">
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">League Name</label>
            <input 
              type="text" 
              placeholder="e.g. The Sunday Showdown"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            />
          </div>
          
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center space-x-3 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="font-bold text-gray-700">Make this league Private?</span>
            </label>
            {isPrivate && (
              <div className="ml-8 mt-2">
                <input 
                  type="text" 
                  placeholder="Set a League Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                />
              </div>
            )}
          </div>

          <h4 className="text-gray-600 mb-4 font-medium">Select Format:</h4>
          <div className="grid grid-cols-2 gap-6">
            <div 
              onClick={() => setLeagueType('standard')}
              className={`cursor-pointer border-2 rounded-xl p-6 ${leagueType === 'standard' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
            >
              <h5 className="font-bold text-gray-900">Standard</h5>
            </div>
            <div 
              onClick={() => setLeagueType('custom')}
              className={`cursor-pointer border-2 rounded-xl p-6 ${leagueType === 'custom' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`}
            >
              <h5 className="font-bold text-gray-900">Custom</h5>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
          <button 
            onClick={handleContinue}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            {isCreating ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. JOIN LEAGUE TAB ---
const JoinLeague = ({ user }: { user: User }) => {
  const router = useRouter();
  const [publicLeagues, setPublicLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicLeagues = async () => {
      try {
        const q = query(collection(db, "leagues"), where("privacy", "==", "public"));
        const querySnapshot = await getDocs(q);
        const leaguesData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((l: any) => !l.members.includes(user.uid)); 

        setPublicLeagues(leaguesData);
      } catch (error) {
        console.error("Error fetching public leagues:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicLeagues();
  }, [user.uid]);

  const handleJoin = async (leagueId: string) => {
    setJoiningId(leagueId);
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      await updateDoc(leagueRef, {
        members: arrayUnion(user.uid)
      });
      router.push(`/league/${leagueId}`);
    } catch (error) {
      console.error("Error joining league:", error);
      alert("Failed to join.");
      setJoiningId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Join a League</h2>
      {loading ? (
        <div className="text-black">Finding open leagues...</div>
      ) : publicLeagues.length === 0 ? (
        <div className="text-gray-500">No public leagues found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicLeagues.map((league) => (
            <div key={league.id} className="border border-gray-200 rounded-lg p-5 flex justify-between items-center text-black">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{league.name}</h3>
                <span className="text-xs text-gray-500">{league.members?.length} Members</span>
              </div>
              <button 
                onClick={() => handleJoin(league.id)}
                disabled={joiningId === league.id}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                {joiningId === league.id ? 'Joining...' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- 3. MY LEAGUES TAB ---
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

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Leagues</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Create League
          </button>
        </div>
        
        {loading ? (
          <div className="text-black">Loading leagues...</div>
        ) : leagues.length === 0 ? (
          <div className="text-gray-500">You aren't in any leagues yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <div 
                key={league.id}
                onClick={() => router.push(`/league/${league.id}`)}
                className="cursor-pointer border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition bg-white text-black"
              >
                <h3 className="font-bold text-gray-900 text-lg">{league.name}</h3>
                <span className="text-xs text-gray-400">{league.members?.length || 1} Members</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreateModal && <CreateLeagueModal user={user} onClose={() => setShowCreateModal(false)} />}
    </>
  );
};

// --- 4. MAIN DASHBOARD PAGE ---
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
       <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <span className="text-xl font-bold text-blue-900">INVICTUS</span>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hello, {user.displayName || user.email}</span>
                <button onClick={handleSignOut} className="text-sm text-red-600 font-medium border border-red-200 px-4 py-2 rounded-full">Sign Out</button>
              </div>
            </div>
          </div>
       </header>

       <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex border-b border-gray-200 mb-6">
            <button onClick={() => setActiveTab('leagues')} className={`pb-4 px-6 text-sm font-medium ${activeTab === 'leagues' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
              My Leagues
            </button>
            <button onClick={() => setActiveTab('join')} className={`pb-4 px-6 text-sm font-medium ${activeTab === 'join' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
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