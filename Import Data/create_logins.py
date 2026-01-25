import firebase_admin
from firebase_admin import credentials, auth, firestore
import pandas as pd
import re

# --- CONFIGURATION ---
CSV_FILE = 'Fantasy Football 2026 - Divisional Round - Results.xlsx - Scoring.csv'
SERVICE_ACCOUNT_KEY = 'service-account.json'
DEFAULT_PASSWORD = "Touchdown2026"
EMAIL_DOMAIN = "@invictus.com"

# --- SETUP ---
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- ID GENERATOR (WITH HYPHENS) ---
def generate_user_id(username):
    clean = str(username).lower().strip()
    clean = re.sub(r'[^a-z0-9\s]', '', clean)
    return clean.replace(' ', '-') 

def create_logins():
    print(f"Reading {CSV_FILE}...")
    df = pd.read_csv(CSV_FILE, header=None)

    created_count = 0
    skipped_count = 0

    for col_idx in range(1, len(df.columns), 2):
        user_name = df.iloc[0, col_idx]
        
        if pd.isna(user_name) or str(user_name) == "0":
            continue

        # Generate ID (e.g. "adrian-salinas")
        uid = generate_user_id(user_name)
        fake_email = f"{uid}{EMAIL_DOMAIN}"

        print(f"Processing: {user_name} ({fake_email})...")

        try:
            user = auth.create_user(
                uid=uid,
                email=fake_email,
                email_verified=True,
                password=DEFAULT_PASSWORD,
                display_name=str(user_name).strip(),
                disabled=False
            )
            print(f"   ✅ Created Login! UID: {user.uid}")
            
            # Create root user doc
            db.collection('users').document(uid).set({
                'email': fake_email,
                'displayName': str(user_name).strip(),
                'createdAt': firestore.SERVER_TIMESTAMP
            }, merge=True)

            created_count += 1

        except auth.UidAlreadyExistsError:
            print(f"   ⚠️  Skipped: User already exists.")
            skipped_count += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")

    print(f"\nFinished! Created {created_count} new logins. Skipped {skipped_count} existing.")

if __name__ == "__main__":
    create_logins()