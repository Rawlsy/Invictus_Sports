import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 1. DEFINE THE INTERFACE
export interface NFLPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  opponent?: string;
  projection: number;
  actualScore?: number;
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
      
      // --- CRITICAL FIX: CHECK ALL POSSIBLE PATHS ---
      // Your screenshot shows the data is inside "payload.players"
      const rawPlayers = 
        data.payload?.players ||  // Check inside payload folder (NEW)
        data.projections ||       // Check root level
        data.playerProjections || // Check legacy name
        [];
      
      console.log(`[API] ✅ Loading ${rawPlayers.length} players from ${docId}`);

      // 4. MAP DATA TO MATCH YOUR PAGE INTERFACE
      return rawPlayers.map((p: any) => ({
        // Handle both ID formats
        id: p.id || p.playerID, 
        
        // Handle name formats
        name: p.name || p.longName || 'Unknown',
        
        // Handle Team/Pos
        team: p.team || 'FA',
        position: p.position || p.pos || 'FLEX',
        
        // Handle Opponent (Tank01 often sends 'opponent' or 'gameOpponent')
        opponent: p.opponent || p.gameOpponent || 'BYE', 
        
        // Handle Scores (projectedPoints vs fantasyPoints)
        projection: Number(p.projectedPoints || p.fantasyPoints || p.projection || 0),
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