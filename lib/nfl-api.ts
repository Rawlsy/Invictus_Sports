import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 1. DEFINE THE INTERFACE (Matched EXACTLY to your League Page)
export interface NFLPlayer {
  id: string;          // Page expects 'id', not 'playerID'
  name: string;        // Page expects 'name', not 'longName'
  team: string;
  position: string;    // Page expects 'position', not 'pos'
  opponent?: string;   // Page tries to show "Team vs Opponent"
  projection: number;  // Page expects 'projection', not 'fantasyPoints'
  actualScore?: number;// Page handles 'actualScore'
}

// 2. HELPER: Map rounds to Firestore Doc IDs
function getDocId(roundOrWeek: string) {
  const playoffMap: Record<string, string> = {
    'wildcard': 'nfl_post_week_1',
    'divisional': 'nfl_post_week_2',
    'conference': 'nfl_post_week_3',
    'superbowl': 'nfl_post_week_4'
  };

  if (playoffMap[roundOrWeek]) {
    return playoffMap[roundOrWeek];
  }
  return `nfl_reg_week_${roundOrWeek}`;
}

// 3. MAIN FUNCTION
export async function getNFLPlayers(roundOrWeek: string = 'wildcard'): Promise<NFLPlayer[]> {
  const docId = getDocId(roundOrWeek);
  
  try {
    const docRef = doc(db, 'system_cache', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawPlayers = data.projections || data.playerProjections || [];
      
      console.log(`[API] ✅ Loading ${rawPlayers.length} players from ${docId}`);

      // 4. MAP DATA TO MATCH YOUR PAGE INTERFACE
      return rawPlayers.map((p: any) => ({
        id: p.playerID || p.id, 
        name: p.longName || p.name || 'Unknown',
        team: p.team || 'FA',
        position: p.pos || p.position || 'FLEX',
        opponent: p.gameOpponent || p.opponent || 'BYE', // Tank01 often has gameOpponent
        
        // Critical: Handle string/number conversion for scores
        projection: Number(p.fantasyPoints || p.projectedPoints || p.projection || 0),
        actualScore: Number(p.actualScore || 0)
      }));
    }
    
    console.warn(`[API] ⚠️ Cache empty for ${docId}`);
    return [];

  } catch (error) {
    console.error(`[API] ❌ Firestore Read Error:`, error);
    return [];
  }
}