import { getAudioDuration } from "./audioDuration.js";

export async function generateCaptions(scene, audioPath) {
  const duration = await getAudioDuration(audioPath);

  const words = scene.narration
    .replace(/[^\w\s']/g, "")
    .toUpperCase()
    .split(/\s+/);

  const wordDuration = duration / words.length;
  let currentTime = 0;

  const timedWords = words.map(word => {
    const start = Number(currentTime.toFixed(2));
    const end = Number((currentTime + wordDuration).toFixed(2));
    currentTime = end;
    return { text: word, start, end };
  });

  // Group into 3-word blocks (SwipeStory style)
  const captions = [];
  for (let i = 0; i < timedWords.length; i += 3) {
    captions.push({ words: timedWords.slice(i, i + 3) });
  }

  return {
    scene_id: scene.scene_id,
    audio_duration: duration,
    captions,
    style: {
      active_color: "yellow",
      inactive_color: "white",
      position: "center",
      font_weight: "bold",
      max_words: 3
    }
  };
}
