import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

ffmpeg.setFfprobePath("D:/ffmpeg/bin/ffprobe.exe");

export function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(audioPath)) {
      return reject(new Error(`Audio file not found: ${audioPath}`));
    }

    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata?.format?.duration;
      if (!duration) {
        return reject(new Error("Could not read audio duration"));
      }

      resolve(Number(duration.toFixed(2)));
    });
  });
}
