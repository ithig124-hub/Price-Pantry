import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import FastAPI app
from server import app

# Export for Vercel (Vercel expects 'app' or 'handler')
# Vercel's Python runtime handles ASGI apps directly
# No need for Mangum wrapper - Vercel handles it!

