# RoadSense AI — API v1 Router Definition

from fastapi import APIRouter
from app.api.v1.routes import analyze, scenarios, sessions, advisor, users, analytics

api_router = APIRouter()

api_router.include_router(analyze.router, prefix="/analyze", tags=["Analysis"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(advisor.router, prefix="/advisor", tags=["Advisor"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
