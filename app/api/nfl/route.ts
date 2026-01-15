import { NextResponse } from 'next/server';
import { getNFLPlayers } from '@/lib/nfl-api';

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const round = searchParams.get('round') || 'wildcard';

  try {
    const players = await getNFLPlayers(round);

    // Mock Games (Your page needs these to not crash)
    const games = [
      { id: '1', home: 'BUF', away: 'MIA', date: '20260111', time: '1:00 PM' },
      { id: '2', home: 'CIN', away: 'CLE', date: '20260111', time: '4:30 PM' },
      { id: '3', home: 'HOU', away: 'IND', date: '20260111', time: '8:15 PM' },
      { id: '4', home: 'JAX', away: 'TEN', date: '20260112', time: '1:00 PM' },
    ];

    return NextResponse.json({ players, games });
     
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ players: [], games: [] }, { status: 500 });
  }
}