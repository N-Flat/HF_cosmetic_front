import { useLabStore } from "@/store/labStore";
import { mockAnalyze, mockComposite, mockTemplates } from "./mock";
import {
  validAnalyze,
  validComposite,
  validHealth,
  validTemplates,
} from "./validation";
import type {
  AnalyzeResponse,
  CompositeResponse,
  Health,
  Template,
} from "./types";
export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}
export function validateApiUrl(value: string): string {
  if (!value.trim()) return "";
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    throw new AiError(
      "INVALID_URL",
      "http:// または https:// で始まるAPIのURLを入力してください。",
    );
  }
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw new AiError(
      "INVALID_URL",
      "URLに認証情報、クエリ、#を含めることはできません。",
    );
  return u.toString().replace(/\/$/, "");
}
export function apiPath(path: string): string {
  const base = validateApiUrl(useLabStore.getState().apiUrl);
  return `${base || "/ai"}${path.startsWith("/") ? path : `/${path}`}`;
}
export function assetPath(path: string): string | undefined {
  if (path.startsWith("/") && !path.startsWith("//")) return apiPath(path);
  try {
    const u = new URL(path);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
async function request<T>(
  path: string,
  guard: (v: unknown) => v is T,
  body?: FormData,
): Promise<T> {
  if (
    process.env.NEXT_PUBLIC_STATIC_DEMO === "true" &&
    !useLabStore.getState().apiUrl
  )
    throw new AiError(
      "API_URL_REQUIRED",
      "共有デモではブラウザから接続できるHTTPSのAPI URLを入力してください。localhostのAPIにはローカルアプリから接続できます。",
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch(apiPath(path), {
      method: body ? "POST" : "GET",
      body,
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    let data: unknown;
    try {
      data = await r.json();
    } catch {
      throw new AiError(
        "INVALID_RESPONSE",
        "APIがJSONを返しませんでした。URLとエンドポイントを確認してください。",
      );
    }
    if (!r.ok) {
      const e = data as { error?: { code?: string; message?: string } };
      throw new AiError(
        e?.error?.code || `HTTP_${r.status}`,
        e?.error?.message || `APIリクエスト失敗 (${r.status})`,
      );
    }
    if (!guard(data))
      throw new AiError(
        "INVALID_RESPONSE",
        "API応答が設計書の形式と異なります。478点のランドマーク、正規化座標、anchor、timings_msを確認してください。",
      );
    return data;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError")
      throw new AiError(
        "TIMEOUT",
        "30秒以内に応答がありませんでした。APIサーバーの状態を確認して再試行してください。",
      );
    throw new AiError(
      "NETWORK",
      "APIに接続できません。URL、サーバーの起動状態、直接接続時のCORS・HTTPS設定を確認してください。",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export async function checkConnection() {
  const s = useLabStore.getState();
  s.set({ health: "checking", connectionError: null });
  try {
    let health: Health, templates: Template[];
    if (s.mock) {
      health = {
        status: "ok",
        models: {
          landmarker:
            process.env.NEXT_PUBLIC_FACE_MODEL_VERSION ||
            "face_landmarker-float16-v1",
          features: "mock-0.1.0",
        },
      };
      templates = mockTemplates;
    } else {
      const [h, t] = await Promise.all([
        request("/health", validHealth),
        request("/v1/templates", validTemplates),
      ]);
      health = h;
      templates = t.templates;
    }
    if (
      s.mock !== useLabStore.getState().mock ||
      s.apiUrl !== useLabStore.getState().apiUrl
    )
      return;
    s.set({
      health: "ok",
      models: health.models,
      templates,
      templateId: templates.some((t) => t.id === s.templateId)
        ? s.templateId
        : templates[0]?.id || "",
      connectionError: null,
    });
  } catch (e) {
    s.set({
      health: "error",
      connectionError: errorMessage(e),
      templates: [],
      templateId: "",
    });
  }
}
export function errorMessage(e: unknown) {
  return e instanceof AiError
    ? `${e.code}: ${e.message}`
    : e instanceof Error
      ? e.message
      : "予期しないエラーが発生しました。";
}
async function measured<T extends AnalyzeResponse | CompositeResponse>(
  endpoint: string,
  work: () => Promise<T>,
): Promise<T> {
  const s = useLabStore.getState(),
    start = performance.now();
  try {
    const data = await work(),
      ms = performance.now() - start;
    s.addLog({
      date: new Date().toISOString(),
      note: s.testerNote,
      request_id: data.request_id,
      endpoint,
      client_ms: ms,
      server_total_ms: data.timings_ms.total ?? null,
      features: "features" in data ? data.features.length : null,
      warnings: "warnings" in data ? data.warnings.join(";") : "",
      error_code: "",
      mode: s.mock ? "mock" : "live",
    });
    s.setMetrics({
      ...(endpoint.includes("analyze")
        ? { analyzeMs: ms }
        : { compositeMs: ms }),
      server: {
        ...useLabStore.getState().metrics.server,
        [endpoint]: data.timings_ms,
      },
    });
    return data;
  } catch (e) {
    const ms = performance.now() - start;
    s.setMetrics(
      endpoint.includes("analyze") ? { analyzeMs: ms } : { compositeMs: ms },
    );
    s.addLog({
      date: new Date().toISOString(),
      note: s.testerNote,
      request_id: "",
      endpoint,
      client_ms: ms,
      server_total_ms: null,
      features: null,
      warnings: "",
      error_code: e instanceof AiError ? e.code : "UNKNOWN",
      mode: s.mock ? "mock" : "live",
    });
    throw e;
  }
}
export async function runAnalysis() {
  const s = useLabStore.getState();
  if (!s.photo || !s.photoSize || s.busy) return;
  if (!s.templateId) {
    s.set({ errors: { composite: "先にテンプレートを選択してください。" } });
    return;
  }
  s.set({ busy: true, analyze: null, composite: null, errors: {} });
  s.setMetrics({
    error: null,
    warnings: [],
    analyzeMs: null,
    compositeMs: null,
    server: {},
  });
  const photo = s.photo;
  try {
    const results = await Promise.allSettled([
      measured("/v1/analyze", async () => {
        if (s.mock)
          return mockAnalyze(s.photoSize!.w, s.photoSize!.h, s.photoLandmarks);
        const fd = new FormData();
        fd.append("image", photo, "photo.jpg");
        return request("/v1/analyze", validAnalyze, fd);
      }),
      measured("/v1/composite", async () => {
        if (s.mock) return mockComposite(photo, s.templateId);
        const fd = new FormData();
        fd.append("image", photo, "photo.jpg");
        fd.append("template_id", s.templateId);
        return request("/v1/composite", validComposite, fd);
      }),
    ]);
    const [a, c] = results;
    const errors = {
      ...(a.status === "rejected" ? { analyze: errorMessage(a.reason) } : {}),
      ...(c.status === "rejected" ? { composite: errorMessage(c.reason) } : {}),
    };
    s.set({
      analyze: a.status === "fulfilled" ? a.value : null,
      composite: c.status === "fulfilled" ? c.value : null,
      errors,
    });
    s.setMetrics({
      warnings: a.status === "fulfilled" ? a.value.warnings : [],
      error: Object.values(errors).join(" / ") || null,
    });
  } finally {
    s.set({ busy: false });
  }
}
