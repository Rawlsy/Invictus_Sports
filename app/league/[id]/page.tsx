'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { db, auth } from '@/lib/firebase'; 
import { Lock, Search } from 'lucide-react'; 

const DB_LINEUP_KEYS = {
  wildcard: "Wild Card Lineup",
  divisional: "Divisional Lineup",
  conference: "Conference Lineup",
  superbowl: "Super Bowl Lineup"
};

const ROUND_TO_DB_MAP = {
  wildcard: "WildCard",
  divisional: "Divisional",
  conference: "Conference",
  superbowl: "Superbowl"
};

const ROUND_TO_WEEK_PATH = {
  wildcard: "Week 19",
  divisional: "Week 20",
  conference: "Week 21",
  superbowl: "Week 22"
};

const POSITIONS = [
  { id: 'QB', name: 'Quarterback', label: 'QB' },
  { id: 'RB1', label: 'RB', name: 'Running Back' },
  { id: 'RB2', label: 'RB', name: 'Running Back' },
  { id: 'WR1', label: 'WR', name: 'Wide Receiver' },
  { id: 'WR2', label: 'WR', name: 'Wide Receiver' },
  { id: 'TE', name: 'Tight End', label: 'TE' },
  { id: 'FLEX', name: 'Flex', label: 'FLEX' },
  { id: 'K', name: 'Kicker', label: 'K' },
  { id: 'DEF', name: 'Defense', label: 'DEF' }
];

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter(); 
  
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Selections');
  const [activeRound, setActiveRound] = useState<keyof typeof ROUND_TO_DB_MAP>('divisional');
  
  const [games, setGames] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [lineup, setLineup] = useState<Record<string, any>>({}); 
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else router.push('/login');
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const weekSubPath = ROUND_TO_WEEK_PATH[activeRound];
        const gamesRef = collection(db, 'Games Scheduled', 'Weeks', weekSubPath);
        const gamesSnap = await getDocs(gamesRef);
        setGames(gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const playersRef = collection(db, 'players');
        const playersSnap = await getDocs(playersRef);
        setAvailablePlayers(playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { console.error("Fetch error:", err); }
    };
    fetchData();
  }, [activeRound]);

  useEffect(() => {
    if (!params.id) return;
    const membersRef = collection(db, 'leagues', params.id as string, 'Members');
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = members.sort((a, b) => (b.scores?.Total || 0) - (a.scores?.Total || 0));
      setLeaderboard(sorted);
    });
    return () => unsubscribe();
  }, [params.id]);

  useEffect(() => {
    if (!userId || !params.id || availablePlayers.length === 0) return;
    const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
    const unsubscribe = onSnapshot(memberRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dbKey = DB_LINEUP_KEYS[activeRound];
        const savedLineup = data[dbKey] || {};
        const hydrated: Record<string, any> = {};
        
        Object.keys(savedLineup).forEach(slot => {
          const p = availablePlayers.find(player => player.id === savedLineup[slot]);
          if (p) hydrated[slot] = p;
        });
        setLineup(hydrated);
      }
    });
    return () => unsubscribe();
  }, [activeRound, params.id, userId, availablePlayers]);

  const formatApiDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${parseInt(dateStr.substring(4, 6))}/${parseInt(dateStr.substring(6, 8))}`;
  };

  const isRoundLocked = () => {
    if (activeRound !== 'divisional') return true; 
    if (games.length === 0) return false;
    const startTimes = games.map(g => {
        const yr = g.Date.substring(0, 4);
        const mo = g.Date.substring(4, 6);
        const dy = g.Date.substring(6, 8);
        return new Date(`${yr}-${mo}-${dy}T${g.Time}`).getTime();
    });
    return new Date().getTime() > Math.min(...startTimes);
  };

  const getPlayerProjPPR = (p: any) => {
    const roundData = p[ROUND_TO_DB_MAP[activeRound]];
    return roundData ? Number(roundData["Projected PPR"] || 0) : 0;
  };

  const getPlayerActual = (p: any) => {
    const roundData = p[ROUND_TO_DB_MAP[activeRound]];
    return roundData ? Number(roundData["PPR"] || 0) : 0;
  };

  const getMatchupInfo = (playerTeam: string) => {
    const game = games.find(g => g['Home Team'] === playerTeam || g['Away Team'] === playerTeam);
    if (!game) return { opponent: 'BYE', time: '' };
    const isHome = game['Home Team'] === playerTeam;
    return { 
      opponent: isHome ? `vs ${game['Away Team']}` : `@ ${game['Home Team']}`, 
      time: game.Time || "" 
    };
  };

  // FILTER LOGIC: Specifically handles DEF position and search
  const filteredPlayersList = useMemo(() => {
    if (!selectedSlot) return [];
    const requiredPos = selectedSlot.replace(/[0-9]/g, '');
    const dbRoundKey = ROUND_TO_DB_MAP[activeRound];
    
    return availablePlayers
      .filter(p => {
        const pPos = (p.position || p.pos || p.Position || "").toUpperCase();
        
        // Exact match logic for QB, RB, WR, TE, K, and DEF
        let posMatch = false;
        if (requiredPos === 'FLEX') {
          posMatch = ['RB', 'WR', 'TE'].includes(pPos);
        } else if (requiredPos === 'DEF') {
          posMatch = pPos === 'DEF';
        } else {
          posMatch = pPos === requiredPos;
        }

        const name = (p.name || p.longName || p.Name || "").toLowerCase();
        return posMatch && p[dbRoundKey]?.Active === true && name.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => getPlayerProjPPR(b) - getPlayerProjPPR(a));
  }, [availablePlayers, selectedSlot, activeRound, searchTerm]);

  const handleSelectPlayer = async (player: any) => {
    if (!selectedSlot || !userId || isRoundLocked()) return;
    const dbKey = DB_LINEUP_KEYS[activeRound];
    const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
    try {
      await setDoc(memberRef, { [dbKey]: { [selectedSlot]: player.id } }, { merge: true });
      setIsModalOpen(false);
      setSearchTerm('');
    } catch (err) { console.error("Save error:", err); }
  };

  return (
    <div className="pb-20 bg-gray-950 min-h-screen">
      <div className="bg-gray-900/50 border-b border-gray-800 px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex space-x-10">
          {['Selections', 'Leaderboard', 'Rules'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-green-500 text-green-500' : 'border-transparent text-gray-500 hover:text-white'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-10">
        {activeTab === 'Selections' && (
          <>
            <div className="grid grid-cols-4 gap-2 bg-gray-900 p-1.5 rounded-2xl border border-gray-800">
              {Object.keys(ROUND_TO_DB_MAP).map(r => {
                const isLocked = r !== 'divisional';
                return (
                  <button key={r} onClick={() => setActiveRound(r as any)} className={`relative py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest flex items-center justify-center space-x-2 ${activeRound === r ? 'bg-blue-600 text-white shadow-2xl' : 'text-gray-500 hover:bg-gray-800'}`}>
                    <span>{r}</span>
                    {isLocked && <Lock size={10} className="text-gray-600" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 px-1 text-center">Playoff Schedule</h3>
              <div className="flex space-x-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                {games.map((game) => {
                  const isCompleted = game.gameStatus === 'Completed' || game.gameStatus === 'Final';
                  const awayS = Number(game.awayScore || 0);
                  const homeS = Number(game.homeScore || 0);
                  return (
                    <div key={game.id} className={`min-w-[180px] p-4 bg-gray-900 border ${isCompleted ? 'border-green-500/20 shadow-inner' : 'border-gray-800'} rounded-2xl shrink-0 flex flex-col items-center justify-center text-center transition-all hover:border-gray-700`}>
                      <span className={`text-[8px] font-black mb-2 uppercase tracking-widest ${isCompleted ? 'text-green-500' : 'text-gray-500'}`}>{isCompleted ? 'Final' : `${formatApiDate(game.Date)} • ${game.Time}`}</span>
                      <div className="flex items-center w-full justify-around space-x-2">
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isCompleted && awayS > homeS ? 'text-green-500' : 'text-white'}`}>{game['Away Team']}</span>
                          {isCompleted && <span className={`text-xs font-black mt-1 ${awayS > homeS ? 'text-green-500' : 'text-white'}`}>{game.awayScore || 0}</span>}
                        </div>
                        <span className="text-[8px] font-bold text-gray-800">@</span>
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isCompleted && homeS > awayS ? 'text-green-500' : 'text-white'}`}>{game['Home Team']}</span>
                          {isCompleted && <span className={`text-xs font-black mt-1 ${homeS > awayS ? 'text-green-500' : 'text-white'}`}>{game.homeScore || 0}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border-t-4 border-green-500 shadow-2xl divide-y divide-gray-800 overflow-hidden">
               <div className="px-8 py-4 bg-gray-900 flex justify-between items-center border-b border-gray-800">
                  <h2 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">Your {activeRound} Lineup</h2>
                  {isRoundLocked() ? (
                    <span className="text-red-500 text-[9px] font-black border border-red-500/20 px-2.5 py-1 rounded bg-red-500/5 uppercase">Locked</span>
                  ) : (
                    <span className="text-green-500 text-[9px] font-black border border-green-500/20 px-2.5 py-1 rounded bg-green-500/10 uppercase">Open</span>
                  )}
               </div>
               {POSITIONS.map(pos => {
                const p = lineup[pos.id];
                const locked = isRoundLocked();
                return (
                  <div key={pos.id} onClick={() => !locked && (setSelectedSlot(pos.id), setIsModalOpen(true))} className={`px-8 py-6 flex items-center transition-all ${!locked ? 'cursor-pointer hover:bg-gray-800/50' : 'opacity-60'}`}>
                    <div className="w-14"><span className="px-2.5 py-1.5 bg-gray-800 text-[9px] font-black rounded uppercase border border-gray-700">{pos.label}</span></div>
                    <div className="flex-1 ml-6">
                      {p ? (
                        <div>
                          <div className="text-base font-serif italic font-black text-white uppercase tracking-tight leading-none">
                            {p.name || p.longName || p.Name}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1.5">
                            <span className="text-white font-black">{p.team || p.Team}</span> • {getMatchupInfo(p.team || p.Team).opponent}
                          </div>
                        </div>
                      ) : <div className="text-xs text-gray-600 italic font-bold uppercase tracking-widest">Select Player</div>}
                    </div>
                    <div className="text-right font-black text-xl text-white tracking-tighter tabular-nums">{p ? getPlayerActual(p).toFixed(1) : '-'}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'Leaderboard' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-800"><h2 className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Standings</h2></div>
            <div className="divide-y divide-gray-800">
              {leaderboard.map((member, index) => (
                <div key={member.id} className={`flex items-center px-8 py-6 transition-all ${member.id === userId ? 'bg-blue-600/5 border-l-4 border-blue-600' : 'hover:bg-gray-800/30'}`}>
                  <div className="w-10 text-center"><span className={`text-xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{index + 1}</span></div>
                  <div className="flex-1 ml-6">
                    <span className="font-black text-white uppercase tracking-tight text-sm">{member.displayName || member.username || "Member"}</span>
                    {member.id === userId && <span className="ml-3 text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase">You</span>}
                  </div>
                  <div className="text-right"><div className="text-2xl font-black text-white tracking-tighter tabular-nums">{(member.scores?.Total || 0).toFixed(1)}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
          <div className="bg-gray-900 w-full max-w-xl rounded-[2rem] flex flex-col max-h-[85vh] border border-gray-800 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-800 bg-gray-900/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-white uppercase tracking-widest text-[10px] text-blue-500">Select {selectedSlot}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input 
                  autoFocus
                  placeholder="SEARCH PLAYERS..." 
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-white uppercase tracking-widest focus:border-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar border-t border-gray-800/50">
              {filteredPlayersList.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handleSelectPlayer(p)} 
                  className="w-full text-left p-5 hover:bg-blue-600/10 rounded-2xl flex justify-between items-center group transition-all border border-transparent hover:border-blue-500/50"
                >
                  <div className="flex items-center space-x-5">
                    <div className="bg-gray-800 text-[10px] font-black w-12 h-12 flex items-center justify-center rounded-full border border-gray-700 group-hover:border-blue-500 group-hover:text-blue-500 transition-all">
                      {p.position || p.pos || p.Position}
                    </div>
                    <div>
                      <div className="font-Georgia text-base font-black text-white uppercase tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                        {p.name || p.longName || p.Name}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1.5">
                        <span className="text-white font-black">{p.team || p.Team}</span> • {getMatchupInfo(p.team || p.Team).opponent}
                      </div>
                    </div>
                  </div>
                  <div className="text-right border-l border-gray-800 pl-6">
                    <div className="text-xl font-black text-green-500 tracking-tighter leading-none tabular-nums">
                      {getPlayerProjPPR(p).toFixed(1)}
                    </div>
                    <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest mt-1">Proj PPR</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}