'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
// Ensure this import matches your library export
import { NFLPlayer } from '@/lib/nfl-api'; 

// --- CONFIG ---
const ROUNDS = [
  { id: 'wildcard', label: 'Wildcard' },
  { id: 'divisional', label: 'Divisional' },
  { id: 'conference', label: 'Conf. Champ' },
  { id: 'superbowl', label: 'Super Bowl' }
];

const STANDARD_SLOTS = [
  { id: 'qb1', pos: 'QB', label: 'QB' },
  { id: 'rb1', pos: 'RB', label: 'RB' },
  { id: 'rb2', pos: 'RB', label: 'RB' },
  { id: 'wr1', pos: 'WR', label: 'WR' },
  { id: 'wr2', pos: 'WR', label: 'WR' },
  { id: 'te1', pos: 'TE', label: 'TE' },
  { id: 'flex1', pos: 'FLEX', label: 'FLEX' },
  { id: 'k1', pos: 'K', label: 'K' },
  { id: 'def1', pos: 'DEF', label: 'DEF' }
];

const CUSTOM_SLOTS = [
  { id: 'qb1', pos: 'QB', label: 'QB' },
  { id: 'rb1', pos: 'RB', label: 'RB' },
  { id: 'rb2', pos: 'RB', label: 'RB' },
  { id: 'wr1', pos: 'WR', label: 'WR' },
  { id: 'wr2', pos: 'WR', label: 'WR' },
  { id: 'wr3', pos: 'WR', label: 'WR' },
  { id: 'te1', pos: 'TE', label: 'TE' },
  { id: 'sflex1', pos: 'SUPERFLEX', label: 'OP' },
];

// --- COMPONENT: GAMES BAR ---
interface GameInfo {
  id: string;
  home: string;
  away: string;
  date: string;
  time: string;
}

const GamesBar = ({ games }: { games: GameInfo[] }) => {
  if (!games || games.length === 0) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${parseInt(month)}/${parseInt(day)}`;
  };

  return (
    <div className="mb-6 overflow-x-auto pb-2">
      <div className="flex space-x-3 min-w-max">
        {games.map((game) => (
          <div key={game.id} className="bg-white border border-gray-200 rounded-lg p-3 w-40 flex flex-col items-center shadow-sm">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
              {formatDate(game.date)} • {game.time}
            </div>
            <div className="flex items-center justify-between w-full px-2">
              <span className="font-bold text-gray-800 text-lg">{game.away}</span>
              <span className="text-gray-400 text-xs">@</span>
              <span className="font-bold text-gray-800 text-lg">{game.home}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENT: PLAYER SELECTOR (ROBUST VERSION) ---
const PlayerSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  positionNeeded, 
  availablePlayers 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (player: NFLPlayer) => void;
  positionNeeded: string;
  availablePlayers: NFLPlayer[];
}) => {
  if (!isOpen) return null;

  const filteredPlayers = availablePlayers.filter(p => {
    // Robust Check: Handle 'position' OR 'pos', and normalize case
    // @ts-ignore
    const rawPos = p.position || p.pos || ''; 
    const playerPos = rawPos.toUpperCase();
    const target = positionNeeded.toUpperCase();

    // Debugging specific misses if needed
    // if (target === 'QB' && playerPos !== 'QB') console.log('Skipping', p.name, playerPos);

    if (target === 'FLEX') return ['RB', 'WR', 'TE'].includes(playerPos);
    if (target === 'SUPERFLEX' || target === 'OP') return ['QB', 'RB', 'WR', 'TE'].includes(playerPos);
    
    return playerPos === target;
  });

  // Sort by Projection (High to Low)
  const sortedPlayers = filteredPlayers.sort((a, b) => (b.projection || 0) - (a.projection || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Select {positionNeeded}</h3>
            <p className="text-xs text-gray-500">{sortedPlayers.length} available</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-10 text-gray-400 px-4">
              <p className="font-bold">No players found.</p>
              <p className="text-xs mt-2 text-gray-400">
                 Debug: Loaded {availablePlayers.length} total players. 
                 Looking for "{positionNeeded}".
              </p>
            </div>
          ) : (
            sortedPlayers.map(player => (
              <div 
                key={player.id}
                onClick={() => onSelect(player)}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded w-12 text-center">
                    {player.position || 'N/A'}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{player.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">{player.team} {player.opponent ? `vs ${player.opponent}` : ''}</p>
                      <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-100">
                        Proj: {player.projection?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-3">
                  <button className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition">+</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: SELECTIONS TAB ---
const SelectionsTab = ({ league, user }: { league: any, user: User }) => {
  const [activeRound, setActiveRound] = useState('wildcard');
  const [unlockedRounds, setUnlockedRounds] = useState<string[]>(['wildcard']);
  
  const [lineup, setLineup] = useState<Record<string, NFLPlayer | null>>({});
  const [allPlayers, setAllPlayers] = useState<NFLPlayer[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectingSlot, setSelectingSlot] = useState<{id: string, pos: string} | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Load Round Data
  useEffect(() => {
    const fetchRoundData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch Players from API
        const res = await fetch(`/api/nfl?round=${activeRound}`);
        const data = await res.json();
        
        console.log(`[SelectionsTab] API Response for ${activeRound}:`, data);
        setAllPlayers(data.players || []);
        setGames(data.games || []);

        // 2. Fetch User Lineup from Firestore
        const lineupRef = doc(db, 'leagues', league.id, 'lineups', `${user.uid}_${activeRound}`);
        const lineupSnap = await getDoc(lineupRef);
        
        if (lineupSnap.exists()) {
          setLineup(lineupSnap.data().roster || {});
        } else {
          setLineup({});
        }
      } catch (error) {
        console.error("Error loading round data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchRoundData();
  }, [activeRound, league.id, user.uid]);

  // Save Logic
  const saveLineupToFirestore = async (newLineup: Record<string, NFLPlayer | null>) => {
    setSaveStatus('saving');
    try {
      const lineupRef = doc(db, 'leagues', league.id, 'lineups', `${user.uid}_${activeRound}`);
      await setDoc(lineupRef, {
        userId: user.uid,
        userName: user.displayName || 'Unknown',
        round: activeRound,
        roster: newLineup,
        updatedAt: serverTimestamp()
      });
      setSaveStatus('saved');
    } catch (error) {
      console.error("Auto-save failed:", error);
      setSaveStatus('error');
    }
  };

  const rosterSlots = league.type === 'custom' ? CUSTOM_SLOTS : STANDARD_SLOTS;

  const handlePlayerSelect = (player: NFLPlayer) => {
    if (selectingSlot) {
      const playerToSave = {
        ...player,
        projection: player.projection !== undefined ? Number(player.projection) : 0,
        actualScore: player.actualScore !== undefined ? Number(player.actualScore) : 0
      };
      const newLineup = { ...lineup, [selectingSlot.id]: playerToSave };
      setLineup(newLineup);
      saveLineupToFirestore(newLineup);
      setSelectingSlot(null);
    }
  };

  const handleRemovePlayer = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLineup = { ...lineup };
    delete newLineup[slotId];
    setLineup(newLineup);
    saveLineupToFirestore(newLineup);
  };

  return (
    <div>
      {/* Round Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto mb-6">
        {ROUNDS.map((round) => {
          const isLocked = !unlockedRounds.includes(round.id);
          return (
            <button
              key={round.id}
              onClick={() => !isLocked && setActiveRound(round.id)}
              disabled={isLocked}
              className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all flex-1 flex items-center justify-center ${
                activeRound === round.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : isLocked 
                    ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {isLocked && <span className="mr-2 text-xs">🔒</span>}
              {round.label}
            </button>
          );
        })}
      </div>

      <GamesBar games={games} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
             <h3 className="font-bold text-gray-800">Your Lineup</h3>
             <div className="flex items-center mt-1 space-x-2">
                <span className="text-xs text-gray-400">{league.type === 'standard' ? 'Standard' : 'Custom'}</span>
                {saveStatus === 'saving' && <span className="text-xs text-blue-500 font-medium animate-pulse">• Saving...</span>}
                {saveStatus === 'saved' && <span className="text-xs text-green-600 font-medium">• Saved</span>}
                {saveStatus === 'error' && <span className="text-xs text-red-500 font-medium">• Save Failed</span>}
             </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loadingData ? (
             <div className="p-8 text-center text-gray-400">Loading {activeRound} Data...</div>
          ) : (
            rosterSlots.map((slot) => {
              const player = lineup[slot.id];
              return (
                <div 
                  key={slot.id}
                  onClick={() => !player && setSelectingSlot({ id: slot.id, pos: slot.pos })}
                  className={`flex items-center justify-between p-4 transition group ${
                    !player ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                >
                  <div className="w-16 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${player ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                      {slot.label}
                    </span>
                  </div>

                  <div className="flex-1 px-4">
                    {player ? (
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{player.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">{player.team} {player.opponent ? `vs ${player.opponent}` : ''}</p>
                          <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-100">
                            Proj: {Number(player.projection).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Empty Slot</p>
                    )}
                  </div>

                  <div>
                    {player ? (
                      <button onClick={(e) => handleRemovePlayer(slot.id, e)} className="text-gray-300 hover:text-red-500 transition px-2">✕</button>
                    ) : (
                      <button className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold hover:bg-blue-100 transition group-hover:scale-110">+</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <PlayerSelector 
        isOpen={!!selectingSlot}
        positionNeeded={selectingSlot?.pos || ''}
        availablePlayers={allPlayers}
        onClose={() => setSelectingSlot(null)}
        onSelect={handlePlayerSelect}
      />
    </div>
  );
};

// --- PLACEHOLDER TABS ---
const LeaderboardTab = () => <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">Leaderboard Coming Soon</div>;
const RulesTab = () => <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">League Rules</div>;
const SettingsTab = () => <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">League Settings</div>;

// --- MAIN PAGE ---
export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leagueData, setLeagueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'selections' | 'leaderboard' | 'rules' | 'settings'>('selections');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push('/login');
      setUser(currentUser);
      if (params.id) {
        try {
          const docSnap = await getDoc(doc(db, 'leagues', params.id as string));
          if (docSnap.exists()) {
             setLeagueData({ id: docSnap.id, ...docSnap.data() });
          } else {
             router.push('/');
          }
        } catch (e) { 
           console.error(e); 
        } finally { 
           setLoading(false); 
        }
      }
    });
    return () => unsubscribe();
  }, [params.id, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading League...</div>;
  if (!leagueData || !user) return null;
  
  const isOwner = user.uid === leagueData.ownerId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 transition flex items-center font-medium">
              <span className="mr-1">←</span> Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{leagueData.name}</h1>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
              {leagueData.type}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-6 mb-8 border-b border-gray-200">
          {['selections', 'leaderboard', 'rules'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center ${
                activeTab === 'settings' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-400 hover:text-red-600 hover:border-red-300'
              }`}
            >
              Settings
            </button>
          )}
        </div>

        <div className="animate-fadeIn">
          {activeTab === 'selections' && <SelectionsTab league={leagueData} user={user} />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'rules' && <RulesTab />}
          {activeTab === 'settings' && isOwner && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}