"""The production pipeline (story.json -> timings -> Remotion props -> review). Offline: no TTS service, no render."""
import json
import math
import struct
import wave

import pytest

from reelstudio.errors import InvalidInput
from reelstudio.production import review, story_file, timeline, voice


def tone_wav(path, pattern):
    """pattern: list of (seconds, loud). Loud stretches are a tone, quiet ones are silence."""
    rate = 16000
    frames = []
    for seconds, loud in pattern:
        for i in range(int(rate * seconds)):
            frames.append(int(9000 * math.sin(2 * math.pi * 300 * i / rate)) if loud else 0)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(b"".join(struct.pack("<h", v) for v in frames))
    return sum(s for s, _ in pattern)


def make_story(folder, texts):
    (folder / "images").mkdir(parents=True)
    (folder / "images" / "a.png").write_bytes(b"x")
    scenes = [{"text": t, "transition": "fade",
               "visual": {"file": "images/a.png", "source": "user", "camera": "push-in"}} for t in texts]
    story_file.save(folder, {"meta": {}, "scenes": scenes, "music": None, "sfx": []})


def test_pause_alignment_places_clauses_on_real_audio(tmp_path):
    wav = tmp_path / "v.wav"
    duration = tone_wav(wav, [(1.0, True), (0.6, False), (1.5, True), (0.7, False), (1.0, True)])
    words = voice.align_by_pauses("One two, three four five. Six".split(), wav, duration)
    assert words is not None and len(words) == 6
    assert words[0]["start"] == pytest.approx(0.0, abs=0.1) and words[1]["end"] == pytest.approx(1.0, abs=0.1)
    assert words[2]["start"] == pytest.approx(1.6, abs=0.1)  # after the real 0.6 s pause, not before
    assert words[5]["start"] == pytest.approx(3.8, abs=0.15)
    assert all(a["end"] <= b["start"] + 1e-6 for a, b in zip(words, words[1:], strict=False))


def test_pause_alignment_gives_up_when_punctuation_and_audio_disagree(tmp_path):
    wav = tmp_path / "v.wav"
    duration = tone_wav(wav, [(3.0, True)])  # no pauses at all
    assert voice.align_by_pauses("One, two, three.".split(), wav, duration) is None


def test_punctuation_is_restored_and_mismatch_is_reported():
    spoken = [{"w": "Hello", "start": 0, "end": 1}, {"w": "world", "start": 1, "end": 2}]
    words, notes = voice.restore_punctuation("Hello, world.", spoken)
    assert [w["w"] for w in words] == ["Hello,", "world."] and not notes
    _, notes = voice.restore_punctuation("Hello big world.", spoken)
    assert notes and "numbers" in notes[0]


def test_imported_audio_without_timings_is_flagged_not_called_measured(tmp_path):
    wav = tmp_path / "in.wav"
    tone_wav(wav, [(1.0, True), (0.6, False), (1.0, True)])
    info = voice.import_audio("Hello there. Goodbye now.", wav, tmp_path / "out.wav")
    assert info["timing"] in ("pause-aligned", "estimated") and info["notes"]


def test_timings_file_formats(tmp_path):
    a = tmp_path / "a.json"
    a.write_text(json.dumps({"words": [{"word": "Hi", "start": 0.1}, {"word": "you", "start": 0.5}]}))
    assert voice.read_timings_file(a)[1]["w"] == "you"
    a.write_text(json.dumps([{"w": "Hi"}]))
    with pytest.raises(InvalidInput):
        voice.read_timings_file(a)


def test_scene_times_come_from_the_audio(tmp_path):
    make_story(tmp_path, ["One two.", "Three four five."])
    story = story_file.load(tmp_path)
    words = [{"w": w, "start": s, "end": s + 0.4} for w, s in
             zip("One two. Three four five.".split(), [0.2, 0.7, 2.0, 2.5, 3.0], strict=True)]
    story["voice"] = {"file": "audio/voice.wav", "duration": 4.0, "timing": "measured", "words": words, "notes": []}
    props = timeline.build_props(story)
    s1, s2 = props["scenes"]
    assert (s1["start"], s1["end"]) == (0.0, 2.0) and s2["start"] == 2.0
    assert props["durationSeconds"] == pytest.approx(4.0 + timeline.TAIL_SECONDS)
    assert s1["mediaKind"] == "image"

    story["voice"]["words"] = words[:-1]  # the voice dropped a word: refuse rather than drift
    with pytest.raises(InvalidInput):
        timeline.build_props(story)


def test_stage_copies_only_referenced_files(tmp_path):
    make_story(tmp_path, ["One two."])
    (tmp_path / "audio").mkdir()
    (tmp_path / "audio" / "voice.wav").write_bytes(b"w")
    (tmp_path / "images" / "unused.png").write_bytes(b"u")
    story = story_file.load(tmp_path)
    story["voice"] = {"file": "audio/voice.wav", "duration": 2.0, "timing": "measured",
                      "words": [{"w": "One", "start": 0.1, "end": 0.5}, {"w": "two.", "start": 0.5, "end": 1.0}], "notes": []}
    story_file.save(tmp_path, story)
    _, public, _ = timeline.stage(tmp_path)
    assert sorted(p.relative_to(public).as_posix() for p in public.rglob("*") if p.is_file()) == ["audio/voice.wav", "images/a.png"]


def test_reviewer_flags_placeholders_cliches_and_missing_voice(tmp_path):
    make_story(tmp_path, ["In a world where nobody listens, nobody listens listens."])
    story = story_file.load(tmp_path)
    story["scenes"][0]["visual"]["source"] = "placeholder"
    story_file.save(tmp_path, story)
    text = "\n".join(str(x) for x in review.review_story(tmp_path))
    assert "placeholder" in text and "Generic phrase" in text and "Repeated word" in text and "No voice-over" in text
    assert review.has_errors(review.review_story(tmp_path))


def test_story_validation_rejects_unknown_camera_and_unlabelled_assets():
    bad = {"scenes": [{"text": "x", "transition": "wipe", "visual": {"file": "a.png", "camera": "spin"}}]}
    problems = "\n".join(story_file.problems(bad))
    assert "camera" in problems and "transition" in problems and "source" in problems


def test_hindi_danda_and_dash_are_pauses_and_matras_count_as_letters(tmp_path):
    assert voice._norm("आवाज़—") == "आवाज़" and len(voice._norm("मीरा।")) == 4
    tokens = "मीरा हँस दी। फिर चुप— हम सब".split()
    wav = tmp_path / "v.wav"
    duration = tone_wav(wav, [(1.2, True), (0.8, False), (0.8, True), (0.6, False), (1.0, True)])
    words = voice.align_by_pauses(tokens, wav, duration)
    assert words is not None and len(words) == len(tokens)
    assert words[3]["start"] == pytest.approx(2.0, abs=0.12) and words[5]["start"] == pytest.approx(3.4, abs=0.12)


def test_episode_import_keeps_narration_and_splits_glued_dashes(tmp_path):
    from reelstudio.production.importer import import_episode

    ep_dir = tmp_path / "season" / "episodes" / "ep-001"
    ep_dir.mkdir(parents=True)
    text1, text2 = "घंटी बजी। मीरा ने सुना।", "आवाज़—हमें क्यों?"
    ep = {"episode_id": "EP-001", "title_hi": "शीर्षक", "narration_hi": f"{text1} {text2}",
          "voiceover": {"pronunciation_notes": ["मीरा: मी-रा"]},
          "scenes": [{"scene_id": "S1", "visual_prompt_hi": "घड़ी", "animation": "slow_push_in", "voiceover_text": text1},
                     {"scene_id": "S2", "visual_prompt_hi": "लिफ़ाफ़ा", "animation": "parallax_left", "voiceover_text": text2}],
          "audience_engagement": {"question_hi": "कौन?"}, "continuity": {"arc": "I"}, "production": {"script_status": "draft"}}
    (ep_dir / "episode.json").write_text(json.dumps(ep, ensure_ascii=False), encoding="utf-8")
    with_cta = story_file.load(import_episode(tmp_path / "season", 1, tmp_path / "ep0"))  # default: ends by asking to follow
    assert len(with_cta["scenes"]) == 3 and "फॉलो" in with_cta["scenes"][-1]["text"] and story_file.problems(with_cta) == []
    out = import_episode(tmp_path / "season", 1, tmp_path / "ep1", with_cta=False)
    story = story_file.load(out)
    assert [s["visual"]["camera"] for s in story["scenes"]] == ["push-in", "pan-left"]
    assert "आवाज़— हमें" in story["scenes"][1]["text"] and story_file.problems(story) == []
    assert story["production"]["voice_status"] == "not_generated" and story["scenes"][0]["visual"]["file"] is None
    ep["scenes"][1]["voiceover_text"] = "कुछ और"
    (ep_dir / "episode.json").write_text(json.dumps(ep, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(InvalidInput):
        import_episode(tmp_path / "season", 1, tmp_path / "ep2")


def test_voice_that_pauses_where_the_script_has_no_punctuation_is_still_aligned(tmp_path):
    tokens = "एक दो तीन चार पाँच। छह सात".split()  # two clauses
    wav = tmp_path / "v.wav"
    # the voice also pauses inside the first clause (after word 2) and inside the second (after word 6)
    duration = tone_wav(wav, [(1.0, True), (0.5, False), (1.5, True), (0.9, False), (0.5, True), (0.5, False), (0.6, True)])
    words = voice.align_by_pauses(tokens, wav, duration)
    assert words is not None and len(words) == 7
    assert words[0]["start"] == pytest.approx(0.0, abs=0.1)
    assert words[5]["start"] >= 3.9 - 0.1  # the second clause starts after the 0.9 s sentence pause, not before it
    assert all(a["end"] <= b["start"] + 1e-6 for a, b in zip(words, words[1:], strict=False))
    assert not [w for w in words if 1.05 < w["start"] < 1.45]  # no word begins inside the silent gap (one may span it)


def test_art_ids_match_the_react_library():
    from pathlib import Path

    from reelstudio.production import artmap

    art = Path(__file__).resolve().parents[1] / "remotion" / "src" / "art"
    for ids, filename in ((artmap.LOCATIONS, "locations.tsx"), (artmap.PROPS, "props.tsx"), (artmap.CHARACTERS, "characters.tsx")):
        source = (art / filename).read_text(encoding="utf-8")
        for item in ids:
            assert f'"{item}"' in source or f"{item}:" in source, f"{item} is in artmap.py but not in {filename}"


def test_hindi_shot_descriptions_become_the_right_pieces():
    from reelstudio.production import artmap

    a = artmap.spec_for("आज की तारीख वाला भूरे कागज़ का लिफ़ाफ़ा। देवगढ़, उत्तर भारत")
    assert a["props"][0]["id"] == "envelope" and "rain" not in a  # a specific object beats generic paper
    b = artmap.spec_for("मीरा और कबीर सुरंग में बाढ़ का पानी देखते हुए। शैली")
    assert b["location"] == "tunnel" and [c["id"] for c in b["characters"]] == ["MEERA", "KABIR"] and b["rain"] is True
    c = artmap.spec_for("खिड़की से निकलते दो साये। शैली")
    assert c["props"][0]["id"] == "window-shadows"
    assert artmap.spec_for("कुछ और। शैली")["props"], "every shot gets something to show"


def test_shots_polls_and_reveal(tmp_path):
    from reelstudio.production import artmap
    from reelstudio.production.importer import _split_shots, import_episode, poll_line

    long = "मीरा ने घड़ी देखी। कबीर ने रिकॉर्डर चलाया। चौकीदार ने कहा कि द्वार बंद है। फिर किसी ने दरवाज़ा खटखटाया। सब चुप हो गए।"
    shots = _split_shots(long, max_words=8)
    assert len(shots) > 1 and " ".join(shots) == long  # cut at sentence ends, nothing lost
    base = artmap.spec_for("घड़ी का क्लोज़अप", long)
    spec = artmap.shot_for(base, "चौकीदार ने कहा कि द्वार बंद है।", 1)
    assert [c["id"] for c in spec["characters"]] == ["CHOWKIDAR"] and spec["view"] == "close"

    polls = tmp_path / "polls.json"
    poll = {"ask": "कहाँ?", "a": "कमरे में", "b": "सुरंग में", "answer": "b", "reveal": "सही जवाब बी।"}
    polls.write_text(json.dumps({"1": poll}, ensure_ascii=False), encoding="utf-8")
    ep_dir = tmp_path / "season" / "episodes"
    for n in (1, 2):
        (ep_dir / f"ep-{n:03d}").mkdir(parents=True)
        t = "घंटी बजी। मीरा ने सुना।"
        ep = {"episode_id": f"EP-{n:03d}", "title_hi": "शीर्षक", "narration_hi": t, "voiceover": {},
              "scenes": [{"scene_id": "S1", "visual_prompt_hi": "घड़ी", "animation": "static", "voiceover_text": t}],
              "audience_engagement": {"question_hi": "कौन?"}, "continuity": {"arc": "I"}, "production": {"script_status": "draft"}}
        (ep_dir / f"ep-{n:03d}" / "episode.json").write_text(json.dumps(ep, ensure_ascii=False), encoding="utf-8")
    one = story_file.load(import_episode(tmp_path / "season", 1, tmp_path / "e1", polls=polls))
    assert one["scenes"][-1]["text"] == poll_line(poll) and "ए)" in (tmp_path / "e1" / "pinned_comment.txt").read_text(encoding="utf-8")
    two = story_file.load(import_episode(tmp_path / "season", 2, tmp_path / "e2", polls=polls))
    assert two["scenes"][0]["text"] == "सही जवाब बी।" and story_file.problems(two) == []  # the answer opens the next episode
