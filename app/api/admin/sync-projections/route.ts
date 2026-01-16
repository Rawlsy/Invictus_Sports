import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader && authHeader.startsWith('Bearer cron_');
    
    if (!isCron && secret !== 'Touchdown2026') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- 1. CONFIGURATION (CORRECTED FOR 2026 REALITY) ---
    // Current Date: Jan 2026
    // Current Season: 2025
    // Upcoming Round: Divisional (Week 20)
    const targetSeason = searchParams.get('season') || '2025'; 
    const targetWeek = searchParams.get('week') || '20';

    console.log(`[Sync] 🚀 STARTING 2025 DIVISIONAL SYNC`);
    console.log(`[Sync] Target: Week ${targetWeek}, Season ${targetSeason}`);

    const headers = {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
    };

    // --- 2. FETCH PROJECTIONS (Use 'season', not 'archiveSeason') ---
    // We remove 'archiveSeason' because 2025 is the CURRENT active season.
    const projParams = new URLSearchParams({
        week: targetWeek,
        season: targetSeason, // <--- CHANGED FROM archiveSeason
        itemFormat: 'list',
        twoPointConversions: '2', passYards: '.04', passAttempts: '-.5', passTD: '4',
        passCompletions: '1', passInterceptions: '-2', pointsPerReception: '1',
        carries: '.2', rushYards: '.1', rushTD: '6', fumbles: '-2',
        receivingYards: '.1', receivingTD: '6', targets: '.1',
        fgMade: '3', fgMissed: '-1', xpMade: '1', xpMissed: '-1'
    });
    const projUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLProjections?${projParams.toString()}`;

    // --- 3. FETCH GAMES SCHEDULE ---
    const gamesUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLGamesForWeek?week=${targetWeek}&season=${targetSeason}`;

    console.log(`[Sync] 🔗 Fetching Projections: ${projUrl}`);

    const [projRes, gamesRes] = await Promise.all([
        fetch(projUrl, { method: 'GET', headers }),
        fetch(gamesUrl, { method: 'GET', headers })
    ]);

    const projData = await projRes.json();
    const gamesData = await gamesRes.json();

    // --- 4. PROCESS DATA ---
    const body = projData.body || {};
    let combinedList: any[] = [];

    // Process Players
    if (Array.isArray(body.playerProjections)) {
        combinedList = [...body.playerProjections];
    }

    // Process Defenses
    if (Array.isArray(body.teamDefenseProjections)) {
        const defenses = body.teamDefenseProjections.map((def: any) => ({
            playerID: `DEF_${def.teamAbv}`,
            longName: `${def.teamAbv} Defense`,
            team: def.teamAbv,
            pos: 'DEF',
            fantasyPoints: def.fantasyPointsDefault || def.fantasyPoints || 0
        }));
        combinedList = [...combinedList, ...defenses];
    }

    // Process Schedule
    let schedule: any[] = [];
    const rawGames = gamesData.body || [];
    if (Array.isArray(rawGames)) {
        schedule = rawGames.map((g: any) => ({
            id: g.gameID,
            home: g.homeTeam,
            away: g.awayTeam,
            date: g.gameDate,
            time: g.gameTime
        }));
    }

    console.log(`[Sync] ✅ Found ${combinedList.length} players and ${schedule.length} games.`);

    if (combinedList.length === 0 && schedule.length === 0) {
        return NextResponse.json({ 
            success: false, 
            message: `No data found for Week ${targetWeek} Season ${targetSeason}. API might be updating.` 
        });
    }

    // --- 5. SAVE TO FIREBASE ---
    // Map Week 20 (Divisional) -> nfl_post_week_2
    let docId = `nfl_reg_week_${targetWeek}`;
    if (parseInt(targetWeek) > 18) {
        const pIndex = parseInt(targetWeek) - 18;
        docId = `nfl_post_week_${pIndex}`;
    }

    // For testing: If you want to see this data in your "Wildcard" tab, keep this override.
    // Otherwise, remove it to save to the correct Divisional bucket.
    if (searchParams.get('round') === 'wildcard') {
        docId = 'nfl_post_week_1';
    }

    const docRef = doc(db, 'system_cache', docId);
    await setDoc(docRef, {
        lastUpdated: new Date().toISOString(),
        payload: { 
            players: combinedList,
            games: schedule 
        },
        meta: { week: targetWeek, season: targetSeason }
    });

    return NextResponse.json({ 
        success: true, 
        message: `Synced ${combinedList.length} players and ${schedule.length} games to ${docId} (Season ${targetSeason})`
    });

  } catch (error: any) {
    console.error("[Sync] 🔥 ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}