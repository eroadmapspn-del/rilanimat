"""Turn a Hindi shot description into an illustrated composition from the React art library.

This is a first draft made by keyword matching, not by understanding the sentence. It picks the location, up to three
props and up to three characters mentioned in the shot's subject (the text before the first danda). A person should look
at the result and change the `art` block in story.json where it misses the point.

The id lists below must match remotion/src/art/*.tsx (a test checks that).
"""
from __future__ import annotations

import unicodedata

CHARACTERS = ["MEERA", "KABIR", "RAHIM", "TARA", "NANDINI", "VIKRAM", "VINAY", "DEEPA", "ARJUN"]
LOCATIONS = ["clock-tower", "archive", "school", "tunnel", "clock-shop", "pump-station", "reservoir", "hospital",
             "radio-station", "platform", "siren-tower", "resort", "godown", "generic"]
PROPS = ["clock", "clock-ringing", "envelope", "recorder", "child-shadow", "files", "register", "photo", "map", "tape", "waveform",
         "lantern", "idcards", "gear", "siren", "window-shadows", "water", "headline", "diary", "screen", "phone"]

_PEOPLE = {"MEERA": ["मीरा"], "KABIR": ["कबीर"], "RAHIM": ["रहीम"], "TARA": ["तारा", "तारिका"], "NANDINI": ["नंदिनी"],
           "VIKRAM": ["विक्रम"], "VINAY": ["विनय"], "DEEPA": ["दीपा"], "ARJUN": ["अर्जुन"]}

# checked in this order; the first match wins
_PLACES = [
    ("pump-station", ["पंप"]), ("archive", ["अभिलेखागार"]), ("school", ["स्कूल", "पाठशाला", "कक्षा"]), ("tunnel", ["सुरंग"]),
    ("clock-shop", ["दुकान"]), ("reservoir", ["जलाशय", "नियंत्रण कक्ष", "बांध", "बाँध"]), ("hospital", ["अस्पताल", "कॉरिडोर"]),
    ("radio-station", ["रेडियो"]), ("platform", ["प्लेटफॉर्म", "रेलवे"]), ("siren-tower", ["टॉवर", "सायरन"]),
    ("resort", ["रिसॉर्ट"]), ("godown", ["गोदाम", "तहसील"]),
]
_PROPWORDS = [
    ("clock", ["घड़ी", "घड़ियाँ", "घंटी", "घडी"]), ("gear", ["तंत्र", "पुर्जा", "पीतल"]), ("envelope", ["लिफाफा"]),
    ("recorder", ["रिकॉर्डर"]), ("child-shadow", ["परछाई", "बच्ची", "बच्चे", "बच्चों", "हथेलियाँ", "बचपन"]),
    ("window-shadows", ["खिड़की", "साये"]), ("register", ["रजिस्टर", "हस्ताक्षर", "बयान", "आदेश", "कागज", "दस्तावेज", "सूची"]),
    ("files", ["फाइल", "फाइलें", "अलमारी"]), ("photo", ["तस्वीर", "फोटो"]), ("map", ["नक्शा", "नक्शों"]),
    ("tape", ["टेप", "रील", "मशीन"]), ("waveform", ["ध्वनि", "ऑडियो", "वेवफॉर्म", "आवाज"]), ("lantern", ["लालटेन"]),
    ("idcards", ["आईडी", "कार्ड", "पहचान"]), ("siren", ["सायरन"]), ("water", ["बाढ", "पानी", "जल"]),
    ("headline", ["समाचार", "सुर्खियाँ", "प्रेस"]), ("diary", ["डायरी"]), ("screen", ["वीडियो", "स्क्रीन", "लॉग", "डिजिटल"]),
    ("phone", ["फोन", "संदेश"]),
]
_SHADOW_WORDS = ["साये", "परछाई", "बिना चेहरे", "छाया"]
_RAIN_WORDS = ["बाढ", "बारिश", "तूफान"]


def _plain(text: str) -> str:
    """Drop the nukta dot, so लिफ़ाफ़ा and लिफाफा match whether it is written as one character or two."""
    return unicodedata.normalize("NFD", text).replace("़", "")


def _first_pos(text: str, words: list[str]) -> int | None:
    hits = [text.find(_plain(w)) for w in words]
    hits = [h for h in hits if h >= 0]
    return min(hits) if hits else None


def spec_for(prompt: str, voiceover: str = "") -> dict:
    """Return an `art` block for a shot. `prompt` is visual_prompt_hi; its first sentence is the subject."""
    subject = _plain(prompt.split("।")[0])

    people = sorted(((_first_pos(subject, names), cid) for cid, names in _PEOPLE.items() if _first_pos(subject, names) is not None))
    characters = [{"id": cid} for _, cid in people][:3]

    place = next((p for p, words in _PLACES if _first_pos(subject, words) is not None), None)
    # specific objects first; generic paper and screens only fill the remaining slots
    generic = {"register", "files", "headline", "screen", "water"}
    found = sorted((pid in generic, _first_pos(subject, words), pid) for pid, words in _PROPWORDS if _first_pos(subject, words) is not None)
    props = [pid for _, _, pid in found if pid != place][:3]
    if place is None:
        place = "clock-tower" if props[:1] == ["clock"] else "generic"
    if not props and not characters:
        props = ["clock"]  # every shot needs something to look at

    spec: dict = {"location": place, "props": [{"id": p} for p in props], "fog": 0.35, "dust": True}
    if characters:
        spec["characters"] = characters
        if any(w in _plain(subject) for w in _SHADOW_WORDS):
            for c in characters:
                c.update({"face": False, "shadow": 0.8})
    if any(_plain(w) in subject for w in _RAIN_WORDS):
        spec["rain"] = True
    return spec
