# RoadSense AI — FastAPI Main Entrypoint

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.exceptions import http_exception_handler, generic_exception_handler
from app.api.v1.router import api_router
from loguru import logger

# 1. Initialize Sentry Error Tracking if DSN is provided
if settings.SENTRY_DSN:
    try:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            environment=settings.ENVIRONMENT,
            traces_sample_rate=1.0 if settings.ENVIRONMENT == "development" else 0.2
        )
        logger.info("Sentry monitoring initialized successfully.")
    except Exception as e:
        logger.error(f"Sentry initialization failed: {e}")

# 2. Setup SlowAPI Rate Limiter
limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=[f"{settings.RATE_LIMIT_PER_MIN}/minute"]
)

# 3. Create FastAPI app
app = FastAPI(
    title="RoadSense AI",
    description="Enterprise Road Safety Education & Evaluation Platform Backend API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None
)

# Attach rate limiter to app state and register handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. CORS Middleware Configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Register Routes and Routers
app.include_router(api_router, prefix="/api/v1")

# 6. Register Custom Global Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

@app.get("/")
def read_root():
    """
    Root status check endpoint.
    """
    return {
        "platform": "RoadSense AI",
        "status": "active",
        "api_version": "v1.0.0",
        "environment": settings.ENVIRONMENT
    }

logger.info(f"RoadSense AI API service started in {settings.ENVIRONMENT} mode.")
