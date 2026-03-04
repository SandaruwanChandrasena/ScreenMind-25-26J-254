import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ─── Firebase Initialization ──────────────────────────────────────────────────
_db = None

def get_firestore_client():
    global _db

    if _db is None:
        cred_path = os.getenv("FIREBASE_CREDENTIAL_PATH", "serviceAccountKey.json")

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)

        _db = firestore.client()

    return _db