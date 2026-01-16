import { NextResponse } from 'next/server';
import { getNFLPlayers } from '@/lib/nfl-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const round = searchParams.get('round') || 'wildcard';

  try {
    // FIX: Destructure both players and games from the library
    const { players, games } = await getNFLPlayers(round);

    return NextResponse.json({ players, games });
     
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ players: [], games: [] }, { status: 500 });
  }
}