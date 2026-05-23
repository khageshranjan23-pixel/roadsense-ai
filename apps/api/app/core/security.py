# RoadSense AI — Security and Authentication Dependencies

from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.database import supabase_client
from loguru import logger

# Initialize HTTP Bearer security scheme
security_scheme = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """
    Dependency that extracts the JWT token from the Authorization header,
    validates it against Supabase Auth, and returns the User object.
    """
    token = credentials.credentials
    if not supabase_client:
        # Fallback for dev mode / tests without active connection
        logger.warning("Supabase offline - running in development/bypass mode")
        return {"id": "00000000-0000-0000-0000-000000000000", "email": "dev@roadsense.ai"}
        
    try:
        # Validate token against Supabase Auth
        auth_resp = supabase_client.auth.get_user(token)
        if not auth_resp or not auth_resp.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token."
            )
        return auth_resp.user
    except Exception as e:
        logger.error(f"JWT Validation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session authorization failed."
        )

async def get_current_profile(user = Depends(get_current_user)) -> dict:
    """
    Dependency that retrieves the user's database profile based on Auth ID.
    """
    if isinstance(user, dict) and user.get("id") == "00000000-0000-0000-0000-000000000000":
        return {
            "id": user["id"],
            "full_name": "Developer User",
            "role": "admin",
            "school_id": None
        }
        
    try:
        res = supabase_client.table("profiles").select("*").eq("id", user.id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database."
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile retrieval failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve user profile."
        )

def require_roles(allowed_roles: List[str]):
    """
    Dependency generator to restrict access to specific roles.
    """
    async def role_dependency(profile: dict = Depends(get_current_profile)):
        role = profile.get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: one of {allowed_roles}"
            )
        return profile
    return role_dependency
