from fastapi import APIRouter
router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "success", "message": "Screen Logs API is online!"}