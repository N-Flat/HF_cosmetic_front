"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import type { AnalyzeResponse } from "@/lib/ai/types";
import { featureColors } from "@/lib/stamps";
export function OverlayCanvas({
  url,
  width,
  height,
  data,
  toggles,
  hover,
}: {
  url: string;
  width: number;
  height: number;
  data: AnalyzeResponse | null;
  toggles: {
    landmarks: boolean;
    bbox: boolean;
    features: boolean;
    anchors: boolean;
  };
  hover: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!data) return;
    ctx.lineWidth = Math.max(1.5, width / 600);
    const point = (p: number[]) => [p[0] * width, p[1] * height];
    if (toggles.landmarks) {
      ctx.fillStyle = "#147db1";
      for (const p of data.face.landmarks) {
        const [x, y] = point(p);
        ctx.beginPath();
        ctx.arc(x, y, width / 600, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (toggles.bbox) {
      ctx.strokeStyle = "#20a17e";
      const [x, y, w, h] = data.face.bbox;
      ctx.strokeRect(x * width, y * height, w * width, h * height);
    }
    for (const f of data.features) {
      const [x, y] = point(f.xy),
        r = Math.max(5, (f.size * width) / 2),
        active = f.id === hover;
      if (toggles.anchors) {
        const tri = f.anchor.tri.map((i) => data.face.landmarks[i]);
        ctx.strokeStyle = active ? "#202f2a" : "#ab7bca";
        ctx.beginPath();
        tri.forEach((p, i) => {
          const [a, b] = point(p);
          if (i === 0) ctx.moveTo(a, b);
          else ctx.lineTo(a, b);
        });
        ctx.closePath();
        ctx.stroke();
      }
      if (toggles.features || active) {
        ctx.strokeStyle = featureColors[f.type];
        ctx.fillStyle = featureColors[f.type];
        ctx.lineWidth = active ? width / 250 : width / 500;
        ctx.beginPath();
        ctx.arc(x, y, r + (active ? width / 100 : width / 250), 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `600 ${Math.max(14, width / 55)}px sans-serif`;
        ctx.fillText(
          `${f.id} ${(f.confidence * 100).toFixed(0)}%`,
          x + r + 6,
          y - 6,
        );
      }
    }
  }, [data, width, height, toggles, hover]);
  return (
    <div className="overlay-view" style={{ aspectRatio: `${width}/${height}` }}>
      <img
        src={url}
        width={width}
        height={height}
        alt="撮影した元画像上の顔座標と特徴の位置"
      />
      <canvas
        ref={canvas}
        width={width}
        height={height}
        aria-label="ランドマーク、顔の境界、特徴、アンカーの比較。詳細な値は下の特徴一覧で確認できます。"
      />
    </div>
  );
}
