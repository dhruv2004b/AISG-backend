export async function generateSceneImages(scenes) {
  const provider = process.env.IMAGE_PROVIDER || "unsplash";

  if (provider === "unsplash") {
    const { generateUnsplashImages } = await import("./unsplashProvider.js");
    return generateUnsplashImages(scenes);
  }

  if (provider === "stability") {
    const { generateStabilityImages } = await import("./stabilityProvider.js");
    return generateStabilityImages(scenes);
  }

  throw new Error(`Unknown IMAGE_PROVIDER: ${provider}`);
}
