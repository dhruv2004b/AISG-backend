import json
import os
import whisper
import re

# ================= PATHS =================

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SCENES_PATH = os.path.join(
    BASE_DIR, "node-api", "data", "scenes.json"
)

AUDIO_DIR = os.path.join(
    BASE_DIR, "node-api", "assets", "audio"
)

CAPTIONS_DIR = os.path.join(
    BASE_DIR, "node-api", "captions"
)

os.makedirs(CAPTIONS_DIR, exist_ok=True)

# ========================================


def normalize_word(word):
    """Normalize words for matching."""
    return re.sub(r"[^\w']", "", word.lower())


def align_scene(scene, model):
    scene_id = scene["scene_id"]
    narration = scene["narration"]

    audio_path = os.path.join(AUDIO_DIR, f"scene_{scene_id}.mp3")
    output_path = os.path.join(CAPTIONS_DIR, f"scene_{scene_id}.json")

    print(f"Aligning scene {scene_id}...")

    # Run Whisper
    result = model.transcribe(
        audio_path,
        word_timestamps=True,
        language="en",
        initial_prompt=narration,
        condition_on_previous_text=False
    )

    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            text = normalize_word(w["word"])
            if not text:
                continue
            words.append({
                "text": w["word"].strip(),
                "start": round(w["start"], 3),
                "end": round(w["end"], 3)
            })

    if not words:
        raise RuntimeError(f"No words aligned for scene {scene_id}")

    # Group words in chunks of 3 (SwipeStory style)
    captions = []
    for i in range(0, len(words), 3):
        captions.append({
            "words": words[i:i + 3]
        })

    caption_json = {
        "scene_id": scene_id,
        "captions": captions
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(caption_json, f, indent=2)

    print(f"scene_{scene_id}.json written")


def main():
    print("Loading Whisper (small)...")
    model = whisper.load_model("small")

    with open(SCENES_PATH, "r", encoding="utf-8") as f:
        scenes_data = json.load(f)

    for scene in scenes_data["scenes"]:
        align_scene(scene, model)

    print("\nAll scenes aligned successfully.")


if __name__ == "__main__":
    main()
