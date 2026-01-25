'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, setDoc, updateDoc, deleteField, onSnapshot, collection, getDocs, query, where, documentId, limit } from 'firebase/firestore'; 
import { onAuthStateChanged, User } from 'firebase/auth'; 
import { db, auth } from '@/lib/firebase'; 
import { Lock, Search, ChevronLeft, Trash2, AlertCircle, Trophy, Share2, Copy, Check, Users, Shield, Crown, Key, Edit2, Save, X } from 'lucide-react'; 

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

const ROUND_TO_WEEK_NUM = {
  wildcard: "19",
  divisional: "20",
  conference: "21",
  superbowl: "22"
};

const ROUND_TO_WEEK_PATH = {
  wildcard: "Week 19",
  divisional: "Week 20",
  conference: "Week 21",
  superbowl: "Week 22"
};

const SCORING_KEYS: Record<string, { proj: string, act: string, label: string }> = {
    "PPR": { proj: "Projected PPR", act: "PPR", label: "PPR" },
    "Half-PPR": { proj: "Projected Half PPR", act: "Half", label: "Half" },
    "Standard": { proj: "Projected Standard", act: "Standard", label: "Std" }
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
  
  const [authUser, setAuthUser] = useState<User | null>(null); 
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Selections');
  const [activeRound, setActiveRound] = useState<keyof typeof ROUND_TO_DB_MAP>('wildcard');
  
  const [games, setGames] = useState<any[]>([]);
  const [modalPlayers, setModalPlayers] = useState<any[]>([]); 
  const [lineup, setLineup] = useState<Record<string, any>>({}); 
  const [previouslySelectedIds, setPreviouslySelectedIds] = useState<Set<string>>(new Set());
  const [currentRoundIds, setCurrentRoundIds] = useState<Set<string>>(new Set());
  
  const [systemWeek, setSystemWeek] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState("Loading...");
  const [leagueScoring, setLeagueScoring] = useState("PPR"); 
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [leaguePassword, setLeaguePassword] = useState<string>("Loading..."); 
  const [leaguePrivacy, setLeaguePrivacy] = useState<string>("Private");

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingLineup, setIsLoadingLineup] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMember, setIsMember] = useState(true);

  // AUTH CHECK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
          setAuthUser(user);
          setUserId(user.uid);
      }
      else {
          const returnUrl = encodeURIComponent(window.location.pathname);
          router.push(`/login?redirect=${returnUrl}`);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // SYSTEM WEEK CHECK
  useEffect(() => {
    const sysRef = doc(db, 'system', 'nfl_state');
    const unsubscribe = onSnapshot(sysRef, (docSnap) => {
        if (docSnap.exists()) {
            const currentWeek = docSnap.data().currentWeek || '19';
            setSystemWeek(currentWeek);
            const matchingRound = Object.keys(ROUND_TO_WEEK_NUM).find(
                key => ROUND_TO_WEEK_NUM[key as keyof typeof ROUND_TO_WEEK_NUM] === currentWeek
            );
            if (matchingRound) setActiveRound(matchingRound as keyof typeof ROUND_TO_DB_MAP);
        } else {
            setSystemWeek('19');
            setActiveRound('wildcard');
        }
    });
    return () => unsubscribe();
  }, []);

  // LEAGUE DETAILS FETCH
  useEffect(() => {
    if (!params.id) return;
    const leagueDocRef = doc(db, 'leagues', params.id as string);
    const unsubscribe = onSnapshot(leagueDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLeagueName(data.name || "Untitled League");
        setOwnerId(data.ownerId || null);
        setLeaguePrivacy(data.privacy || "Private");
        
        if (data.password && data.password.length > 0) {
            setLeaguePassword(data.password);
        } else {
            setLeaguePassword("None");
        }

        let scoreType = data.scoringType || data.scoring || "PPR";
        if (scoreType === "Half PPR") scoreType = "Half-PPR"; 
        setLeagueScoring(scoreType); 
      } else {
        setLeagueName("League Not Found");
      }
    });
    return () => unsubscribe();
  }, [params.id]);

  // 1. FETCH GAMES
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const weekSubPath = ROUND_TO_WEEK_PATH[activeRound];
        const gamesRef = collection(db, 'Games Scheduled', 'Weeks', weekSubPath);
        const gamesSnap = await getDocs(gamesRef);
        setGames(gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { console.error("Fetch error:", err); }
    };
    fetchGames();
  }, [activeRound]);

  // 2. FETCH LEADERBOARD
  useEffect(() => {
    if (!params.id) return;
    const membersRef = collection(db, 'leagues', params.id as string, 'Members');
    const q = query(membersRef, limit(100)); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawMembers = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
      }));

      if (userId) {
          const amIMember = rawMembers.some(m => m.id === userId);
          setIsMember(amIMember);
      }

      const sortedMembers = rawMembers.sort((a: any, b: any) => {
          const scoreA = a.scores?.Total || 0;
          const scoreB = b.scores?.Total || 0;
          return scoreB - scoreA;
      });

      const rankedMembers = sortedMembers.map((m, index) => ({
          ...m,
          rank: index + 1
      }));

      setLeaderboard(rankedMembers);
    });
    return () => unsubscribe();
  }, [params.id, userId]);

  // 3. FETCH LINEUP
  useEffect(() => {
    if (!userId || !params.id || !isMember) return;
    
    const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
    
    const unsubscribe = onSnapshot(memberRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentDbKey = DB_LINEUP_KEYS[activeRound];
        const currentRoundLineup = data[currentDbKey] || {};
        
        const prevIds = new Set<string>();
        Object.keys(DB_LINEUP_KEYS).forEach(roundKey => {
            if (roundKey === activeRound) return;
            const dbKey = DB_LINEUP_KEYS[roundKey as keyof typeof DB_LINEUP_KEYS];
            const roundData = data[dbKey] || {};
            Object.values(roundData).forEach((pid: any) => {
                if (typeof pid === 'string' && pid) prevIds.add(pid);
            });
        });
        setPreviouslySelectedIds(prevIds);

        const currIds = new Set<string>();
        Object.values(currentRoundLineup).forEach((pid: any) => {
             if (typeof pid === 'string' && pid) currIds.add(pid);
        });
        setCurrentRoundIds(currIds);

        const playerIdsToFetch = Object.values(currentRoundLineup).filter(id => typeof id === 'string' && id.length > 0) as string[];

        if (playerIdsToFetch.length === 0) {
            setLineup({});
            return;
        }

        try {
            setIsLoadingLineup(true);
            const playersRef = collection(db, 'players');
            const q = query(playersRef, where(documentId(), 'in', playerIdsToFetch));
            const querySnapshot = await getDocs(q);
            
            const fetchedPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const hydrated: Record<string, any> = {};
            Object.keys(currentRoundLineup).forEach(slot => {
                const pid = currentRoundLineup[slot];
                const playerObj = fetchedPlayers.find(p => p.id === pid);
                if (playerObj) hydrated[slot] = playerObj;
            });
            
            setLineup(hydrated);
        } catch (error) {
            console.error("Error hydrating lineup:", error);
        } finally {
            setIsLoadingLineup(false);
        }
      }
    });
    return () => unsubscribe();
  }, [activeRound, params.id, userId, isMember]);

  // AUTO-FIX USERNAME
  useEffect(() => {
    if (!userId || !params.id || leaderboard.length === 0 || !authUser) return;
    const myEntry = leaderboard.find(m => m.id === userId);
    if (myEntry && !myEntry.username) {
        const displayName = authUser.displayName || authUser.email?.split('@')[0] || 'Anonymous Member';
        const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
        updateDoc(memberRef, { username: displayName }).catch(err => console.error("Failed to auto-fix username", err));
    }
  }, [userId, leaderboard, params.id, authUser]);

  // 4. FETCH MODAL PLAYERS (UPDATED: Fetch ALL by position, filter locally)
  const fetchPlayersForSlot = useCallback(async (slot: string) => {
    setModalPlayers([]); 
    const requiredPos = slot.replace(/[0-9]/g, ''); 
    
    try {
        const playersRef = collection(db, 'players');
        
        // UPDATE: Removed strict limit(50). Using limit(1000) guarantees we get 
        // ALL players for that position. Then 'filteredPlayersList' below
        // handles hiding the players whose teams aren't playing this week.
        const q = requiredPos === 'FLEX' 
            ? query(playersRef, where('position', 'in', ['RB', 'WR', 'TE']), limit(1500))
            : query(playersRef, where('position', '==', requiredPos), limit(1000));

        const snapshot = await getDocs(q);
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setModalPlayers(players);

    } catch (err) {
        console.error("Error fetching candidates:", err);
    }
  }, [activeRound, leagueScoring]); 

  useEffect(() => {
      if (isModalOpen && selectedSlot) {
          fetchPlayersForSlot(selectedSlot);
      }
  }, [isModalOpen, selectedSlot, fetchPlayersForSlot]);

  // JOIN LEAGUE
  const handleJoinLeague = async () => {
      if (!userId || !params.id || !authUser) return;
      try {
          const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
          const displayName = authUser.displayName || authUser.email?.split('@')[0] || 'New Member';
          await setDoc(memberRef, {
              username: displayName,
              joinedAt: new Date().toISOString(),
              scores: { Total: 0 }
          });
          setIsMember(true);
          setActiveTab('Selections');
      } catch (error) {
          console.error("Error joining league:", error);
      }
  };

  const handleShare = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  };

  const formatApiDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
  };

  const getRoundStatus = (roundKey: string) => {
    if (!systemWeek) return 'loading';
    const roundWeekNum = Number(ROUND_TO_WEEK_NUM[roundKey as keyof typeof ROUND_TO_WEEK_NUM]);
    const currentWeekNum = Number(systemWeek);

    if (roundWeekNum < currentWeekNum) return 'past'; 
    if (roundWeekNum > currentWeekNum) return 'future'; 
    return 'active'; 
  };

  const isRoundLocked = () => {
     return getRoundStatus(activeRound) !== 'active';
  };

  // --- UPDATED: GAME LOCK LOGIC (Handles "6:30P" and "2024-01-25") ---
  const isGameLocked = (player: any) => {
    const pTeam = player.team || player.Team;
    const game = games.find(g => g['Home Team'] === pTeam || g['Away Team'] === pTeam);
    
    if (!game || !game.Date || !game.Time) return false;

    // Parse Date: Handle "YYYYMMDD" (20260125) AND "YYYY-MM-DD" (2026-01-25)
    let dateStr = String(game.Date);
    let year, month, day;

    if (dateStr.includes('-')) {
        [year, month, day] = dateStr.split('-').map(Number);
        month = month - 1; // 0-index month for Date()
    } else {
        year = parseInt(dateStr.substring(0, 4));
        month = parseInt(dateStr.substring(4, 6)) - 1;
        day = parseInt(dateStr.substring(6, 8));
    }

    // Parse Time: Handle "3:00 P", "3:00P", "3:00 PM", "3:00PM"
    const timeStr = game.Time; 
    const match = timeStr.match(/(\d+):(\d+)\s*([APap][Mm]?)/);
    
    if (!match) return false; 

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3].toUpperCase(); // P, PM, A, AM

    if (modifier.startsWith('P') && hours < 12) hours += 12;
    if (modifier.startsWith('A') && hours === 12) hours = 0;

    // Construct Date: Assume Eastern Time (UTC-5)
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Use ISO Format with Offset
    const gameIsoString = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-05:00`;
    
    const gameDate = new Date(gameIsoString);
    const now = new Date();

    return now >= gameDate;
  };

  const getPlayerProj = (p: any) => {
    const roundData = p[ROUND_TO_DB_MAP[activeRound]];
    const keys = SCORING_KEYS[leagueScoring] || SCORING_KEYS['PPR'];
    return roundData ? Number(roundData[keys.proj] || 0) : 0;
  };

  const getPlayerActual = (p: any) => {
    const roundData = p[ROUND_TO_DB_MAP[activeRound]];
    const keys = SCORING_KEYS[leagueScoring] || SCORING_KEYS['PPR'];
    return roundData ? Number(roundData[keys.act] || 0) : 0;
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

  const filteredPlayersList = useMemo(() => {
    const activeTeams = new Set<string>();
    games.forEach(g => {
      if (g['Home Team']) activeTeams.add(g['Home Team']);
      if (g['Away Team']) activeTeams.add(g['Away Team']);
    });
    
    return modalPlayers
      .filter(p => {
        const pTeam = p.team || p.Team;
        const teamMatch = activeTeams.has(pTeam);
        const name = (p.name || p.longName || p.Name || "").toLowerCase();
        const searchMatch = name.includes(searchTerm.toLowerCase());
        return teamMatch && searchMatch;
      })
      .sort((a, b) => getPlayerProj(b) - getPlayerProj(a)); 
  }, [modalPlayers, searchTerm, games, activeRound, leagueScoring]);

  // HANDLE SELECT PLAYER
  const handleSelectPlayer = async (player: any) => {
    if (previouslySelectedIds.has(player.id)) return;
    if (currentRoundIds.has(player.id) && lineup[selectedSlot!]?.id !== player.id) return;
    if (!selectedSlot || !userId) return;
    
    // Check Locks
    if (isRoundLocked()) return;
    if (isGameLocked(player)) {
        alert("This game has already started! Selections are locked.");
        return;
    }

    const dbKey = DB_LINEUP_KEYS[activeRound];
    const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
    try {
      setLineup(prev => ({ ...prev, [selectedSlot]: player }));
      await setDoc(memberRef, { [dbKey]: { [selectedSlot]: player.id } }, { merge: true });
      setIsModalOpen(false);
      setSearchTerm('');
    } catch (err) { console.error("Save error:", err); }
  };

  const handleRemovePlayer = async (slotId: string, e: React.MouseEvent, player: any) => {
    e.stopPropagation();
    if (!userId) return;
    
    // Check Locks
    if (isRoundLocked()) return;
    if (player && isGameLocked(player)) {
        alert("Cannot remove player. Their game has already started.");
        return;
    }

    const dbKey = DB_LINEUP_KEYS[activeRound];
    const memberRef = doc(db, 'leagues', params.id as string, 'Members', userId);
    try {
        const newLineup = { ...lineup };
        delete newLineup[slotId];
        setLineup(newLineup);
        await updateDoc(memberRef, {
            [`${dbKey}.${slotId}`]: deleteField()
        });
    } catch (err) {
        console.error("Remove error:", err);
    }
  };
  
  // HANDLE PASSWORD SAVE
  const handleSavePassword = async () => {
    if (!params.id || !newPassword.trim()) return;
    try {
        const leagueRef = doc(db, 'leagues', params.id as string);
        await updateDoc(leagueRef, { password: newPassword.trim() });
        setLeaguePassword(newPassword.trim());
        setIsEditingPassword(false);
    } catch (error) {
        console.error("Error updating password:", error);
    }
  };

  const scoringLabel = (SCORING_KEYS[leagueScoring] || SCORING_KEYS['PPR']).label;

  const roundTotals = useMemo(() => {
    let totalAct = 0;
    let totalProj = 0;
    Object.values(lineup).forEach((p: any) => {
        if (p) {
            totalAct += getPlayerActual(p);
            totalProj += getPlayerProj(p);
        }
    });
    return {
        actual: totalAct.toFixed(2),
        projected: totalProj.toFixed(2)
    };
  }, [lineup, activeRound, leagueScoring]);

  const topUsers = useMemo(() => leaderboard.slice(0, 20), [leaderboard]);
  const currentUserData = useMemo(() => leaderboard.find(u => u.id === userId), [leaderboard, userId]);
  const isUserInTop = useMemo(() => topUsers.some(u => u.id === userId), [topUsers, userId]);

  const getUserDisplayName = (user: any) => {
      if (user.username) return user.username;
      if (user.id === userId && authUser) {
          return authUser.displayName || authUser.email?.split('@')[0] || 'Me';
      }
      return 'Unknown';
  };

  const commissionerName = useMemo(() => {
      if (!ownerId) return 'Unknown';
      const commish = leaderboard.find(m => m.id === ownerId);
      return commish ? (commish.username || 'Commissioner') : 'Commissioner';
  }, [leaderboard, ownerId]);

  const isCommissioner = userId === ownerId;

  return (
    <div className="relative pb-24 bg-[#020617] min-h-screen text-white font-sans overflow-x-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#22c55e]/5 to-transparent animate-scan opacity-30" />
      </div>

      <style jsx global>{`
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(300%); } }
        .animate-scan { animation: scan 12s linear infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="relative z-10">
        <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-[#334155]/40 shadow-lg">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-start gap-4">
             <button onClick={() => router.push('/hub')} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <ChevronLeft size={24} />
             </button>
             <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase">
                League<span className="text-[#22c55e]">Page</span>
             </h1>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-2 md:px-8 py-4 space-y-6">
          
          <div className="px-2 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-4xl font-black uppercase tracking-tight truncate pr-4">{leagueName}</h2>
              <span className="bg-[#064e3b] text-[#22c55e] px-2 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest border border-[#22c55e]/20 whitespace-nowrap">
                {leagueScoring}
              </span>
            </div>
          </div>

          <div className="flex border-b border-slate-800 overflow-x-auto no-scrollbar px-2 gap-4">
            {['Selections', 'Leaderboard', 'Details'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`pb-3 px-2 text-sm font-bold tracking-tight transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#22c55e] text-[#22c55e]' : 'border-transparent text-slate-500 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Selections' && (
            <div className="space-y-8">
              {!isMember ? (
                  <div className="max-w-md mx-auto mt-10 p-8 bg-slate-900/80 border border-[#22c55e] rounded-2xl text-center shadow-2xl backdrop-blur-md">
                      <Trophy className="mx-auto text-[#22c55e] mb-4" size={48} />
                      <h3 className="text-2xl font-black uppercase text-white mb-2">Join This League</h3>
                      <p className="text-slate-400 text-sm mb-6">You are viewing {leagueName}. Join now to build your lineup and compete!</p>
                      <button onClick={handleJoinLeague} className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#020617] font-black py-4 rounded-xl uppercase tracking-widest transition-transform hover:scale-[1.02]">
                          Join League
                      </button>
                  </div>
              ) : (
                  <>
                    <div className="flex justify-center">
                        <div className="grid grid-cols-2 md:flex gap-3 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700 shadow-xl w-full md:w-auto mx-auto">
                            {Object.keys(ROUND_TO_DB_MAP).map(r => {
                                const status = getRoundStatus(r);
                                const isActive = activeRound === r;
                                const isLocked = status !== 'active';
                                let statusColor = 'text-gray-500 hover:text-white bg-slate-950/50';
                                if (isActive) statusColor = 'bg-blue-600 text-white shadow-lg';
                                else if (status === 'active') statusColor = 'text-[#22c55e] hover:text-white border border-[#22c55e]/30';
                                return (
                                    <button key={r} onClick={() => setActiveRound(r as any)} className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all w-full md:w-auto ${statusColor}`}>
                                        {isLocked && <Lock size={12} />} {!isLocked && isActive && <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"/>} {r}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-3">Scheduled Games</h3>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x justify-center w-full">
                        {games.map((game) => {
                            const isCompleted = game.gameStatus === 'Completed' || game.gameStatus === 'Final';
                            const awayS = Number(game.awayScore || 0);
                            const homeS = Number(game.homeScore || 0);
                            return (
                            <div key={game.id} className="snap-center min-w-[45vw] md:min-w-[200px] p-4 bg-slate-900/60 border border-slate-700 rounded-2xl flex flex-col items-center gap-2 shadow-lg backdrop-blur-sm">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isCompleted ? 'text-[#22c55e]' : 'text-slate-500'}`}>{isCompleted ? 'Final' : `${formatApiDate(game.Date)} • ${game.Time}`}</span>
                                <div className="flex items-center justify-between w-full px-1">
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[10px] font-black uppercase text-white">{game['Away Team']}</span>
                                    {isCompleted && (<span className="text-sm font-black text-slate-400">{awayS}</span>)}
                                </div>
                                <span className="text-[9px] font-bold text-slate-800 mx-1">@</span>
                                <div className="flex flex-col items-center flex-1">
                                    <span className="text-[10px] font-black uppercase text-white">{game['Home Team']}</span>
                                    {isCompleted && (<span className="text-sm font-black text-slate-400">{homeS}</span>)}
                                </div>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto w-full px-2">
                        <div className="bg-slate-900/90 border-2 border-[#22c55e] rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-md">
                        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-end">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">Your Lineup</h3>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-2">
                                    {getRoundStatus(activeRound) === 'active' ? <span className="text-[#22c55e]">⚡ Open</span> : <span className="text-red-500">🔒 Locked</span>}
                                    {isLoadingLineup && <span className="text-blue-400 animate-pulse">Syncing...</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl md:text-3xl font-black text-white tracking-tighter tabular-nums">{roundTotals.actual}</div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Proj: <span className="text-[#22c55e]">{roundTotals.projected}</span></div>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-slate-800/50">
                            {POSITIONS.map(pos => {
                            const p = lineup[pos.id];
                            const locked = isRoundLocked() || (p && isGameLocked(p)); // Check BOTH round lock AND game lock
                            const matchup = p ? getMatchupInfo(p.team || p.Team) : null;
                            return (
                                <div key={pos.id} onClick={() => !locked && (setSelectedSlot(pos.id), setIsModalOpen(true))} className={`px-4 md:px-10 py-4 md:py-6 flex items-center group transition-all ${!locked ? 'cursor-pointer hover:bg-white/5' : 'opacity-60 cursor-not-allowed'}`}>
                                <div className="w-10 h-10 md:w-14 md:h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-[#22c55e]/50 transition-colors shrink-0">
                                    <span className="text-[10px] md:text-xs font-black text-slate-500 group-hover:text-[#22c55e]">{pos.label}</span>
                                </div>
                                <div className="flex-1 ml-4 md:ml-8 overflow-hidden">
                                    {p ? (
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-base md:text-xl font-bold text-white tracking-tight leading-tight truncate">{p.name || p.longName}</span>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span className="text-white font-black">{p.team}</span>
                                        <span className="text-slate-800">|</span>
                                        <span>{matchup?.opponent}</span>
                                        <span className="text-slate-800 hidden md:inline">|</span>
                                        <span className="text-[#22c55e] block md:inline">Proj: {getPlayerProj(p).toFixed(1)}</span>
                                        </div>
                                    </div>
                                    ) : (<span className="text-xs md:text-sm text-slate-600 font-bold uppercase tracking-[0.2em] italic">Assign {pos.name}</span>)}
                                </div>
                                <div className="flex items-center gap-3 md:gap-4 pl-2">
                                    <div className="text-xl md:text-3xl font-black text-white tracking-tighter tabular-nums">{p ? getPlayerActual(p).toFixed(1) : '0.0'}</div>
                                    {p && !locked && (<button onClick={(e) => handleRemovePlayer(pos.id, e, p)} className="p-2 bg-slate-800/50 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-lg transition-all" title="Remove"><Trash2 size={14} /></button>)}
                                    {locked && p && <Lock size={14} className="text-red-500"/>}
                                </div>
                                </div>
                            );
                            })}
                        </div>
                        </div>
                    </div>
                  </>
              )}
            </div>
          )}

          {activeTab === 'Leaderboard' && (
            <div className="max-w-5xl mx-auto w-full px-2">
                <div className="bg-slate-900/90 border-2 border-[#22c55e] rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-md">
                    <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-1">Leaderboard</h3>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top 20 Users • Sorted by Total Score</div>
                        </div>
                        <Trophy className="text-[#22c55e]" size={24} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">Rank</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">WC</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">DIV</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">CONF</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">SB</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[#22c55e] uppercase tracking-widest text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {!isUserInTop && currentUserData && (
                                    <>
                                        <tr className="bg-blue-900/20">
                                            <td className="px-6 py-4 text-sm font-black text-blue-400 tabular-nums">#{currentUserData.rank}</td>
                                            <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                                                {getUserDisplayName(currentUserData)} 
                                                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">{currentUserData.scores?.WildCard?.toFixed(1) || '0.0'}</td>
                                            <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">{currentUserData.scores?.Divisional?.toFixed(1) || '0.0'}</td>
                                            <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">{currentUserData.scores?.Conference?.toFixed(1) || '0.0'}</td>
                                            <td className="px-4 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">{currentUserData.scores?.Superbowl?.toFixed(1) || '0.0'}</td>
                                            <td className="px-6 py-4 text-lg font-black text-white text-right tabular-nums">{currentUserData.scores?.Total?.toFixed(1) || '0.0'}</td>
                                        </tr>
                                        <tr className="border-b-4 border-slate-800/50"><td colSpan={7} className="px-6 py-2 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Top 20 Leaderboard</td></tr>
                                    </>
                                )}
                                {topUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors ${user.id === userId ? 'bg-blue-900/10' : ''}`}>
                                        <td className={`px-6 py-4 text-sm font-black tabular-nums ${user.rank === 1 ? 'text-yellow-400' : 'text-slate-400'}`}>{user.rank}</td>
                                        <td className="px-4 py-4 font-bold text-white">
                                            {getUserDisplayName(user)} 
                                            {user.id === userId && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider ml-2">You</span>}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-500 text-right tabular-nums">{user.scores?.WildCard?.toFixed(1) || '0.0'}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-500 text-right tabular-nums">{user.scores?.Divisional?.toFixed(1) || '0.0'}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-500 text-right tabular-nums">{user.scores?.Conference?.toFixed(1) || '0.0'}</td>
                                        <td className="px-4 py-4 text-sm font-bold text-slate-500 text-right tabular-nums">{user.scores?.Superbowl?.toFixed(1) || '0.0'}</td>
                                        <td className="px-6 py-4 text-lg font-black text-[#22c55e] text-right tabular-nums">{user.scores?.Total?.toFixed(1) || '0.0'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'Details' && (
            <div className="max-w-3xl mx-auto w-full px-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#22c55e] text-xs font-black uppercase tracking-widest"><Crown size={14} /> Commissioner</div>
                        <div className="text-lg font-bold text-white truncate">{commissionerName}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#22c55e] text-xs font-black uppercase tracking-widest"><Trophy size={14} /> Scoring</div>
                        <div className="text-lg font-bold text-white">{leagueScoring}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#22c55e] text-xs font-black uppercase tracking-widest"><Users size={14} /> Members</div>
                        <div className="text-lg font-bold text-white">{leaderboard.length}</div>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[#22c55e] text-xs font-black uppercase tracking-widest"><Shield size={14} /> Privacy</div>
                        <div className="text-lg font-bold text-white">{leaguePrivacy}</div>
                    </div>
                    
                    <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2 col-span-2 md:col-span-1 md:col-start-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#22c55e] text-xs font-black uppercase tracking-widest"><Key size={14} /> Password</div>
                            {isCommissioner && !isEditingPassword && (
                                <button 
                                    onClick={() => {
                                        setNewPassword(leaguePassword);
                                        setIsEditingPassword(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-white transition-colors"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>

                        {isEditingPassword ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input 
                                    type="text" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 text-white text-sm px-2 py-1 rounded w-full font-mono focus:border-[#22c55e] outline-none"
                                />
                                <button onClick={handleSavePassword} className="text-[#22c55e] hover:text-[#16a34a]"><Save size={16} /></button>
                                <button onClick={() => setIsEditingPassword(false)} className="text-red-500 hover:text-red-400"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="text-lg font-bold text-white font-mono tracking-widest">{leaguePassword}</div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#22c55e]/10 rounded-full flex items-center justify-center text-[#22c55e]">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Invite Friends</h3>
                            <p className="text-xs text-slate-500">Share this link to invite others to join your league.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-2 rounded-xl">
                        <div className="flex-1 px-3 py-2 text-xs font-mono text-slate-400 truncate select-all">
                            {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
                        </div>
                        <button 
                            onClick={handleShare}
                            className={`p-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${isCopied ? 'bg-[#22c55e] text-[#020617]' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                        >
                            {isCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </div>
          )}

        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/95 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-xl rounded-[2rem] flex flex-col max-h-[85vh] border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex justify-between items-center mb-4"><h3 className="font-black text-white uppercase tracking-widest text-[10px] text-[#22c55e]">Selection: {selectedSlot}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button></div>
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input autoFocus placeholder="SEARCH PLAYERS..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-white uppercase tracking-widest focus:border-[#22c55e] outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar border-t border-slate-800/50">
              {filteredPlayersList.length === 0 && modalPlayers.length === 0 ? (<div className="p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Loading available players...</div>) : (
                filteredPlayersList.map(p => {
                    const isPrevUsed = previouslySelectedIds.has(p.id);
                    const isCurrUsed = currentRoundIds.has(p.id) && lineup[selectedSlot!]?.id !== p.id;
                    const isGameLockedForPlayer = isGameLocked(p);
                    const isDisabled = isPrevUsed || isCurrUsed || isGameLockedForPlayer;
                    return (
                        <button key={p.id} onClick={() => !isDisabled && handleSelectPlayer(p)} disabled={isDisabled} className={`w-full text-left p-5 rounded-2xl flex justify-between items-center group transition-all border ${isDisabled ? 'bg-slate-900/50 border-transparent opacity-50 cursor-not-allowed' : 'hover:bg-white/5 border-transparent hover:border-[#22c55e]/30'}`}>
                        <div className="flex items-center space-x-5">
                            <div className={`text-[10px] font-black w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isDisabled ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-500 group-hover:border-[#22c55e]'}`}>{p.position}</div>
                            <div>
                                <div className="flex items-center gap-2"><div className={`text-base font-bold tracking-tight leading-none transition-colors ${isDisabled ? 'text-slate-500' : 'text-white group-hover:text-[#22c55e]'}`}>{p.name || p.longName}</div>
                                    {isPrevUsed && (<span className="text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">Previously Selected</span>)}
                                    {isCurrUsed && (<span className="text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1"><AlertCircle size={10} /> Active in Lineup</span>)}
                                    {isGameLockedForPlayer && (<span className="text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1"><Lock size={10} /> LOCKED</span>)}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-2 flex items-center gap-2"><span className={isDisabled ? 'text-slate-600' : 'text-white font-black'}>{p.team}</span><span className="text-slate-800">•</span><span>{getMatchupInfo(p.team).opponent}</span></div>
                            </div>
                        </div>
                        <div className="text-right border-l border-slate-800 pl-6"><div className={`text-xl font-black tracking-tighter tabular-nums ${isDisabled ? 'text-slate-600' : 'text-[#22c55e]'}`}>{getPlayerProj(p).toFixed(1)}</div><div className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Proj {scoringLabel}</div></div>
                        </button>
                    );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}