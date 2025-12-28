import os
import random
from moviepy.editor import VideoFileClip, ImageClip
import subprocess

# ================= CONFIG =================

BASE_DIR = os.path.dirname(__file__)

OUTPUT_DIR = os.path.join(BASE_DIR, "output")
IMAGES_DIR = os.path.join(BASE_DIR, "../node-api/assets/images")

FINAL_OUTPUT = os.path.join(OUTPUT_DIR, "final_short.mp4")

WIDTH, HEIGHT = 1080, 1920

MAX_ZOOM = 0.04      # 4%
MAX_PAN = 30         # pixels

# ==========================================


def apply_background_motion(bg_clip, duration):
    """Apply subtle random motion to background only"""

    effect = random.choice(["zoom_in", "zoom_out", "pan_left", "pan_right"])

    if effect == "zoom_in":
        return bg_clip.resize(
            lambda t: 1 + MAX_ZOOM * (t / duration)
        )

    if effect == "zoom_out":
        return bg_clip.resize(
            lambda t: 1 + MAX_ZOOM * (1 - t / duration)
        )

    if effect == "pan_left":
        return bg_clip.set_position(
            lambda t: (-int(MAX_PAN * (t / duration)), "center")
        )

    if effect == "pan_right":
        return bg_clip.set_position(
            lambda t: (int(MAX_PAN * (t / duration)), "center")
        )

    return bg_clip


def run_ffmpeg(input_files, output_file):
    """Concatenate the scene clips using FFmpeg directly"""
    cmd = [
        "ffmpeg",
        "-y",  # Overwrite if exists
        "-f", "concat",  # Concatenate multiple clips
        "-safe", "0",  # Allow relative file paths
        "-i", input_files,  # Input list file
        "-c:v", "libx264",  # H.264 codec
        "-preset", "ultrafast",  # Speed up encoding
        "-crf", "23",  # Quality level (lower is better)
        "-c:a", "aac",  # Audio codec
        "-strict", "experimental",  # Audio codec workaround
        output_file,  # Final output file
    ]
    subprocess.run(cmd, check=True)


def main():
    scene_files = sorted([
        f for f in os.listdir(OUTPUT_DIR)
        if f.startswith("scene_") and f.endswith(".mp4")
    ])

    # Generate a temporary text file for FFmpeg concat
    concat_file = os.path.join(OUTPUT_DIR, "concat_list.txt")

    with open(concat_file, "w") as f:
        for scene_file in scene_files:
            scene_path = os.path.join(OUTPUT_DIR, scene_file)
            f.write(f"file '{scene_path}'\n")

    print(f"Combining {len(scene_files)} scenes...")

    # Call FFmpeg to concatenate the video clips
    run_ffmpeg(concat_file, FINAL_OUTPUT)

    # Clean up the temporary concat file
    os.remove(concat_file)

    print(f"Final Shorts video created: {FINAL_OUTPUT}")


if __name__ == "__main__":
    main()
