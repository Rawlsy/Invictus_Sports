import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface NFLPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  opponent?: string;
  projection: number;
  actualScore?: number;
}

export interface NFLGame {
  id: string;
  home: string;
  away: string;
  date: string;
  time: string;
}

function getDocId(roundOrWeek: string) {
  const playoffMap: Record<string, string> = {
    'wildcard': 'nfl_post_week_1',
    'divisional': 'nfl_post_week_2',
    'conference': 'nfl_post_week_3',
    'superbowl': 'nfl_post_week_4'
  };
  if (playoffMap[roundOrWeek]) return playoffMap[roundOrWeek];
  return `nfl_reg_week_${roundOrWeek}`;
}

// FIX: Return Type now includes Games
export async function getNFLPlayers(roundOrWeek: string = 'wildcard'): Promise<{ players: NFLPlayer[], games: NFLGame[] }> {
  const docId = getDocId(roundOrWeek);
  
  try {
    const docRef = doc(db, 'system_cache', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // 1. Get Players
      const rawPlayers = data.payload?.players || data.projections || [];
      const players = rawPlayers.map((p: any) => ({
        id: p.id || p.playerID, 
        name: p.name || p.longName || 'Unknown',
        team: p.team || 'FA',
        position: p.position || p.pos || 'FLEX',
        opponent: p.opponent || p.gameOpponent || 'BYE', 
        projection: Number(p.projectedPoints || p.fantasyPoints || p.projection || 0),
        actualScore: Number(p.actualScore || 0)
      }));

      // 2. Get Games (New)
      const rawGames = data.payload?.games || [];
      const games = rawGames.map((g: any) => ({
        id: g.id || g.gameID,
        home: g.home || g.homeTeam,
        away: g.away || g.awayTeam,
        date: g.date || g.gameDate,
        time: g.time || g.gameTime
      }));
      
      console.log(`[API] ✅ Loaded ${players.length} players and ${games.length} games from ${docId}`);
      return { players, games };
    }
    
    return { players: [], games: [] };

  } catch (error) {
    console.error(`[API] ❌ Firestore Read Error:`, error);
    return { players: [], games: [] };
  }
}