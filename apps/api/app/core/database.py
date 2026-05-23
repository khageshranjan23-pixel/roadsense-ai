# RoadSense AI — Database Client Setup

from supabase import create_client, Client
from app.core.config import settings
from loguru import logger

supabase_client: Client = None

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        logger.info("Supabase Client initialized successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize Supabase Client: {e}")
else:
    logger.warning("Supabase configuration is incomplete. Database operations are offline.")
