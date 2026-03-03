from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize the FastAPI app for the team
app = FastAPI(
    title="ScreenMind API",
    description="Backend for the ScreenMind Mental Health Mobile App",
    version="1.0.0"
)

# Allow the React Native app to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base route to verify the server is alive
@app.get("/")
def read_root():
    return {"status": "success", "message": "ScreenMind Backend is online and ready for the team!"}