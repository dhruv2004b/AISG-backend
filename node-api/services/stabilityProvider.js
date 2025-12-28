import axios from "axios";
import fs from "fs";
import path from "path";

const IMAGE_DIR = path.resolve("assets/images");

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

export async function generateStabilityImages(scenes) {
  const results = [];

  for (const scene of scenes) {
    const response = await axios.post(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        text_prompts: [
          {
            text: scene.image_prompt + ", cinematic realistic, vertical composition"
          }
        ],
        cfg_scale: 7,
        steps: 30,
        width: 576,
        height: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const imageBase64 = response.data.artifacts[0].base64;

    const imagePath = path.join(
      IMAGE_DIR,
      `scene_${scene.scene_id}.png`
    );

    fs.writeFileSync(
      imagePath,
      Buffer.from(imageBase64, "base64")
    );

    results.push({
      scene_id: scene.scene_id,
      image_path: imagePath,
      source: "stability"
    });
  }

  return results;
}
