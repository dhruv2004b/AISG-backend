from scene_video import render_scene, resolve_caption_style
import json
import os


BASE_DIR = os.path.dirname(__file__)

CAPTIONS_DIR = os.path.join(BASE_DIR, "../node-api/captions")
IMAGES_DIR = os.path.join(BASE_DIR, "../node-api/assets/images")
AUDIO_DIR = os.path.join(BASE_DIR, "../node-api/assets/audio")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ================= GLOBAL CAPTION STYLE =================
# User can modify these safely (all optional)

user_caption_style = {
    # Examples (uncomment what you want):
    "font_size": 46,
    "text_color": (255, 255, 255, 255),
    "highlight_color": (0, 255, 180, 255),
    "stroke_color": "black",
    "stroke_width": 8,
    "word_spacing": 22,
    "font_key": "montserrat_bold"
}

caption_style = resolve_caption_style(user_caption_style)
# =======================================================

scene_files = sorted([
    f for f in os.listdir(CAPTIONS_DIR)
    if f.startswith("scene_") and f.endswith(".json")
])

for scene_file in scene_files:
    scene_id = scene_file.replace("scene_", "").replace(".json", "")

    with open(os.path.join(CAPTIONS_DIR, scene_file), "r", encoding="utf-8") as f:
        scene_data = json.load(f)

    print(f"Rendering scene {scene_id}...")

    render_scene(
        scene=scene_data,
        image_path=os.path.join(IMAGES_DIR, f"scene_{scene_id}.jpg"),
        audio_path=os.path.join(AUDIO_DIR, f"scene_{scene_id}.mp3"),
        output_path=os.path.join(OUTPUT_DIR, f"scene_{scene_id}.mp4"),
        caption_style=caption_style   # 🔑 GLOBAL STYLE APPLIED
    )

print("All scenes rendered")
