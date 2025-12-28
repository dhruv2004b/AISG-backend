import fs from "fs";
import path from "path";
import gTTS from "gtts";
import ffmpeg from "fluent-ffmpeg";

const AUDIO_DIR = path.resolve("assets/audio");

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * Trim leading silence from audio using FFmpeg
 */
function trimLeadingSilence(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1"
      )
      .outputOptions("-acodec libmp3lame")
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });
}

export async function generateNarrationAudio(scenes) {
  const results = [];

  for (const scene of scenes) {
    const text = scene.narration;

    const rawPath = path.join(
      AUDIO_DIR,
      `scene_${scene.scene_id}_raw.mp3`
    );

    const finalPath = path.join(
      AUDIO_DIR,
      `scene_${scene.scene_id}.mp3`
    );

    // 1️⃣ Generate raw TTS
    await new Promise((resolve, reject) => {
      const gtts = new gTTS(text, "en");
      gtts.save(rawPath, err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2️⃣ Trim leading silence
    await trimLeadingSilence(rawPath, finalPath);

    // 3️⃣ Cleanup raw file
    fs.unlinkSync(rawPath);

    results.push({
      scene_id: scene.scene_id,
      audio_path: finalPath
    });
  }

  return results;
}
