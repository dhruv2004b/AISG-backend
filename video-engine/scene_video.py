from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import random

# ================= VIDEO CONFIG =================

WIDTH, HEIGHT = 1080, 1920

MAX_TEXT_WIDTH_RATIO = 0.85
GLOBAL_TIME_OFFSET = -0.08
FRAME_EPSILON = 0.04
MAX_SILENCE_GAP = 0.15
CENTER_Y_OFFSET = 0

# ================= FONT WHITELIST =================

ALLOWED_FONTS = {
    "poppins_bold": "fonts/Poppins-Bold.ttf",
    "poppins_semibold": "fonts/Poppins-SemiBold.ttf",
    "montserrat_bold": "fonts/Montserrat-Bold.ttf",
    "inter_bold": "fonts/Inter-Bold.ttf"
}

# ================= DEFAULT STYLE =================

DEFAULT_CAPTION_STYLE = {
    "font_key": "poppins_bold",
    "font_size": 50,
    "text_color": (255, 255, 255, 255),
    "highlight_color": (255, 255, 0, 255),
    "stroke_color": "black",
    "stroke_width": 6,
    "word_spacing": 18,
    "horizontal_padding": 32,
    "vertical_padding": 14
}

# ================= STYLE RESOLVER =================

def resolve_caption_style(user_style=None):
    style = DEFAULT_CAPTION_STYLE.copy()

    if user_style:
        for k, v in user_style.items():
            if k in style:
                style[k] = v

    font_key = style["font_key"]
    if font_key not in ALLOWED_FONTS:
        font_key = DEFAULT_CAPTION_STYLE["font_key"]

    style["font_path"] = ALLOWED_FONTS[font_key]

    # safety clamps
    style["font_size"] = max(28, min(style["font_size"], 80))
    style["stroke_width"] = max(0, min(style["stroke_width"], 12))
    style["word_spacing"] = max(6, min(style["word_spacing"], 40))
    style["horizontal_padding"] = max(0, min(style.get("horizontal_padding", 32), 80))
    style["vertical_padding"] = max(0, min(style.get("vertical_padding", 14), 60))

    return style

# ================= CAPTION IMAGE =================

def create_caption_image(words, highlight_index, style):
    font = ImageFont.truetype(style["font_path"], style["font_size"])
    spacing = style["word_spacing"]

    widths = [font.getlength(w) for w in words]
    total_width = int(sum(widths) + spacing * (len(words) - 1))
    max_width = int(WIDTH * MAX_TEXT_WIDTH_RATIO)

    if total_width > max_width:
        scale = max_width / total_width
        font = ImageFont.truetype(style["font_path"], int(style["font_size"] * scale))
        widths = [font.getlength(w) for w in words]
        total_width = int(sum(widths) + spacing * (len(words) - 1))

    pad_x = style["horizontal_padding"]
    pad_y = style["vertical_padding"]

    img_width = total_width + pad_x * 2
    img_height = font.size * 2 + pad_y * 2

    img = Image.new("RGBA", (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = pad_x
    y = pad_y

    for i, word in enumerate(words):
        color = style["highlight_color"] if i == highlight_index else style["text_color"]
        draw.text(
            (x, y),
            word,
            font=font,
            fill=color,
            stroke_width=style["stroke_width"],
            stroke_fill=style["stroke_color"]
        )
        x += font.getlength(word) + spacing

    return np.array(img)

# ================= MOTION EFFECTS =================

def apply_background_motion(bg_clip, duration):
    """
    Apply noticeable random motion to the background only
    with zoom or pan effect.
    """
    # Random motion effect
    effect = random.choice(["zoom_in", "zoom_out", "pan_left", "pan_right"])

    if effect == "zoom_in":
        return bg_clip.resize(lambda t: 1 + 0.08 * t / duration)  # 8% zoom-in effect over time

    elif effect == "zoom_out":
        return bg_clip.resize(lambda t: 1 + 0.08 * (1 - t / duration))  # 8% zoom-out effect over time

    elif effect == "pan_left":
        return bg_clip.set_position(lambda t: (-int(50 * t / duration), "center"))  # Pan left by 50px

    elif effect == "pan_right":
        return bg_clip.set_position(lambda t: (int(50 * t / duration), "center"))  # Pan right by 50px

    return bg_clip



# ================= SCENE RENDER =================

def render_scene(scene, image_path, audio_path, output_path, caption_style):
    audio = AudioFileClip(audio_path)
    bg = ImageClip(image_path).resize(height=HEIGHT).set_duration(audio.duration)

    # Apply background motion effect
    bg = apply_background_motion(bg, audio.duration)

    caption_clips = []
    y_position = HEIGHT // 2 + CENTER_Y_OFFSET
    prev_group_end = None

    for group in scene["captions"]:
        words = group["words"]
        group_start = words[0]["start"] + GLOBAL_TIME_OFFSET

        if prev_group_end is not None:
            hard_cut = max(0, group_start - FRAME_EPSILON)
            caption_clips = [
                c.set_end(min(c.end, hard_cut)) for c in caption_clips if c.end
            ]

        prev_word_end = None

        for idx, w in enumerate(words):
            raw_start, raw_end = w["start"], w["end"]

            adjusted_start = raw_start
            if prev_word_end and raw_start - prev_word_end < MAX_SILENCE_GAP:
                adjusted_start = prev_word_end

            start = max(0, adjusted_start + GLOBAL_TIME_OFFSET)
            end = max(start + 0.05, raw_end + GLOBAL_TIME_OFFSET)

            img = create_caption_image(
                [x["text"] for x in words],
                idx,
                caption_style
            )

            clip = (
                ImageClip(img)
                .set_start(start)
                .set_end(end)
                .set_position(("center", y_position))
            )

            caption_clips.append(clip)
            prev_word_end = end

        prev_group_end = prev_word_end

    final = (
        CompositeVideoClip([bg] + caption_clips, size=(WIDTH, HEIGHT))
        .set_audio(audio)
        .set_duration(audio.duration)
    )

    final.write_videofile(
        output_path,
        fps=30,
        codec="libx264",
        audio_codec="aac",
        threads=4
    )
