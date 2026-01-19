import { NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetWeek = searchParams.get('week') || '19'; 
    const secret = searchParams.get('secret');

    if (secret !== 'Touchdown2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.RAPIDAPI_KEY || '85657f0983msh1fda8640dd67e05p1bb7bejsn3e59722b8c1e';
    
    // Tank01 gameWeek for post-season: 19->1, 20->2, etc.
    const apiGameWeek = (parseInt(targetWeek) - 18).toString(); 

    // 1. Optimized API Call for scores only
    const url = `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLScoresOnly?gameWeek=${apiGameWeek}&season=2025&seasonType=post`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
      }
    });

    const data = await response.json();
    
    // The response for getNFLScoresOnly is an object keyed by gameIDs
    const gamesData = data.body || {};
    const gameIDs = Object.keys(gamesData);

    if (gameIDs.length === 0) {
      return NextResponse.json({ success: false, message: `No score data found for week ${targetWeek}` });
    }

    const batch = writeBatch(db);
    const weekPath = `Games Scheduled/Weeks/Week ${targetWeek}`;

    gameIDs.forEach((gameID) => {
      const gameInfo = gamesData[gameID];
      const gameRef = doc(db, weekPath, gameID);
      
      // Update the specific game document with final results
      batch.update(gameRef, {
        awayScore: gameInfo.awayPts || "0",
        homeScore: gameInfo.homePts || "0",
        gameStatus: gameInfo.gameStatus || "Final",
        // Logic to determine winner for display purposes
        winner: Number(gameInfo.homePts) > Number(gameInfo.awayPts) ? gameInfo.home : gameInfo.away
      });
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Updated scores for ${gameIDs.length} games in ${weekPath}` 
    });

  } catch (error: any) {
    console.error("Score Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}