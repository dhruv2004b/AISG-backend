import { spawn } from "child_process";
import path from "path";
import { statusStore } from "./statusStore.js";

const PYTHON_PATH =
  "F:\\AISG\\backend\\video-engine\\venv\\Scripts\\python.exe";

const NODE_API_DIR = process.cwd();
const VIDEO_ENGINE_DIR = path.join(NODE_API_DIR, "../video-engine");

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: true });

    proc.stdout.on("data", d => console.log(d.toString()));
    proc.stderr.on("data", d => console.error(d.toString()));

    proc.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}

export async function runPipeline() {
  if (statusStore.status === "processing") {
    throw new Error("A video is already being generated. Please wait.");
  }

  try {
    statusStore.status = "processing";
    statusStore.startedAt = Date.now();

    // STEP 4 — captions
    statusStore.stage = "captions";
    statusStore.message = "Generating captions";
    await runCommand(
      "node",
      ["captions/captionsRunner.js"],
      NODE_API_DIR
    );

    // STEP 5 — scene videos
    statusStore.stage = "scene_videos";
    statusStore.message = "Rendering scene videos";
    await runCommand(
      PYTHON_PATH,
      ["main.py"],
      VIDEO_ENGINE_DIR
    );

    // STEP 6 — final concat
    statusStore.stage = "concat";
    statusStore.message = "Combining scenes";
    await runCommand(
      PYTHON_PATH,
      ["concat.py"],
      VIDEO_ENGINE_DIR
    );

    statusStore.status = "done";
    statusStore.stage = null;
    statusStore.message = "Video ready";
    statusStore.finishedAt = Date.now();

  } catch (err) {
    statusStore.status = "error";
    statusStore.message = err.message;
    console.error("❌ Pipeline failed:", err);
  }
}
