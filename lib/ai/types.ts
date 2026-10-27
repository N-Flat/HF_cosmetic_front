export type Vec3 = [number, number, number];
export type FeatureType = "mole" | "freckle" | "smile_line" | "other";
export type Feature = {
  id: string;
  type: FeatureType;
  xy: [number, number];
  uv: [number, number];
  anchor: { tri: Vec3; bary: Vec3 };
  size: number;
  confidence: number;
};
export type AnalyzeResponse = {
  request_id: string;
  image: { width: number; height: number };
  face: {
    bbox: [number, number, number, number];
    landmarks: Vec3[];
    transform: number[];
    blendshapes: Record<string, number>;
  };
  features: Feature[];
  warnings: string[];
  timings_ms: Record<string, number>;
};
export type CompositeResponse = {
  request_id: string;
  template_id: string;
  image: string;
  width: number;
  height: number;
  timings_ms: Record<string, number>;
};
export type Template = {
  id: string;
  era: "past" | "present" | "future";
  label: string;
  thumbnail?: string;
};
export type Health = { status: string; models: Record<string, string> };
export type MeasureLog = {
  date: string;
  note: string;
  request_id: string;
  endpoint: string;
  client_ms: number;
  server_total_ms: number | null;
  features: number | null;
  warnings: string;
  error_code: string;
  mode: "mock" | "live";
};
export type Metrics = {
  fps: number;
  inference: number;
  faces: number;
  analyzeMs: number | null;
  compositeMs: number | null;
  warnings: string[];
  error: string | null;
  server: Record<string, Record<string, number>>;
};
export type CaptureRules = {
  minWidth: number;
  maxWidth: number;
  centerTolerance: number;
  maxAngle: number;
  maxBlink: number;
  minBrightness: number;
  stableMs: number;
};
