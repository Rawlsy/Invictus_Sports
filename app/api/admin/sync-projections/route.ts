import { NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';

// Force Next.js to run this fresh every time (no caching)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // --- 0. SECURITY CHECK ---
    // Allow if it's Vercel Cron (header) OR if you manually provided the secret key
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Note: Vercel sends "Bearer cron_..." automatically
    const isCron = authHeader && authHeader.startsWith('Bearer cron_');
    const isAdmin = secret === 'Touchdown2026'; // Your manual backdoor password

    if (!isCron && !isAdmin) {
       return NextResponse.json({ error: 'Unauthorized: Missing Vercel Cron header or Admin Secret' }, { status: 401 });
    }

    // --- 1. GET CURRENT NFL CONTEXT ---
    // Format today as YYYYMMDD for the API
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    console.log(`[Sync] 📡 Step 1: Fetching Current NFL Info for date: ${today}`);

    const infoUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLCurrentInfo?date=${today}`;
    const infoResponse = await fetch(infoUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
      }
    });

    const infoData = await infoResponse.json();
    const currentInfo = infoData.body; 

    if (!currentInfo) {
      throw new Error("Could not fetch NFL Current Info. API Key might be invalid.");
    }

    // Extract the "Real" Time from the API
    const currentWeek = currentInfo.week;         // e.g. "19"
    const currentSeason = currentInfo.season;     // e.g. "2025"
    const seasonType = currentInfo.seasonType;    // e.g. "post" or "reg"

    console.log(`[Sync] ⏱️ API Says: Week ${currentWeek}, Season ${currentSeason} (${seasonType})`);

    // --- 2. DETERMINE DATABASE DESTINATION ---
    let docId = '';
    
    if (seasonType === 'post' || parseInt(currentWeek) > 18) {
        // PLAYOFF MAPPING logic
        // Tank01: Week 19 = Wildcard (1), 20 = Div (2), 21 = Conf (3), 22 = SB (4)
        const playoffIndex = parseInt(currentWeek) - 18; 
        
        // Safety check: ensure index is valid (1-4)
        const safeIndex = Math.max(1, Math.min(playoffIndex, 4));
        
        docId = `nfl_post_week_${safeIndex}`;
        console.log(`[Sync] 🎯 Mode: Playoffs (Round ${safeIndex}) -> Saving to ${docId}`);
    } else {
        // REGULAR SEASON MAPPING logic
        docId = `nfl_reg_week_${currentWeek}`;
        console.log(`[Sync] 🎯 Mode: Regular Season -> Saving to ${docId}`);
    }

    // --- 3. FETCH PROJECTIONS ---
    console.log(`[Sync] 🏈 Step 2: Fetching Projections for Week ${currentWeek}...`);
    
    const projUrl = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLProjections?week=${currentWeek}&season=${currentSeason}&itemFormat=list`;
    
    const projResponse = await fetch(projUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '', 
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
      }
    });

    const projData = await projResponse.json();
    let cleanProjections = projData.body?.playerProjections || projData.body || [];

    // --- 4. SAVE TO FIREBASE ---
    // If API is empty, we log it but maybe don't overwrite the DB (optional safety)
    if (!Array.isArray(cleanProjections) || cleanProjections.length === 0) {
       console.warn(`[Sync] ⚠️ Warning: API returned 0 players.`);
       // We still return success so Cron doesn't retry infinitely, but we log the warning.
       return NextResponse.json({ success: true, message: `Week ${currentWeek} has 0 projections (Offseason?). DB not updated.` });
    }

    const docRef = doc(db, 'system_cache', docId);
    await setDoc(docRef, {
        lastUpdated: new Date().toISOString(),
        projections: cleanProjections,
        meta: {
            season: currentSeason,
            week: currentWeek,
            type: seasonType
        }
    });

    return NextResponse.json({ 
        success: true, 
        message: `Auto-Synced ${cleanProjections.length} players to ${docId}`,
        nflContext: { week: currentWeek, season: currentSeason, type: seasonType }
    });

  } catch (error: any) {
    console.error(`[Sync] 🔥 ERROR:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}