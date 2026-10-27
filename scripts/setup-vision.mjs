import { mkdir, copyFile, readdir, writeFile } from "node:fs/promises";
await mkdir("public/wasm", { recursive: true });
for (const file of await readdir("node_modules/@mediapipe/tasks-vision/wasm"))
  if (/\.(js|wasm)$/.test(file))
    await copyFile(
      `node_modules/@mediapipe/tasks-vision/wasm/${file}`,
      `public/wasm/${file}`,
    );
const url =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const res = await fetch(url);
if (!res.ok) throw new Error(`Model download: ${res.status}`);
await mkdir("public/models", { recursive: true });
await writeFile(
  "public/models/face_landmarker.task",
  Buffer.from(await res.arrayBuffer()),
);
console.log(
  "Local WASM and face model ready. Use the same model file on the Python server.",
);
