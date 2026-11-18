import pytest

from reelstudio.domain import planning
from reelstudio.domain.project import blank_project, parse_brief
from reelstudio.domain.timing import scene_slots, word_timings
from reelstudio.domain.workflow import require_approved, reset_downstream, scene_problems
from reelstudio.errors import InvalidInput, WorkflowError


def test_scene_slots_sum_to_voice_length_and_follow_text():
    scenes = [{"vo_text": "aa bb"}, {"vo_text": "aaaa bbbb"}]
    slots = scene_slots(scenes, 12.0)
    assert sum(slots) == pytest.approx(12.0)
    assert slots[1] == pytest.approx(slots[0] * 2)


def test_word_timings_cover_scene_in_order():
    words = word_timings("namaste dosto", 4.0)
    assert [w["w"] for w in words] == ["namaste", "dosto"]
    assert words[0]["start"] == 0
    assert words[-1]["end"] == pytest.approx(4.0, abs=0.01)
    assert words[0]["end"] <= words[1]["start"] + 1e-6
    assert word_timings("", 3) == []


def test_brief_is_validated_and_clamped():
    brief = parse_brief({"brand": " Onomie ", "product": "bag", "duration": "99", "color": "nope"})
    assert brief["brand"] == "Onomie"
    assert brief["duration"] == 27
    assert brief["color"] == "#ff8a3d"
    with pytest.raises(InvalidInput):
        parse_brief({"brand": "", "product": "bag"})


def test_gates_block_out_of_order_steps():
    p = blank_project("x", {}, 0)
    with pytest.raises(WorkflowError):
        require_approved(p, "script")
    p["approved"]["script"] = True
    require_approved(p, "script")


def test_resetting_script_clears_everything_after_it():
    p = blank_project("x", {}, 0)
    p["approved"].update(script=True, voice=True, scenes=True)
    p["voice"].update(status="done", file="final/v.wav")
    p["scenes"]["1"] = {"status": "done"}
    reset_downstream(p, "script")
    assert p["approved"] == {"script": False, "voice": False, "scenes": False}
    assert p["voice"]["file"] is None
    assert p["scenes"]["1"]["status"] == "done"  # clips survive unless asked
    reset_downstream(p, "script", clear_clips=True)
    assert p["scenes"] == {}


def test_resetting_scenes_keeps_voice():
    p = blank_project("x", {}, 0)
    p["approved"].update(script=True, voice=True, scenes=True)
    p["voice"].update(status="done", file="final/v.wav")
    reset_downstream(p, "scenes")
    assert p["approved"] == {"script": True, "voice": True, "scenes": False}
    assert p["voice"]["file"] == "final/v.wav"


def test_normalize_repairs_a_sloppy_script():
    data = {"scenes": [{"vo_text": "a", "template": "banana", "image": "gone.jpg"}, {"vo_text": "b", "template": "clip"}]}
    out = planning.normalize_script(data, ["bag.jpg"])
    first, second = out["scenes"]
    assert first["template"] == "hook"
    assert first["image"] == "bag.jpg"  # unknown photo replaced by a real one
    assert second["template"] != "clip"  # no clip uploaded, so the clip template is refused
    assert first["motion"] in planning.MOTIONS


def test_scene_problems_flags_missing_clip_and_photo():
    p = blank_project("x", {}, 0)
    p["script"]["data"] = {"scenes": [
        {"id": 1, "template": "clip"}, {"id": 2, "template": "full", "image": ""}, {"id": 3, "template": "hook"},
    ]}
    problems = scene_problems(p)
    assert len(problems) == 2
    p["scenes"]["1"] = {"status": "done"}
    p["script"]["data"]["scenes"][1]["image"] = "bag.jpg"
    assert scene_problems(p) == []
