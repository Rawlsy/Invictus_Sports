import { collection, getDocs } from 'firebase/firestore';
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

// Helper to Map Round Names to Keys
const ROUND_TO_WEEK_KEY: Record<string, string> = {
  'wildcard': 'wildcard',
  'divisional': 'divisional',
  'conference': 'conference',
  'superbowl': 'superbowl'
};

const ROUND_TO_WEEK_NUM: Record<string, number> = {
  'wildcard': 19,
  'divisional': 20,
  'conference': 21,
  'superbowl': 22
};

export async function getNFLPlayers(roundOrWeek: string = 'wildcard'): Promise<{ players: NFLPlayer[], games: NFLGame[] }> {
  try {
    // 1. FETCH GAMES from "Games Scheduled" Collection
    const gamesRef = collection(db, 'Games Scheduled');
    const gamesSnap = await getDocs(gamesRef);
    
    const games: NFLGame[] = gamesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        home: data['Home Team'] || 'TBD',
        away: data['Away Team'] || 'TBD',
        date: data['Date'] || '',
        time: data['Time'] || ''
      };
    });

    // 2. FETCH PLAYERS from "players" Collection
    const playersRef = collection(db, 'players');
    const playersSnap = await getDocs(playersRef);

    const players: NFLPlayer[] = playersSnap.docs.map(doc => {
      const p = doc.data();
      
      // Determine Projection/Score based on Round
      let projection = 0;
      let actualScore = 0;
      let opponent = 'BYE';

      if (p.weeks) {
        // Priority 1: Check by Round Name (e.g. "divisional")
        const roundKey = ROUND_TO_WEEK_KEY[roundOrWeek] || roundOrWeek;
        if (p.weeks[roundKey]) {
          projection = Number(p.weeks[roundKey].projected || p.weeks[roundKey].fantasyPoints || 0);
          actualScore = Number(p.weeks[roundKey].score || 0);
          opponent = p.weeks[roundKey].opponent || 'BYE';
        } 
        // Priority 2: Check by Week Number (e.g. "20") if name fails
        else {
          const weekNum = ROUND_TO_WEEK_NUM[roundOrWeek];
          // Check keys like "20", "week_20", "week20"
          const weekData = p.weeks[weekNum] || p.weeks[`week_${weekNum}`] || p.weeks[`week${weekNum}`];
          if (weekData) {
            projection = Number(weekData.projected || weekData.fantasyPoints || 0);
            actualScore = Number(weekData.score || 0);
            opponent = weekData.opponent || 'BYE';
          }
        }
      }

      // Fallback to root if nothing found (usually 0)
      if (projection === 0 && p.projectedPoints) projection = Number(p.projectedPoints);

      return {
        id: doc.id, 
        name: p.name || p.longName || 'Unknown',
        team: p.team || 'FA',
        position: p.position || p.pos || 'FLEX',
        opponent: opponent,
        projection: projection,
        actualScore: actualScore
      };
    });

    console.log(`[API] ✅ Loaded ${players.length} players and ${games.length} games.`);
    return { players, games };

  } catch (error) {
    console.error(`[API] ❌ Firestore Read Error:`, error);
    return { players: [], games: [] };
  }
}