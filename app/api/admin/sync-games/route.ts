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

    const apiKey = process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
    // Adjust week logic for Postseason API requirements
    const apiWeek = (parseInt(targetWeek) - 18).toString(); 

    const response = await fetch(
      `https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLGamesForWeek?week=${apiWeek}&season=2025&seasonType=post`,
      {
        headers: {
          'x-rapidapi-key': apiKey || '',
          'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com'
        }
      }
    );

    const data = await response.json();
    const gamesList = data.body && Array.isArray(data.body) ? data.body : [];

    if (gamesList.length === 0) {
      return NextResponse.json({ success: false, message: "No games found in API response" });
    }

    const batch = writeBatch(db);
    const weekSubcollectionPath = `Games Scheduled/Weeks/Week ${targetWeek}`;

    gamesList.forEach((game: any) => {
      const gameRef = doc(db, weekSubcollectionPath, game.gameID);
      
      // CRITICAL FIX: Use { merge: true } to protect existing scores/status
      batch.set(gameRef, {
        gameID: game.gameID,
        gameWeek: targetWeek,
        'Home Team': game.home,
        'Away Team': game.away,
        Date: game.gameDate, 
        Time: game.gameTime,
        Timestamp: game.gameTime_epoch 
      }, { merge: true }); // Only updates the listed fields
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${gamesList.length} games in ${weekSubcollectionPath}. Existing data (scores/status) was preserved.` 
    });

  } catch (error: any) {
    console.error("Games Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}