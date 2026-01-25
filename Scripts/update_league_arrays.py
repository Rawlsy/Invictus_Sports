import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIGURATION ---
SERVICE_ACCOUNT_KEY = 'service-account.json'

# --- SETUP ---
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def backfill_members():
    print("🔍 Scanning all leagues...")
    
    # Get all leagues
    leagues = db.collection('leagues').stream()
    
    updated_count = 0

    for league in leagues:
        league_ref = db.collection('leagues').document(league.id)
        
        # 1. Fetch all members from the subcollection
        members_stream = league_ref.collection('Members').stream()
        
        # 2. Create a list of just the IDs (e.g., ['adrian-salinas', 'bob-smith'])
        member_ids = [member.id for member in members_stream]
        
        if member_ids:
            # 3. Write this list to the parent League document
            # 'memberIDs' will be the field we query against in the app
            league_ref.update({
                'memberIDs': member_ids,
                'memberCount': len(member_ids) # While we're at it, save the count too!
            })
            print(f"   ✅ Updated {league.id}: Added {len(member_ids)} IDs.")
            updated_count += 1
        else:
            print(f"   ⚠️  Skipped {league.id}: No members found.")

    print(f"\n🎉 Finished! Updated {updated_count} leagues.")

if __name__ == "__main__":
    backfill_members()