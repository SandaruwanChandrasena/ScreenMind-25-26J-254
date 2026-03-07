from fastapi import APIRouter
from app.api.v1.c1_screenlogs import routes as screenlogs_routes
from app.api.v1.c2_isolation import routes as isolation_routes
from app.api.v1.c3_sleep import routes as sleep_routes
from app.api.v1.c4_social_media import routes as social_media_routes
from app.api.v1.fusion import routes as fusion_routes

# ─── Main V1 Router ───────────────────────────────────────────────────────────
api_router = APIRouter()

# ─── C1: Screen Logs ──────────────────────────────────────────────────────────
api_router.include_router(
    screenlogs_routes.router,
    prefix="/screenlogs",
    tags=["C1 - Screen Logs"]
)

# ─── C2: Isolation / GPS ──────────────────────────────────────────────────────
api_router.include_router(
    isolation_routes.router,
    prefix="/isolation",
    tags=["C2 - Isolation"]
)

# ─── C3: Sleep Tracking ───────────────────────────────────────────────────────
api_router.include_router(
    sleep_routes.router,
    prefix="/sleep",
    tags=["C3 - Sleep"]
)

# Backward-compatible alias for existing clients
api_router.include_router(
    sleep_routes.router,
    prefix="/c3_sleep",
    tags=["C3 - Sleep"]
)

# ─── C4: Social Media Analysis ────────────────────────────────────────────────
api_router.include_router(
    social_media_routes.router,
    prefix="/social-media",
    tags=["C4 - Social Media Analysis"]
)

# ─── Fusion: Combined Score ───────────────────────────────────────────────────
api_router.include_router(
    fusion_routes.router,
    prefix="/fusion",
    tags=["Fusion - Combined Score"]
)