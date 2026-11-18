"""The story-first flow: topic -> story -> chat revisions -> approve -> script -> voice."""
STORY = {"mode": "story", "topic": "A lighthouse keeper who talks to the sea", "language": "English", "duration": "55"}


def make(client) -> str:
    r = client.post("/api/projects", data=STORY)
    assert r.status_code == 200, r.get_json()
    return r.get_json()["id"]


def get(client, pid):
    return client.get(f"/api/projects/{pid}").get_json()


def post(client, pid, path, **kw):
    return client.post(f"/api/projects/{pid}/{path}", **kw)


def test_topic_is_required(client):
    r = client.post("/api/projects", data={"mode": "story", "topic": " "})
    assert r.status_code == 400 and "about" in r.get_json()["error"]


def test_story_comes_first_and_gates_the_script(client):
    pid = make(client)
    s = get(client, pid)
    assert s["approved"] == {"story": False, "script": False, "voice": False, "scenes": False}
    assert post(client, pid, "script/generate").status_code == 400  # story not approved
    post(client, pid, "story/generate")
    s = get(client, pid)
    assert s["story"]["status"] == "done" and s["story"]["data"]["reel_cut"]
    assert s["story"]["messages"][-1]["role"] == "writer"
    assert post(client, pid, "script/generate").status_code == 400  # written, still not approved
    assert post(client, pid, "story/approve").status_code == 200
    assert post(client, pid, "script/generate").status_code == 200


def test_chat_revision_changes_story_and_unwinds_later_steps(client):
    pid = make(client)
    post(client, pid, "story/generate")
    post(client, pid, "story/approve")
    post(client, pid, "script/generate")
    post(client, pid, "script/approve")
    assert get(client, pid)["approved"]["script"] is True
    assert post(client, pid, "story/revise", json={"message": "  "}).status_code == 400
    assert post(client, pid, "story/revise", json={"message": "make it sadder"}).status_code == 200
    s = get(client, pid)
    assert "make it sadder" in s["story"]["data"]["logline"]
    assert [m["role"] for m in s["story"]["messages"]] == ["writer", "user", "writer"]
    assert s["approved"] == {"story": False, "script": False, "voice": False, "scenes": False}
    assert s["script"]["data"] is None


def test_story_script_has_text_scenes_and_allows_a_minute(client):
    pid = make(client)
    post(client, pid, "story/generate")
    post(client, pid, "story/approve")
    post(client, pid, "script/generate")
    scenes = get(client, pid)["script"]["data"]["scenes"]
    assert {s["template"] for s in scenes} == {"hook"} and all(s["image"] == "" for s in scenes)
    post(client, pid, "script/approve")
    post(client, pid, "voice/generate", json={"voice": "Kore"})
    assert get(client, pid)["voice"]["status"] == "done"
    assert any(p["title"] for p in client.get("/api/projects").get_json())


def test_story_step_is_refused_for_product_reels(client):
    r = client.post("/api/projects", data={"brand": "B", "product": "P"})
    pid = r.get_json()["id"]
    assert post(client, pid, "story/generate").status_code == 400


def test_reopening_the_story_clears_what_was_built_from_it(client):
    pid = make(client)
    post(client, pid, "story/generate")
    post(client, pid, "story/approve")
    post(client, pid, "script/generate")
    assert post(client, pid, "story/reopen").status_code == 200
    s = get(client, pid)
    assert s["story"]["data"] and s["script"]["data"] is None
    assert s["approved"]["story"] is False
