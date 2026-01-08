import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import FastAPI app
from server import app

# Vercel expects either 'app' or 'handler'
# FastAPI apps work directly with Vercel's ASGI support

