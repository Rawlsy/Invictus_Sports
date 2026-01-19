import { NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader && authHeader.startsWith('Bearer cron_');
    
    // Security Check
    if (!isCron && secret !== 'Touchdown2026') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- 1. CONFIGURATION ---
    const targetSeason = searchParams.get('season') || '2025'; 
    const targetWeek = searchParams.get('week') || '20'; // Default to Divisional (Week 20)
    
    // Map Week Number to Database Field Name
    const roundMap: Record<string, string> = {
        '19': 'wildcard',
        '20': 'divisional',
        '21': 'conference',
        '22': 'superbowl'
    };
    const roundName = roundMap[targetWeek] || `week_${targetWeek}`;

    console.log(`[Score Sync] 🏈 Starting Actuals Update for ${roundName} (Week ${targetWeek})...`);

    const headers = {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
    };

    // --- 2. GET LIST OF GAME IDs FOR THE WEEK ---
    const scheduleUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLGamesForWeek?week=${targetWeek}&season=${targetSeason}&seasonType=post`; // Ensure seasonType=post for playoffs
    const schedRes = await fetch(scheduleUrl, { headers });
    const schedData = await schedRes.json();
    const games = schedData.body || [];

    if (games.length === 0) {
        return NextResponse.json({ success: false, message: `No games found for Week ${targetWeek}.` });
    }

    console.log(`[Score Sync] Found ${games.length} games to process.`);

    // --- 3. LOOP GAMES & FETCH BOX SCORES ---
    let updatedCount = 0;
    
    // Firestore batches are limited to 500 writes. 
    // We'll commit and recreate the batch if we approach the limit.
    let batch = writeBatch(db);
    let batchOpCount = 0;

    // Your Exact Scoring Settings
    const scoringParams = new URLSearchParams({
        playByPlay: 'false',
        fantasyPoints: 'true', // Required to get the API to calc points
        twoPointConversions: '2',
        passYards: '.04',
        passAttempts: '0',
        passTD: '4',
        passCompletions: '0',
        passInterceptions: '-2',
        pointsPerReception: '0.5', // Half PPR per your snippet
        carries: '.2',             // 0.2 points per carry? (Uncommon but kept per snippet)
        rushYards: '.1',
        rushTD: '6',
        fumbles: '-2',
        receivingYards: '.1',
        receivingTD: '6',
        targets: '0',
        defTD: '6',
        fgMade: '3',
        fgMissed: '-3', // Harsh penalty
        xpMade: '1',
        xpMissed: '-1',
        // IDP Settings
        idpTotalTackles: '0',
        idpSoloTackles: '0',
        idpTFL: '0',
        idpQbHits: '0',
        idpInt: '0',
        idpSacks: '0',
        idpPassDeflections: '0',
        idpFumblesRecovered: '0'
    });

    for (const game of games) {
        const gameID = game.gameID;
        
        // Skip games that haven't started (optional optimization)
        // if (game.gameStatus === 'Scheduled') continue;

        const boxUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLBoxScore?gameID=${gameID}&${scoringParams.toString()}`;
        
        console.log(`[Score Sync] Fetching Box Score: ${game.awayTeam} @ ${game.homeTeam}`);
        
        const boxRes = await fetch(boxUrl, { headers });
        const boxData = await boxRes.json();
        const playerStats = boxData.body?.playerStats || {};

        // Loop through every player in this game
        for (const pid of Object.keys(playerStats)) {
            const pData = playerStats[pid];
            
            // The API calculates 'fantasyPoints' based on params above
            // Force Number() to ensure math works later
            const actualScore = Number(pData.fantasyPoints || 0);

            // Only update if we have a valid player object
            if (pData) {
                const playerRef = doc(db, 'players', pid);
                
                // Use setDoc with merge: true. 
                // This creates the doc if missing, or updates just the specific fields if it exists.
                // It safely updates `weeks.divisional.score` without deleting `weeks.divisional.projected`.
                batch.set(playerRef, {
                     weeks: {
                        [roundName]: {
                            score: actualScore
                        }
                     }
                }, { merge: true });

                updatedCount++;
                batchOpCount++;

                // Commit and reset batch if full (Limit is 500)
                if (batchOpCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchOpCount = 0;
                }
            }
        }
    }

    // --- 4. COMMIT REMAINING WRITES ---
    if (batchOpCount > 0) {
        await batch.commit();
        console.log(`[Score Sync] ✅ Successfully committed final batch.`);
    }

    return NextResponse.json({ 
        success: true, 
        message: `Updated actual scores for ${updatedCount} players in ${roundName} (Week ${targetWeek})` 
    });

  } catch (error: any) {
    console.error("[Score Sync] 🔥 ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}