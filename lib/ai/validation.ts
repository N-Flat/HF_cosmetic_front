import type {
  AnalyzeResponse,
  CompositeResponse,
  Health,
  Template,
} from "./types";
type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const vector = (v: unknown, n: number) =>
  Array.isArray(v) && v.length === n && v.every(finite);
const norm = (v: unknown) => finite(v) && v >= 0 && v <= 1;
const timings = (v: unknown) =>
  obj(v) && Object.values(v).every((n) => finite(n) && n >= 0);
export function validAnalyze(v: unknown): v is AnalyzeResponse {
  if (
    !obj(v) ||
    typeof v.request_id !== "string" ||
    !obj(v.image) ||
    !finite(v.image.width) ||
    !finite(v.image.height) ||
    v.image.width <= 0 ||
    v.image.height <= 0 ||
    !obj(v.face) ||
    !timings(v.timings_ms)
  )
    return false;
  const f = v.face;
  if (
    !vector(f.bbox, 4) ||
    !(f.bbox as number[]).every(norm) ||
    !vector(f.transform, 16) ||
    !obj(f.blendshapes) ||
    !Object.values(f.blendshapes).every(finite) ||
    !Array.isArray(f.landmarks) ||
    f.landmarks.length !== 478 ||
    !f.landmarks.every((p) => vector(p, 3)) ||
    !Array.isArray(v.features) ||
    !Array.isArray(v.warnings) ||
    !v.warnings.every((s) => typeof s === "string")
  )
    return false;
  return v.features.every(
    (x) =>
      obj(x) &&
      typeof x.id === "string" &&
      ["mole", "freckle", "smile_line", "other"].includes(String(x.type)) &&
      vector(x.xy, 2) &&
      (x.xy as number[]).every(norm) &&
      vector(x.uv, 2) &&
      (x.uv as number[]).every(norm) &&
      norm(x.confidence) &&
      finite(x.size) &&
      x.size > 0 &&
      x.size <= 1 &&
      obj(x.anchor) &&
      vector(x.anchor.tri, 3) &&
      (x.anchor.tri as number[]).every(
        (n) => Number.isInteger(n) && n >= 0 && n < 478,
      ) &&
      vector(x.anchor.bary, 3) &&
      (x.anchor.bary as number[]).every(norm) &&
      Math.abs((x.anchor.bary as number[]).reduce((a, b) => a + b, 0) - 1) <
        0.001,
  );
}
export function validComposite(v: unknown): v is CompositeResponse {
  return (
    obj(v) &&
    typeof v.request_id === "string" &&
    typeof v.template_id === "string" &&
    typeof v.image === "string" &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v.image) &&
    finite(v.width) &&
    v.width > 0 &&
    finite(v.height) &&
    v.height > 0 &&
    timings(v.timings_ms)
  );
}
export const validHealth = (v: unknown): v is Health =>
  obj(v) &&
  v.status === "ok" &&
  obj(v.models) &&
  Object.values(v.models).every((x) => typeof x === "string");
export const validTemplates = (v: unknown): v is { templates: Template[] } =>
  obj(v) &&
  Array.isArray(v.templates) &&
  v.templates.every(
    (t) =>
      obj(t) &&
      typeof t.id === "string" &&
      typeof t.label === "string" &&
      ["past", "present", "future"].includes(String(t.era)) &&
      (t.thumbnail === undefined || typeof t.thumbnail === "string"),
  );
