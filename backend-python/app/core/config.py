import os
import threading
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ─── Firebase Initialization ──────────────────────────────────────────────────
# Thread-safe singleton using double-checked locking pattern.
# Ensures Firebase is initialized only once even under concurrent requests
# or uvicorn --reload restarts during development.
# ─────────────────────────────────────────────────────────────────────────────
_db   = None
_lock = threading.Lock()


def get_firestore_client():
    global _db

    if _db is None:
        with _lock:                  # only one thread enters at a time
            if _db is None:          # double-check inside the lock
                cred_path = os.getenv(
                    "FIREBASE_CREDENTIAL_PATH",
                    "serviceAccountKey.json"
                )
                try:
                    if not firebase_admin._apps:
                        cred = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)
                except ValueError:
                    pass             # already initialized — safe to ignore

                _db = firestore.client()

    return _db