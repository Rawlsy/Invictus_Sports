import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 1. DEFINE & EXPORT THE INTERFACE (This fixes the build error)
export interface NFLPlayer {
  playerID: string;
  longName: string;
  team: string;
  pos: string;
  fantasyPoints: number;
}

// 2. HELPER: Map rounds/weeks to Firestore Doc IDs
function getDocId(roundOrWeek: string) {
  const playoffMap: Record<string, string> = {
    'wildcard': 'nfl_post_week_1',
    'divisional': 'nfl_post_week_2',
    'conference': 'nfl_post_week_3',
    'superbowl': 'nfl_post_week_4'
  };

  // If it's a known playoff round, return that ID
  if (playoffMap[roundOrWeek]) {
    return playoffMap[roundOrWeek];
  }
  
  // Otherwise, assume it is a regular season week number (e.g., "18", "1")
  return `nfl_reg_week_${roundOrWeek}`;
}

// 3. MAIN FUNCTION
export async function getNFLPlayers(roundOrWeek: string = 'wildcard'): Promise<NFLPlayer[]> {
  const docId = getDocId(roundOrWeek);
  console.log(`[API] Reading from Cache ID: ${docId}`);

  try {
    const docRef = doc(db, 'system_cache', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Handle both naming conventions just in case (projections vs playerProjections)
      const players = data.projections || data.playerProjections || [];
      console.log(`[API] ✅ Found ${players.length} players`);
      
      return players.map((p: any) => ({
        playerID: p.playerID,
        longName: p.longName || p.name || 'Unknown Player',
        team: p.team || 'FA',
        pos: p.pos || 'Flex',
        fantasyPoints: Number(p.fantasyPoints || p.projectedPoints || 0)
      }));
    }
    
    console.warn(`[API] ⚠️ Cache empty for ${docId}`);
    return [];

  } catch (error) {
    console.error(`[API] ❌ Firestore Read Error:`, error);
    return [];
  }
}