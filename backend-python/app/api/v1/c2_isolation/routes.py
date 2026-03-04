from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "success", "message": "Isolation API is online!"}