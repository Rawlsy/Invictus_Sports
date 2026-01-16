import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- TYPE DEFINITION (Optional) ---
interface PlayerData {
  player_id: string;
  name: string;
  position: string;
  team?: string;
  fantasyPoints?: number;
  projectedPoints?: number;
  // add other fields like opponent, status, etc.
}

/**
 * 1. SINGLE PLAYER UPDATE
 * uses the player_id as the Document ID.
 * If the doc exists, it updates it. If not, it creates it.
 */
export const updatePlayer = async (player: PlayerData) => {
  if (!player.player_id) {
    console.error("Cannot save player without a player_id");
    return;
  }

  // Reference: db -> players -> [player_id]
  const playerRef = doc(db, 'players', player.player_id);

  // Merge: true ensures we update the fields provided without deleting existing ones
  // (e.g. if you update points, you don't lose the player's photo URL)
  await setDoc(playerRef, player, { merge: true });
};

/**
 * 2. BULK UPDATE (BATCH)
 * Use this when pulling the entire NFL roster or weekly stats to save writes/time.
 * Firestore batches allow up to 500 writes at once.
 */
export const updatePlayersBulk = async (players: PlayerData[]) => {
  const batchSize = 500;
  
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = players.slice(i, i + batchSize);

    chunk.forEach((player) => {
      if (player.player_id) {
        const playerRef = doc(db, 'players', player.player_id);
        batch.set(playerRef, player, { merge: true });
      }
    });

    await batch.commit();
    console.log(`Saved batch of ${chunk.length} players.`);
  }
};