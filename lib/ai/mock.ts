import type {
  AnalyzeResponse,
  CompositeResponse,
  Template,
  Vec3,
} from "./types";
export const mockTemplates: Template[] = [
  { id: "past_city", era: "past", label: "100年前・街並み" },
  { id: "present_studio", era: "present", label: "現在・スタジオ" },
  { id: "future_city", era: "future", label: "100年後・未来都市" },
];
export function mockAnalyze(
  width: number,
  height: number,
  landmarks?: Vec3[],
): AnalyzeResponse {
  const points: Vec3[] =
    landmarks?.length === 478
      ? landmarks
      : Array.from({ length: 478 }, (_, i) => {
          const a = i * 2.39996,
            r = Math.sqrt(i / 478);
          return [
            0.5 + Math.cos(a) * r * 0.19,
            0.48 + Math.sin(a) * r * 0.29,
            -0.02,
          ];
        });
  const features = (
    [
      {
        id: "f1",
        type: "mole",
        tri: [205, 50, 187],
        size: 0.009,
        confidence: 0.94,
      },
      {
        id: "f2",
        type: "freckle",
        tri: [425, 280, 411],
        size: 0.007,
        confidence: 0.87,
      },
      {
        id: "f3",
        type: "other",
        tri: [10, 109, 338],
        size: 0.008,
        confidence: 0.82,
      },
    ] as const
  ).map((f) => {
    const bary: Vec3 = [0.2, 0.5, 0.3];
    const p = f.tri.map((i) => points[i]);
    return {
      ...f,
      xy: [
        p.reduce((s, v, i) => s + v[0] * bary[i], 0),
        p.reduce((s, v, i) => s + v[1] * bary[i], 0),
      ] as [number, number],
      uv: [0.5, 0.5] as [number, number],
      anchor: { tri: [...f.tri] as Vec3, bary },
    };
  });
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return {
    request_id: `mock-${crypto.randomUUID().slice(0, 8)}`,
    image: { width, height },
    face: {
      bbox: [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      ],
      landmarks: points,
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      blendshapes: { eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 },
    },
    features,
    warnings: ["MOCK_DATA"],
    timings_ms: { landmark: 42, features: 180, total: 240 },
  };
}
export async function mockComposite(
  photo: Blob,
  templateId: string,
): Promise<CompositeResponse> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("写真の読み込みに失敗しました"));
    reader.readAsDataURL(photo);
  });
  const bitmap = await createImageBitmap(photo);
  const { width, height } = bitmap;
  bitmap.close();
  return {
    request_id: `mock-${crypto.randomUUID().slice(0, 8)}`,
    template_id: templateId,
    image: data,
    width,
    height,
    timings_ms: { total: 850 },
  };
}
