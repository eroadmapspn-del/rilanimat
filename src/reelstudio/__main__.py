"""Start the app:  python -m reelstudio"""
from .api import create_app
from .config import load_settings


def main() -> None:
    settings = load_settings()
    app = create_app(settings)
    app.extensions["services"].ctx.repo.recover()
    missing = settings.missing()
    if missing:
        print(f"WARNING: missing in .env: {', '.join(missing)}")
    print(f"Reel Studio ({settings.provider} provider): http://{settings.host}:{settings.port}")
    app.run(host=settings.host, port=settings.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
