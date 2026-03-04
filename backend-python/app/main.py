from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

# Initialize the FastAPI app
app = FastAPI(
    title="ScreenMind API",
    description="Backend for the ScreenMind Mental Health Mobile App",
    version="1.0.0"
)

# Allow React Native app to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include All Routes ───────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "ScreenMind Backend is online and ready for the team!"
    }