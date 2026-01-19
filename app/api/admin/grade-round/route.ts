import { NextResponse } from 'next/server';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const round = searchParams.get('round'); // e.g., 'WildCard' or 'Divisional'
    const secret = searchParams.get('secret');

    if (secret !== 'Touchdown2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!leagueId || !round) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // 1. Get all player scores for this round into a map
    const playersSnap = await getDocs(collection(db, 'players'));
    const scoreMap: Record<string, number> = {};
    playersSnap.docs.forEach(p => {
      const data = p.data();
      scoreMap[p.id] = Number(data[round]?.Score || 0);
    });

    // 2. Get all members in this league
    const membersRef = collection(db, 'leagues', leagueId, 'Members');
    const membersSnap = await getDocs(membersRef);
    const batch = writeBatch(db);

    // 3. Calculate and store the total for each member
    membersSnap.docs.forEach(memberDoc => {
      const data = memberDoc.data();
      const lineupKey = round === 'WildCard' ? 'Wild Card Lineup' : `${round} Lineup`;
      const lineup = data[lineupKey] || {};
      
      // Sum the scores of the players in the lineup
      const roundTotal = Object.values(lineup).reduce((sum: number, playerId: any) => {
        return sum + (scoreMap[playerId] || 0);
      }, 0);

      // Save the pre-calculated score back to the member
      batch.update(memberDoc.ref, {
        [`scores.${round}`]: roundTotal,
        // Optional: Update a running total for the whole playoffs
        [`scores.Total`]: (data.scores?.Total || 0) + roundTotal 
      });
    });

    await batch.commit();
    return NextResponse.json({ success: true, message: `Leaderboard updated for ${round}` });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}