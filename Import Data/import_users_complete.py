import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import datetime
import re

# --- CONFIGURATION ---
LEAGUE_ID = 'wtnd5Y0t5Tf4qFjc11DW' 
CSV_FILE = 'Fantasy Football 2026 - Divisional Round - Results.xlsx - Scoring.csv'
SERVICE_ACCOUNT_KEY = 'service-account.json'

# --- SETUP ---
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)
db = firestore.client()

def get_player_map():
    print("Fetching player database...")
    docs = db.collection('players').stream()
    player_map = {}
    for doc in docs:
        data = doc.to_dict()
        pid = doc.id
        if 'name' in data: player_map[data['name'].lower().strip()] = pid
        if 'longName' in data: player_map[data['longName'].lower().strip()] = pid
        # Map Defenses (e.g. "Texans" -> "HOU")
        if data.get('position') == 'DEF' and 'name' in data:
             team_part = data['name'].replace(' Defense', '').split(' ')[-1].lower()
             player_map[team_part] = pid
    print(f"Loaded {len(player_map)} players.")
    return player_map

def find_player_id(name, player_map):
    if pd.isna(name) or str(name).strip() in ["0", "No Player Selected"]: return None
    clean = str(name).lower().strip()
    if clean in player_map: return player_map[clean]
    
    # Fuzzy match
    for key, pid in player_map.items():
        if clean in key: return pid
    print(f"⚠️ Missing ID for: {name}")
    return None

def generate_user_id(username):
    clean = str(username).lower().strip()
    clean = re.sub(r'[^a-z0-9\s]', '', clean)
    return clean.replace(' ', '-')

def get_lineup_from_rows(df, col_idx, start_row, player_map):
    """Extracts a lineup from a specific block of rows."""
    return {
        "QB":   find_player_id(df.iloc[start_row, col_idx], player_map),
        "RB1":  find_player_id(df.iloc[start_row+1, col_idx], player_map),
        "RB2":  find_player_id(df.iloc[start_row+2, col_idx], player_map),
        "WR1":  find_player_id(df.iloc[start_row+3, col_idx], player_map),
        "WR2":  find_player_id(df.iloc[start_row+4, col_idx], player_map),
        "FLEX": find_player_id(df.iloc[start_row+5, col_idx], player_map),
        "TE":   find_player_id(df.iloc[start_row+6, col_idx], player_map),
        "DEF":  find_player_id(df.iloc[start_row+7, col_idx], player_map),
        "K":    find_player_id(df.iloc[start_row+8, col_idx], player_map),
    }

def import_data():
    player_map = get_player_map()
    print(f"Reading {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, header=None)

    batch = db.batch()
    batch_count = 0
    total_count = 0

    # Iterate columns (Users are in row 0, every other column starting at 1)
    for col_idx in range(1, len(df.columns), 2):
        user_name = df.iloc[0, col_idx]
        if pd.isna(user_name) or str(user_name) == "0": continue

        doc_id = generate_user_id(user_name)
        
        # 1. Extract Wild Card Lineup (Rows 1-9)
        wc_lineup = get_lineup_from_rows(df, col_idx, 1, player_map)
        
        # 2. Extract Divisional Lineup (Rows 13-21)
        div_lineup = get_lineup_from_rows(df, col_idx, 13, player_map)

        # 3. Prepare Data
        user_ref = db.collection('leagues').document(LEAGUE_ID).collection('Members').document(doc_id)
        
        member_data = {
            "username": str(user_name).strip(),
            "joinedAt": datetime.datetime.now().isoformat(),
            "scores": {"Total": 0.0},
            "Wild Card Lineup": wc_lineup,
            "Divisional Lineup": div_lineup
        }

        batch.set(user_ref, member_data, merge=True)
        
        batch_count += 1
        total_count += 1

        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0
            print(f"Saved {total_count} users...")

    if batch_count > 0:
        batch.commit()

    print(f"\n✅ SUCCESS: Imported {total_count} users with BOTH Wild Card and Divisional lineups.")

if __name__ == "__main__":
    import_data()