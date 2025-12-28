import express from "express";
import fs from "fs";
import path from "path";

import { generateScenes } from "../services/sceneService.js";
import { generateSceneImages } from "../services/imageProvider.js";
import { generateNarrationAudio } from "../services/ttsService.js";
import { runPipeline } from "../pipelineRunner.js";
import { statusStore } from "../statusStore.js";


const router = express.Router();

// ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

router.post("/generate", async (req, res) => {
  try {
    const story = req.body?.story;
    if (!story || typeof story !== "string") {
      return res.status(400).json({ error: "Story must be a string" });
    }

    // STEP 1: scenes
    const sceneData = await generateScenes(story);

    // STEP 2: images
    const images = await generateSceneImages(sceneData.scenes);

    // STEP 3: audio
    const audio = await generateNarrationAudio(sceneData.scenes);

    // 🔐 STEP 1.5: persist scenes
    const scenesPath = path.join(DATA_DIR, "scenes.json");
    fs.writeFileSync(
      scenesPath,
      JSON.stringify(sceneData, null, 2)
    );

    // 🔐 optional manifest (recommended)
    const manifest = {
      scenes: sceneData.scenes,
      images,
      audio
    };

    const manifestPath = path.join(DATA_DIR, "manifest.json");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 2)
    );

    console.log("✅ scenes.json and manifest.json saved");

    res.json(manifest);

    // 🔥 STEP 4–6: automate pipeline (async, non-blocking)
    runPipeline().catch(console.error);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
});
router.get("/status", (req, res) => {
  res.json(statusStore);
});


export default router;
