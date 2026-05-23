# RoadSense AI — Exception Handlers

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger

async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handles standard HTTPExceptions, logging them and returning a clean JSON structure.
    """
    logger.warning(f"HTTP {exc.status_code} error on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled runtime exceptions, preventing PII leaks while logging details.
    """
    logger.critical(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please contact system support."}
    )
