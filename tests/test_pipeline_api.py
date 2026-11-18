"""The whole pipeline through the HTTP API, with fake providers and a fake renderer."""
import json

from conftest import file_part

BRIEF = {"brand": "Onomie", "product": "Pet backpack", "language": "Hinglish", "duration": "26", "use_saved": "1"}


def make_project(client) -> str:
    r = client.post("/api/projects", data=BRIEF)
    assert r.status_code == 200, r.get_json()
    return r.get_json()["id"]


def get(client, pid):
    return client.get(f"/api/projects/{pid}").get_json()


def post(client, pid, path, **kw):
    return client.post(f"/api/projects/{pid}/{path}", **kw)


def through_voice(client):
    pid = make_project(client)
    post(client, pid, "script/generate")
    post(client, pid, "script/approve")
    post(client, pid, "voice/generate", json={"voice": "Kore"})
    post(client, pid, "voice/approve")
    return pid


def test_steps_are_gated_in_order(client):
    pid = make_project(client)
    assert post(client, pid, "voice/generate").status_code == 400
    assert "Approve the script" in post(client, pid, "voice/generate").get_json()["error"]
    post(client, pid, "script/generate")
    assert post(client, pid, "voice/generate").status_code == 400  # script written but not approved
    post(client, pid, "script/approve")
    assert post(client, pid, "scenes/approve").status_code == 400
    assert post(client, pid, "final/build").status_code == 400


def test_project_uses_saved_photos_and_script_is_planned(client):
    pid = make_project(client)
    assert get(client, pid)["brief"]["images"] == ["bag.jpg"]
    post(client, pid, "script/generate")
    scenes = get(client, pid)["script"]["data"]["scenes"]
    assert len(scenes) == 6
    assert {s["template"] for s in scenes} <= {"hook", "full", "card", "feature"}
    assert all(s["image"] == "bag.jpg" for s in scenes if s["template"] != "hook")


def test_full_flow_renders_a_reel(client, services):
    pid = through_voice(client)
    state = get(client, pid)
    assert state["voice"]["status"] == "done" and state["slots"]
    assert abs(sum(state["slots"]) - state["voice"]["duration"]) < 0.01
    assert post(client, pid, "scenes/approve").status_code == 200
    assert post(client, pid, "final/build", json={"draft": True}).status_code == 200
    final = get(client, pid)["final"]
    assert final["status"] == "done" and final["progress"] == 100 and final["draft"] is True
    assert (services.ctx.repo.project_dir(pid) / final["file"].split("?")[0]).read_bytes() == b"fake-mp4"
    assert client.get(f"/files/{pid}/{final['file']}").status_code == 200


def test_editing_the_look_keeps_the_voice_but_needs_reapproval(client):
    pid = through_voice(client)
    post(client, pid, "scenes/approve")
    r = client.put(f"/api/projects/{pid}/scenes/plan",
                   json={"scenes": [{"id": 2, "template": "full", "headline": "New headline", "motion": "pan-up"}]})
    assert r.status_code == 200
    s = get(client, pid)
    assert s["approved"] == {"script": True, "voice": True, "scenes": False}
    scene = s["script"]["data"]["scenes"][1]
    assert scene["headline"] == "New headline" and scene["motion"] == "pan-up"
    bad = client.put(f"/api/projects/{pid}/scenes/plan", json={"scenes": [{"id": 2, "template": "nope"}]})
    assert bad.status_code == 400


def test_editing_the_words_resets_the_voice(client):
    pid = through_voice(client)
    data = get(client, pid)["script"]["data"]
    data["scenes"][0]["vo_text"] = "Kuch naya bolo."
    assert client.put(f"/api/projects/{pid}/script", json=data).status_code == 200
    s = get(client, pid)
    assert s["voice"]["file"] is None
    assert s["approved"] == {"script": False, "voice": False, "scenes": False}


def test_upload_clip_switches_scene_to_clip_template(client, tiny_video):
    pid = through_voice(client)
    r = post(client, pid, "scenes/3/upload", data={"file": file_part(tiny_video)}, content_type="multipart/form-data")
    assert r.status_code == 200, r.get_json()
    s = get(client, pid)
    assert s["script"]["data"]["scenes"][2]["template"] == "clip"
    assert s["scenes"]["3"]["source"] == "uploaded"
    assert post(client, pid, "scenes/approve").status_code == 200
    # removing the clip puts the scene back on a normal template
    assert client.delete(f"/api/projects/{pid}/scenes/3/clip").status_code == 200
    assert get(client, pid)["script"]["data"]["scenes"][2]["template"] != "clip"


def test_upload_rejects_non_video_and_too_many_clips(client, tiny_video, tmp_path):
    pid = through_voice(client)
    junk = tmp_path / "x.mp4"
    junk.write_bytes(b"not a video")
    bad = post(client, pid, "scenes/1/upload", data={"file": file_part(junk)}, content_type="multipart/form-data")
    assert bad.status_code == 400
    many = {"files": [file_part(tiny_video, f"{i}.mp4") for i in range(1, 8)]}
    assert post(client, pid, "scenes/upload-many", data=many, content_type="multipart/form-data").status_code == 400


def test_bulk_upload_fills_scenes_in_natural_order(client, tiny_video):
    pid = through_voice(client)
    files = {"files": [file_part(tiny_video, n) for n in ("10.mp4", "2.mp4", "1.mp4")]}
    r = post(client, pid, "scenes/upload-many", data=files, content_type="multipart/form-data")
    assert r.get_json()["filled"] == 3
    assert [get(client, pid)["scenes"][k]["status"] for k in ("1", "2", "3")] == ["done"] * 3


def test_own_voice_upload_is_converted(client, services, tmp_path):
    pid = make_project(client)
    post(client, pid, "script/generate")
    post(client, pid, "script/approve")
    wav = tmp_path / "mine.wav"
    services.ctx.voice_synth.synthesize("namaste", "", "Kore", wav, lambda m: None)
    r = post(client, pid, "voice/upload", data={"file": file_part(wav)}, content_type="multipart/form-data")
    assert r.status_code == 200
    v = get(client, pid)["voice"]
    assert v["source"] == "uploaded" and v["duration"] > 1
    junk = tmp_path / "junk.mp3"
    junk.write_bytes(b"nope")
    assert post(client, pid, "voice/upload", data={"file": file_part(junk)}, content_type="multipart/form-data").status_code == 400


def test_failed_job_is_reported_not_lost(client, services):
    pid = make_project(client)

    def boom(*a, **k):
        raise RuntimeError("model exploded")
    services.ctx.script_writer.write = boom
    post(client, pid, "script/generate")
    script = get(client, pid)["script"]
    assert script["status"] == "error" and "model exploded" in script["error"]


def test_unknown_project_is_404_and_config_reports_render_setup(client):
    assert client.get("/api/projects/nope").status_code == 404
    cfg = client.get("/api/config").get_json()
    assert set(cfg["render"]) == {"node", "installed"} and cfg["voices"]


def test_composition_matches_remotion_contract(client, services):
    from reelstudio.media.composition import build_composition, referenced_files

    pid = through_voice(client)
    project = services.ctx.repo.load(pid)
    props = build_composition(project, project["voice"]["duration"])
    assert props["voice"].startswith("final/voice_")
    assert props["endCard"]["seconds"] == 3.0
    assert all(s["words"] for s in props["scenes"])
    assert "images/bag.jpg" in referenced_files(props)
    json.dumps(props)  # must be serialisable
