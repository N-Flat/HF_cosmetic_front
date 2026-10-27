import type { CaptureRules, Vec3 } from "@/lib/ai/types";
import { faceBounds } from "./anchor";
export function poseFromMatrix(m: number[]) {
  return {
    yaw: (Math.atan2(m[8], m[10]) * 180) / Math.PI,
    pitch: (Math.atan2(-m[9], Math.hypot(m[8], m[10])) * 180) / Math.PI,
    roll: Math.atan2(m[1], m[0]),
  };
}
export function captureConditions(
  points: Vec3[],
  matrix: number[],
  blink: Record<string, number>,
  brightness: number,
  rules: CaptureRules,
) {
  const b = faceBounds(points),
    p = poseFromMatrix(matrix);
  return [
    {
      label: "顔の大きさ",
      ok: b.w >= rules.minWidth && b.w <= rules.maxWidth,
      help:
        b.w < rules.minWidth
          ? "もう少しカメラに近づいてください。"
          : "もう少しカメラから離れてください。",
    },
    {
      label: "中央の位置",
      ok:
        Math.abs(b.x + b.w / 2 - 0.5) <= rules.centerTolerance &&
        Math.abs(b.y + b.h / 2 - 0.5) <= rules.centerTolerance,
      help: "顔をガイドの中央に合わせてください。",
    },
    {
      label: "顔の向き",
      ok:
        matrix.length === 16 &&
        Math.abs(p.yaw) <= rules.maxAngle &&
        Math.abs(p.pitch) <= rules.maxAngle,
      help: "顔を動かさず、正面を向いてください。",
    },
    {
      label: "目の開き",
      ok:
        blink.eyeBlinkLeft !== undefined &&
        blink.eyeBlinkRight !== undefined &&
        blink.eyeBlinkLeft < rules.maxBlink &&
        blink.eyeBlinkRight < rules.maxBlink,
      help: "両目を自然に開いてください。",
    },
    {
      label: "明るさ",
      ok: brightness >= rules.minBrightness,
      help: "顔が明るく映る場所に移動してください。",
    },
  ];
}
