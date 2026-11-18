"""HTTP layer: thin Flask routes that call services and return JSON."""
from .app import create_app

__all__ = ["create_app"]
