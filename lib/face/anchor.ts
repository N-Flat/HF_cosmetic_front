import type { Feature, Vec3 } from "@/lib/ai/types";
export function anchorPosition(
  anchor: Feature["anchor"],
  points: Vec3[],
): Vec3 | null {
  if (anchor.tri.some((i) => !points[i])) return null;
  return [0, 1, 2].map((axis) =>
    anchor.tri.reduce(
      (sum, index, i) => sum + points[index][axis] * anchor.bary[i],
      0,
    ),
  ) as Vec3;
}
export function faceBounds(points: Vec3[]) {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
export function largestFace(faces: Vec3[][]) {
  return faces.reduce(
    (best, face, index) => {
      const b = faceBounds(face);
      return b.w * b.h > best.area ? { index, area: b.w * b.h } : best;
    },
    { index: 0, area: -1 },
  ).index;
}
