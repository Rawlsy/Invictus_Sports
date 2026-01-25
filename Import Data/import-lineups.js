const admin = require('firebase-admin');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// --- CONFIGURATION ---
const SERVICE_ACCOUNT = require('./service-account.json'); // Ensure this file exists
const LEAGUE_ID = 'YOUR_LEAGUE_ID_HERE'; // <--- PASTE YOUR LEAGUE ID HERE
const CSV_FILE = 'Fantasy Football 2026 - Divisional Round - Results.xlsx - Scoring.csv';

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT)
  });
}
const db = admin.firestore();

async function importData() {
  console.log("1. Fetching players from Database to build ID map...");
  const playersSnap = await db.collection('players').get();
  const playerMap = {};
  
  // Create a dictionary of "lowercase name" -> "player ID"
  playersSnap.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    
    // Map standard names
    if (data.name) playerMap[data.name.toLowerCase().trim()] = id;
    if (data.longName) playerMap[data.longName.toLowerCase().trim()] = id;
    
    // Map Defense Teams (e.g., "Texans" -> "HOU" if stored as "Houston Texans")
    if (data.position === 'DEF' && data.team) {
       playerMap[data.team.toLowerCase().trim()] = id; // Map abbreviation "HOU"
       // You might need manual mapping if CSV has "Texans" but DB has "Houston Texans"
       const teamName = data.name.replace(' Defense', '').toLowerCase().trim();
       playerMap[teamName] = id; 
    }
  });
  console.log(`   Mapped ${Object.keys(playerMap).length} player names.`);

  console.log("2. Reading CSV file...");
  const fileContent = fs.readFileSync(CSV_FILE);
  const records = parse(fileContent, {
    columns: false, 
    skip_empty_lines: true
  });

  // Row 0 contains User Names at indices 1, 3, 5...
  const headerRow = records[0];
  let successCount = 0;

  console.log("3. Processing Users...");
  
  // Iterate through columns (Users)
  for (let col = 1; col < headerRow.length; col += 2) {
    const userName = headerRow[col];
    if (!userName) continue;

    console.log(`   -> Creating user: ${userName}`);

    // Build Lineup Object based on CSV Row Index
    // Row 1: QB, Row 2: RB1, Row 3: RB2, Row 4: WR1, Row 5: WR2, Row 6: Flex, Row 7: TE, Row 8: DEF, Row 9: K
    const lineup = {
        QB:   getPlayerId(records[1][col], playerMap),
        RB1:  getPlayerId(records[2][col], playerMap),
        RB2:  getPlayerId(records[3][col], playerMap),
        WR1:  getPlayerId(records[4][col], playerMap),
        WR2:  getPlayerId(records[5][col], playerMap),
        FLEX: getPlayerId(records[6][col], playerMap),
        TE:   getPlayerId(records[7][col], playerMap),
        DEF:  getPlayerId(records[8][col], playerMap),
        K:    getPlayerId(records[9][col], playerMap),
    };

    // Create Member Document in Firebase
    try {
        await db.collection('leagues').doc(LEAGUE_ID).collection('Members').add({
            username: userName,
            joinedAt: new Date().toISOString(),
            scores: { Total: 0 }, // Initialize score
            "Divisional Lineup": lineup // Saving specifically to Divisional Round
        });
        successCount++;
    } catch (err) {
        console.error(`Error adding ${userName}:`, err);
    }
  }

  console.log(`\nSuccess! Imported ${successCount} users into League ${LEAGUE_ID}.`);
}

// Helper to find ID by Name
function getPlayerId(rawName, map) {
    if (!rawName || rawName === 'No Player Selected') return null;
    
    const cleanName = rawName.trim().toLowerCase();
    
    // 1. Direct Match
    if (map[cleanName]) return map[cleanName];

    // 2. Fuzzy Match (e.g. CSV has "Josh Allen" but DB has "Joshua Allen")
    // This finds the first key in the map that *contains* the CSV name
    const partialMatch = Object.keys(map).find(dbName => dbName.includes(cleanName) || cleanName.includes(dbName));
    if (partialMatch) return map[partialMatch];

    console.warn(`      WARNING: Could not find player ID for "${rawName}"`);
    return null;
}

importData();