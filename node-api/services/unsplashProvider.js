import axios from "axios";
import fs from "fs";
import path from "path";

const IMAGE_DIR = path.resolve("assets/images");

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// 🔹 simplify LLM prompts → Unsplash-friendly keywords
function simplifyPrompt(prompt) {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 4)
    .join(" ");
}

export async function generateUnsplashImages(scenes) {
  const results = [];

  for (const scene of scenes) {
    let imageUrl;

    try {
      const query = simplifyPrompt(scene.image_prompt);

      const response = await axios.get(
        "https://api.unsplash.com/search/photos",
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          },
          params: {
            query,
            orientation: "portrait",
            per_page: 1
          }
        }
      );

      if (!response.data.results.length) {
        throw new Error("No Unsplash results");
      }

      imageUrl = response.data.results[0].urls.regular;

    } catch (err) {
      console.warn(
        `⚠️ Unsplash failed for scene ${scene.scene_id}, using fallback`
      );

      // 🟡 fallback image (guaranteed)
      imageUrl = "https://source.unsplash.com/1080x1920/?cinematic";
    }

    const imageBuffer = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });

    const imagePath = path.join(
      IMAGE_DIR,
      `scene_${scene.scene_id}.jpg`
    );

    fs.writeFileSync(imagePath, imageBuffer.data);

    results.push({
      scene_id: scene.scene_id,
      image_path: imagePath,
      source: "unsplash"
    });

    // 🛑 Unsplash rate-limit safety
    await new Promise(res => setTimeout(res, 800));
  }

  return results;
}
