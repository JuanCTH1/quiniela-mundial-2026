"""Entry point para Vercel (Python serverless). Reexporta la app FastAPI."""
import sys
from pathlib import Path

# Permite importar el paquete `app` desde la raíz del repo.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

# Vercel detecta la variable `app` (ASGI) automáticamente.
