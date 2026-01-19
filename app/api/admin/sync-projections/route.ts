import { NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const targetWeek = searchParams.get('week') || '19';
    
    if (secret !== 'Touchdown2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roundMap: Record<string, string> = {
      '19': 'WildCard',
      '20': 'Divisional',
      '21': 'Conference',
      '22': 'Superbowl'
    };
    const roundName = roundMap[targetWeek.toString()] || `week_${targetWeek}`;

    const apiKey = '85657f0983msh1fda8640dd67e05p1bb7bejsn3e59722b8c1e';
    const url = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLProjections?week=${targetWeek}&season=2025&seasonType=post&itemFormat=map&twoPointConversions=2&passYards=.04&passTD=4&pointsPerReception=1&rushYards=.1&rushTD=6&receivingYards=.1&receivingTD=6`;
    
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
      }
    });

    const data = await response.json();
    
    // --- 1. TARGET THE CORRECT DATA MAPS ---
    // Skill players are in playerProjections
    const projectionsMap = data.body?.playerProjections || {}; 
    // Defenses are specifically in teamDefenseProjections
    const dstMap = data.body?.teamDefenseProjections || {}; 
    
    const batch = writeBatch(db);
    let count = 0;
    let dstCount = 0;

    // --- 2. REUSABLE PROCESSING FUNCTION ---
    const processEntry = (id: string, stats: any, isDST: boolean) => {
      if (!id || typeof stats !== 'object') return;

      // Extract scores correctly based on the entry type
      let pprVal = 0, halfVal = 0, stdVal = 0;

      if (isDST) {
        // DST uses a direct string for fantasyPointsDefault at the root level
        pprVal = Number(stats.fantasyPointsDefault || 0);
        halfVal = pprVal; 
        stdVal = pprVal;
      } else {
        // Skill players use a nested fantasyPointsDefault object
        const pts = stats.fantasyPointsDefault || {};
        pprVal = Number(pts.PPR || 0);
        halfVal = Number(pts.halfPPR || 0);
        stdVal = Number(pts.standard || 0);
      }

      const playerRef = doc(db, 'players', id);
      const team = stats.teamAbv || stats.team || "N/A";

      batch.set(playerRef, {
        name: isDST ? `${team} Defense` : (stats.longName || stats.name || "Unknown Player"),
        team: team,
        // Force "DEF" so the selection modal filter requiredPos === 'DEF' works
        position: isDST ? "DEF" : (stats.pos || stats.position || "N/A"),
        playerID: id,
        [roundName]: {
          Active: true,
          "Projected PPR": Number(pprVal.toFixed(2)),
          "Projected Half PPR": Number(halfVal.toFixed(2)),
          "Projected Standard": Number(stdVal.toFixed(2)),
          PPR: 0,
          Half: 0,
          Standard: 0,
          opponent: stats.opponent || "BYE"
        }
      }, { merge: true }); 
      
      count++;
    };

    // --- 3. RUN FOR BOTH MAPS ---
    Object.entries(projectionsMap).forEach(([pid, stats]) => processEntry(pid, stats, false));
    
    Object.entries(dstMap).forEach(([did, stats]: [string, any]) => {
      // Use teamAbv as the ID for defenses
      const id = stats.teamAbv || did; 
      processEntry(id, stats, true);
      dstCount++;
    });

    console.log(`[Sync] ⏳ Committing ${count} total entries (including ${dstCount} defenses) to ${roundName}...`);
    await batch.commit(); 
    console.log(`[Sync] ✅ Batch successfully committed.`);

    return NextResponse.json({ success: true, count, dstCount, round: roundName });

  } catch (err: any) {
    console.error("[Sync] 🔥 ERROR:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}