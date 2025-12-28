import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCaptions } from "./captionService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCENES_PATH = path.join(__dirname, "..", "data", "scenes.json");
const AUDIO_DIR = path.join(__dirname, "..", "assets", "audio");
const OUTPUT_DIR = path.join(__dirname);

if (!fs.existsSync(SCENES_PATH)) {
  throw new Error("scenes.json not found at " + SCENES_PATH);
}

const { scenes } = JSON.parse(
  fs.readFileSync(SCENES_PATH, "utf-8")
);

(async () => {
  for (const scene of scenes) {
    const audioPath = path.join(
      AUDIO_DIR,
      `scene_${scene.scene_id}.mp3`
    );

    console.log(`🎧 Generating captions for scene ${scene.scene_id}...`);

    const captionData = await generateCaptions(scene, audioPath);

    const outputPath = path.join(
      OUTPUT_DIR,
      `scene_${scene.scene_id}.json`
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(captionData, null, 2)
    );

    console.log(`✅ Saved captions/scene_${scene.scene_id}.json`);
  }

  console.log("🎉 STEP 4 COMPLETE — Transcript captions generated");
})();
