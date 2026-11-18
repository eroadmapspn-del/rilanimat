import io
import subprocess

import pytest

from reelstudio.api import create_app
from reelstudio.config import load_settings
from reelstudio.media.ffmpeg import FFMPEG
from reelstudio.services import build_services


def fake_renderer(remotion_dir, props_file, public_dir, out_file, *, draft=False, on_progress=lambda p: None):
    """Stands in for Remotion: checks the staged files exist and writes a placeholder 'video'."""
    import json

    props = json.loads(props_file.read_text(encoding="utf-8"))
    for scene in props["scenes"]:
        for key in ("image", "clip"):
            if scene[key]:
                assert (public_dir / scene[key]).exists(), f"missing staged file {scene[key]}"
    assert (public_dir / props["voice"]).exists()
    on_progress(50)
    out_file.write_bytes(b"fake-mp4")
    on_progress(100)


@pytest.fixture
def settings(tmp_path):
    base = load_settings(tmp_path / "no.env")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "bag.jpg").write_bytes(b"\xff\xd8\xff fake jpeg")
    return base.with_overrides(provider="fake", data_dir=tmp_path / "projects", assets_dir=assets)


@pytest.fixture
def services(settings):
    return build_services(settings, renderer=fake_renderer, synchronous=True)


@pytest.fixture
def client(settings, services):
    app = create_app(settings, services)
    app.config["TESTING"] = True
    return app.test_client()


@pytest.fixture
def tiny_video(tmp_path):
    path = tmp_path / "clip.mp4"
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=10:duration=1",
         "-pix_fmt", "yuv420p", str(path)],
        check=True,
    )
    return path


def file_part(path, name=None):
    return (io.BytesIO(path.read_bytes()), name or path.name)
