import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sceneRoutes from "./routes/sceneRoutes.js";
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/scenes", sceneRoutes);


// serves final_short.mp4 for frontend preview/download

app.use(
  "/output",
  express.static(path.join(process.cwd(), "../video-engine/output"))
);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Node API running on port ${PORT}`);
});
