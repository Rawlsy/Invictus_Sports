import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper to determine the correct Document ID based on inputs
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

export async function getNFLPlayers(roundOrWeek: string = 'wildcard') {
  const docId = getDocId(roundOrWeek);
  console.log(`[API] Reading from Cache ID: ${docId}`);

  try {
    const docRef = doc(db, 'system_cache', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Handle both naming conventions just in case
      const players = data.projections || data.playerProjections || [];
      console.log(`[API] ✅ Found ${players.length} players`);
      
      return players.map((p: any) => ({
        playerID: p.playerID,
        longName: p.longName || p.name,
        team: p.team,
        pos: p.pos,
        fantasyPoints: p.fantasyPoints || p.projectedPoints || 0
      }));
    }
    
    console.warn(`[API] ⚠️ Cache empty for ${docId}`);
    return [];

  } catch (error) {
    console.error(`[API] ❌ Firestore Read Error:`, error);
    return [];
  }
}