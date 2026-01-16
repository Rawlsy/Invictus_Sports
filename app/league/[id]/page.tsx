'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';

// --- CONFIGURATION ---
const ROUND_SCHEDULE = {
  wildcard:   new Date('2026-01-10T16:30:00-05:00'), 
  divisional: new Date('2026-01-17T16:30:00-05:00'), 
  conference: new Date('2026-01-25T15:00:00-05:00'), 
  superbowl:  new Date('2026-02-08T18:30:00-05:00'), 
};

const POSITIONS = [
  { id: 'QB', name: 'Quarterback' },
  { id: 'RB1', label: 'RB', name: 'Running Back' },
  { id: 'RB2', label: 'RB', name: 'Running Back' },
  { id: 'WR1', label: 'WR', name: 'Wide Receiver' },
  { id: 'WR2', label: 'WR', name: 'Wide Receiver' },
  { id: 'TE', name: 'Tight End' },
  { id: 'FLEX', name: 'Flex' },
  { id: 'K', name: 'Kicker' },
  { id: 'DEF', name: 'Defense' }
];

export default function LeaguePage() {
  const params = useParams();
  
  // --- STATE ---
  const [userId] = useState('test_user_1'); 

  const [activeTab, setActiveTab] = useState('Selections');
  const [activeRound, setActiveRound] = useState('wildcard');
  
  const [games, setGames] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [lineup, setLineup] = useState<Record<string, any>>({}); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // --- 1. FETCH GAME DATA ---
  useEffect(() => {
    const fetchRoundData = async () => {
      setGames([]); 
      setAvailablePlayers([]);

      let cacheId = '';
      if (activeRound === 'wildcard') cacheId = 'nfl_post_week_1';
      if (activeRound === 'divisional') cacheId = 'nfl_post_week_2';
      if (activeRound === 'conference') cacheId = 'nfl_post_week_3';
      if (activeRound === 'superbowl') cacheId = 'nfl_post_week_4';

      if (!cacheId) return;

      try {
        const docRef = doc(db, 'system_cache', cacheId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.payload) {
            setGames(data.payload.games || []);
            setAvailablePlayers(data.payload.players || []);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchRoundData();
  }, [activeRound]);

  // --- 2. FETCH SAVED LINEUP ---
  useEffect(() => {
    if (!userId || !params.id) return;

    const lineupRef = doc(db, 'leagues', params.id as string, 'selections', userId);

    const unsubscribe = onSnapshot(lineupRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLineup(data[activeRound] || {});
      } else {
        setLineup({}); 
      }
    });

    return () => unsubscribe();
  }, [activeRound, params.id, userId]);

  // --- HELPERS ---
  const isRoundLocked = (roundId: string) => {
    const now = new Date();
    // @ts-ignore
    const deadline = ROUND_SCHEDULE[roundId];
    return now > deadline;
  };

  // --- HANDLERS ---
  const handleSlotClick = (slotId: string) => {
    if (isRoundLocked(activeRound)) return;
    setSelectedSlot(slotId);
    setIsModalOpen(true);
  };

  // --- 3. SAVE PLAYER ---
  const handleSelectPlayer = async (player: any) => {
    if (!selectedSlot || !userId) return;
    
    setLineup(prev => ({
      ...prev,
      [selectedSlot]: player
    }));
    
    setIsModalOpen(false);

    try {
      const lineupRef = doc(db, 'leagues', params.id as string, 'selections', userId);
      await setDoc(lineupRef, {
        [activeRound]: {
          [selectedSlot]: player
        }
      }, { merge: true });

    } catch (error) {
      console.error("Error saving selection:", error);
    }
    
    setSelectedSlot(null);
  };

  // --- 4. FILTER & SORT ---
  const getFilteredPlayers = () => {
    if (!selectedSlot) return [];
    let requiredPos = selectedSlot.replace(/[0-9]/g, '');
    
    return availablePlayers
      .filter(p => {
        if (requiredPos === 'FLEX') {
          return ['RB', 'WR', 'TE'].includes(p.pos || p.position);
        }
        return (p.pos || p.position) === requiredPos;
      })
      .sort((a, b) => {
        const ptsA = Number(a.fantasyPoints || a.projectedPoints || 0);
        const ptsB = Number(b.fantasyPoints || b.projectedPoints || 0);
        return ptsB - ptsA; 
      });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      
      {/* HEADER */}
      <header className="bg-gray-800 border-b border-gray-700 border-t-4 border-t-green-400 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </div>
            <h1 className="text-xl font-bold text-white">
              Test League 1/5/26 
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase">Standard</span>
            </h1>
          </div>
        </div>
      </header>

      {/* NAV TABS */}
      <div className="bg-gray-800 border-b border-gray-700 mb-6">
        <div className="max-w-5xl mx-auto px-4 flex space-x-6">
          {['Selections', 'Leaderboard', 'Rules', 'Settings'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-green-400 text-green-400' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 space-y-6">
        
        {activeTab === 'Selections' && (
          <>
            {/* ROUND SELECTOR */}
            <div className="grid grid-cols-4 gap-2 bg-gray-800 p-1 rounded-xl border border-gray-700">
              {['wildcard', 'divisional', 'conference', 'superbowl'].map((roundId) => {
                const locked = isRoundLocked(roundId);
                const active = activeRound === roundId;
                const label = roundId.charAt(0).toUpperCase() + roundId.slice(1); 

                return (
                  <button
                    key={roundId}
                    onClick={() => setActiveRound(roundId)}
                    className={`relative py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1 
                      ${active 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                  >
                    {locked && <svg className="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* GAMES BAR */}
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide min-h-[80px]">
              {games.length === 0 ? (
                <div className="w-full text-center py-4 text-gray-500 italic text-sm">Loading games...</div>
              ) : (
                games.map((game) => (
                  <div key={game.id} className="min-w-[160px] bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm flex-shrink-0">
                    <span className="text-xs text-gray-400 font-mono mb-1">{game.date?.slice(4,6)}/{game.date?.slice(6,8)} • {game.time}</span>
                    <div className="text-sm font-bold text-white whitespace-nowrap">{game.away || 'TBD'} @ {game.home || 'TBD'}</div>
                  </div>
                ))
              )}
            </div>

            {/* LINEUP CARD (Updated with Name Fix) */}
            <div className="bg-gray-800 rounded-xl border-x border-b border-t-4 border-gray-700 border-t-green-400 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                <h2 className="text-lg font-bold text-white">Your Lineup</h2>
                <div className="flex items-center text-xs text-gray-400 mt-1 space-x-2">
                  <span>Standard</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  {isRoundLocked(activeRound) ? (
                    <span className="text-red-400 flex items-center font-semibold"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>Locked</span>
                  ) : (
                    <span className="text-green-400 flex items-center font-semibold"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Open for Edits</span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-700">
                {POSITIONS.map((pos) => {
                  const player = lineup[pos.id];
                  const isLocked = isRoundLocked(activeRound);

                  return (
                    <div 
                      key={pos.id} 
                      onClick={() => handleSlotClick(pos.id)} 
                      className={`
                        px-4 py-4 flex items-center transition-colors
                        ${!isLocked ? 'cursor-pointer hover:bg-gray-750' : 'cursor-default opacity-80'}
                      `}
                    >
                      <div className="w-12 flex-shrink-0">
                        <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 text-xs font-bold rounded text-center min-w-[36px]">
                          {pos.label || pos.id}
                        </span>
                      </div>
                      <div className="flex-1 ml-4">
                        {player ? (
                          <div>
                            {/* FIX: Use longName OR name */}
                            <div className="text-sm font-bold text-white">{player.longName || player.name}</div>
                            <div className="text-xs text-gray-400">{player.team} • {player.opponent}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">Empty Slot</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600 text-sm">{player ? player.projected?.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* --- PLACEHOLDERS --- */}
        {activeTab === 'Leaderboard' && (
          <div className="text-center py-20 text-gray-500">
            <h2 className="text-xl font-bold text-white mb-2">Leaderboard</h2>
            <p>Standings coming soon...</p>
          </div>
        )}
        
        {activeTab === 'Rules' && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-gray-300">
            <h2 className="text-xl font-bold text-white mb-4">League Rules</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Coming Soon.</li>
            </ul>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="text-center py-20 text-gray-500">
            <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
            <p>Coming Soon.</p>
          </div>
        )}

      </main>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
              <h3 className="text-white font-bold">Select {selectedSlot}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide"> 
              {getFilteredPlayers().length === 0 ? (
                <div className="p-8 text-center text-gray-500">No players found for this position.</div>
              ) : (
                getFilteredPlayers().map((p: any) => (
                  <button
                    key={p.playerID || p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className="w-full text-left flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg group transition-colors border-b border-gray-700/50 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-green-400">{p.longName || p.name}</div>
                      <div className="text-xs text-gray-400">{p.team} • {p.pos}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-green-200">{Number(p.fantasyPoints || p.projectedPoints || 0).toFixed(1)}</div>
                      <div className="text-[10px] text-gray-500">proj</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}