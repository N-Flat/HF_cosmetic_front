"use client";
import { useState } from "react";
import { ScanFace } from "lucide-react";
export function VisionCheck() {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const check = async () => {
    setState("loading");
    try {
      const { createLandmarker } = await import("@/lib/face/landmarker");
      const detector = await createLandmarker();
      detector.close();
      setState("ready");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="vision-check">
      <button
        className="text-link"
        disabled={state === "loading"}
        onClick={() => void check()}
      >
        <ScanFace size={15} />
        {state === "loading" ? "モデルを確認中…" : "顔モデルを確認"}
      </button>
      <p role="status">
        {state === "idle"
          ? "カメラを使わずに、ローカルモデルとWASMの読み込みを確認します。"
          : state === "loading"
            ? "MediaPipeを初期化しています。"
            : state === "ready"
              ? "モデル・WASMの初期化完了。カメラテストを開始できます。"
              : "モデルの読み込み失敗。public/models と public/wasm のファイルを確認してください。"}
      </p>
    </div>
  );
}
