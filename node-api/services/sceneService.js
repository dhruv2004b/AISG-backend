import axios from "axios";

/**
 * Robust JSON extractor
 * Handles:
 * 1. Proper { "scenes": [...] }
 * 2. Multiple loose scene objects (LLM mistake)
 */
function extractJson(text) {
  const trimmed = text.trim();

  // Case 1: valid JSON object
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Case 2: multiple scene objects
  const blocks = trimmed.match(/\{[\s\S]*?\}/g);
  if (!blocks) {
    console.error("Raw LLM response:\n", text);
    throw new Error("No valid JSON found");
  }

  const scenes = blocks.map(b => JSON.parse(b));
  return { scenes };
}

/**
 * Estimate duration from narration text
 * ~2.5 words per second
 * Clamp to Shorts-friendly range
 */
function estimateDuration(narration) {
  const words = narration.trim().split(/\s+/).length;
  return Math.min(6, Math.max(3, Math.ceil(words / 2.5)));
}

function normalizeScenes(data) {
  return {
    scenes: data.scenes.map((scene, index) => ({
      scene_id: index + 1,
      narration: scene.narration,
      caption: scene.caption.split(" ").slice(0, 6).join(" "),
      image_prompt: scene.image_prompt,
      duration_sec: estimateDuration(scene.narration)
    }))
  };
}

export async function generateScenes(story) {
  const wordCount = story.trim().split(/\s+/).length;
  const sceneCount = Math.min(12, Math.max(4, Math.ceil(wordCount / 28)));

  const prompt = `
You are generating scenes for a vertical short-form STORY NARRATION video.

MODE: TRANSCRIPT MODE (VERY IMPORTANT)

Create EXACTLY ${sceneCount} scenes from the story.

STRICT RULES:
- Output MUST be ONE valid JSON object
- Top-level key MUST be "scenes"
- "scenes" MUST be an array
- Do NOT output multiple JSON objects
- Do NOT add text outside JSON

Narration rules (TRANSCRIPT MODE):
- Narration should fully describe this part of the story
- Use 1-2 natural spoken sentences
- Aim for 15-25 words per scene
- Write like spoken storytelling (not poetic highlights)

Other rules:
- Captions: max 6 words
- image_prompt: realistic, cinematic, descriptive

JSON FORMAT (YOU MUST FOLLOW THIS EXACTLY):
{
  "scenes": [
    {
      "scene_id": 1,
      "narration": "",
      "caption": "",
      "image_prompt": "",
      "duration_sec": 4
    }
  ]
}

Return ONLY valid JSON.

Story:
${story}
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a JSON-only API. You must return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1200
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const raw = extractJson(content);
    return normalizeScenes(raw);

  } catch (error) {
    console.error("Groq error:", error.response?.data || error.message);
    throw error;
  }
}
