import sys
import os

# Add the apps/api folder to path so it resolves app.* imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.main import app
