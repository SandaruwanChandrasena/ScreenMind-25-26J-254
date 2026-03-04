from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "success", "message": "Fusion API is online!"}