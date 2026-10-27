"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  RefreshCw,
  PlugZap,
  Camera,
  ScanFace,
  Layers3,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useLabStore, defaultRules } from "@/store/labStore";
import { checkConnection, validateApiUrl } from "@/lib/ai/client";
import { downloadCsv } from "@/lib/csv";
import { TemplateArt } from "./TemplateArt";
import { VisionCheck } from "./VisionCheck";
import { mockTemplates } from "@/lib/ai/mock";
export function Home() {
  const s = useLabStore(),
    [url, setUrl] = useState(s.apiUrl),
    [urlError, setUrlError] = useState("");
  const connect = async () => {
    try {
      const value = validateApiUrl(url);
      s.set({ apiUrl: value });
      setUrlError("");
      await checkConnection();
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "URLを確認してください。");
    }
  };
  const templates = s.mock ? mockTemplates : s.templates;
  const switchMode = (mock: boolean) => {
    s.set({
      mock,
      apiUrl: url,
      health: "idle",
      models: {},
      templates: [],
      connectionError: null,
      analyze: null,
      composite: null,
    });
    setTimeout(() => void checkConnection(), 0);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FACE RECOGNITION TEST BENCH</p>
          <h1>顔認識テスト</h1>
          <p className="page-description">
            撮影から解析、リアルタイム追従まで。APIの結果を目で確かめます。
          </p>
        </div>
        <div className="session-id">
          <span className="status-dot green" /> LOCAL SESSION
        </div>
      </div>
      <section className="intro-band">
        <div className="intro-icon">
          <ScanFace size={37} strokeWidth={1.4} />
        </div>
        <div>
          <p className="eyebrow">YOUR TEST FLOW</p>
          <h2>一度の撮影で、さまざまな結果を比較。</h2>
          <p>顔の座標と特徴を解析し、スタンプが動きに追従するか確認します。</p>
        </div>
        <Link href="/lab/capture" className="button primary">
          撮影をはじめる <ArrowRight size={17} />
        </Link>
      </section>
      <div className="setup-grid">
        <section className="section-panel connection-panel">
          <div className="section-title">
            <h2>
              <span className="section-index">01</span> API接続
            </h2>
            <span className={`small-status ${s.health === "ok" ? "good" : ""}`}>
              <span className="status-dot" />
              {s.mock
                ? "モック"
                : s.health === "ok"
                  ? "接続済み"
                  : s.health === "checking"
                    ? "確認中"
                    : "未接続"}
            </span>
          </div>
          <p className="muted">
            APIの準備前でも、モックデータで一連の流れを確認できます。
          </p>
          <div className="mode-tabs" role="group" aria-label="APIモード">
            <button
              disabled={s.busy}
              aria-pressed={s.mock}
              className={s.mock ? "selected" : ""}
              onClick={() => switchMode(true)}
            >
              モックデータ {s.mock && <Check size={14} />}
            </button>
            <button
              disabled={s.busy}
              aria-pressed={!s.mock}
              className={!s.mock ? "selected" : ""}
              onClick={() => switchMode(false)}
            >
              実API {!s.mock && <Check size={14} />}
            </button>
          </div>
          <label htmlFor="api-url">
            API Base URL{" "}
            <span className="optional">直接接続する場合に入力</span>
          </label>
          <div className="input-action">
            <input
              id="api-url"
              disabled={s.busy}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                s.set({ health: "idle" });
              }}
              placeholder="http://localhost:8000"
              aria-describedby="api-help"
              aria-invalid={!!urlError}
            />
            <button
              className="button secondary square"
              onClick={() => void connect()}
              disabled={s.health === "checking"}
              aria-label="API接続を確認"
            >
              <RefreshCw
                size={17}
                className={s.health === "checking" ? "spin" : ""}
              />
            </button>
          </div>
          <p className="field-help" id="api-help">
            空欄の場合、環境変数のAPIに /ai プロキシで接続します。
            {process.env.NEXT_PUBLIC_STATIC_DEMO === "true" &&
              " 共有デモではHTTPSのURLとAPI側のCORS許可が必要です。"}
          </p>
          {(urlError || s.connectionError) && (
            <p role="alert" className="notice error">
              {urlError || s.connectionError}
            </p>
          )}
          <div className="connection-summary">
            <PlugZap size={18} />
            <div>
              <strong>
                {s.mock
                  ? "APIなしでテストできます"
                  : s.health === "ok"
                    ? "APIに接続できました"
                    : "接続確認ボタンを押してください"}
              </strong>
              <span>
                {s.mock
                  ? "解析と合成の結果はサンプルデータです。"
                  : s.health === "ok"
                    ? `Landmarker: ${s.models.landmarker || "未提供"}`
                    : "/health と /v1/templates を確認します。"}
              </span>
            </div>
            {s.health === "ok" && <CheckCircle2 size={18} />}
          </div>
          {!s.mock &&
            s.models.landmarker &&
            s.models.landmarker !==
              (process.env.NEXT_PUBLIC_FACE_MODEL_VERSION ||
                "face_landmarker-float16-v1") && (
              <p className="notice">
                ブラウザモデル:{" "}
                {process.env.NEXT_PUBLIC_FACE_MODEL_VERSION ||
                  "face_landmarker-float16-v1"}
                . サーバーと同じモデルファイルか確認してください。
              </p>
            )}
        </section>
        <section className="section-panel template-panel">
          <div className="section-title">
            <h2>
              <span className="section-index">02</span> 合成テンプレート
            </h2>
            <span className="subtle-label">{templates.length} AVAILABLE</span>
          </div>
          <p className="muted">顔を合成する背景と時代を選択してください。</p>
          <div
            className="template-list"
            role="group"
            aria-label="合成テンプレート"
          >
            {templates.map((t, i) => (
              <button
                key={t.id}
                className={`template-option ${s.templateId === t.id ? "selected" : ""}`}
                onClick={() => s.set({ templateId: t.id })}
                aria-pressed={s.templateId === t.id}
              >
                <TemplateArt key={t.thumbnail || t.id} template={t} />
                <span>
                  <small>
                    {t.era === "past"
                      ? "PAST / 1926"
                      : t.era === "present"
                        ? "PRESENT / 2026"
                        : "FUTURE / 2126"}
                  </small>
                  <strong>{t.label}</strong>
                  <span className="template-id">{t.id}</span>
                </span>
                <span className="radio-mark">
                  {s.templateId === t.id && <span />}
                </span>
                <span className="sr-only">テンプレート {i + 1}</span>
              </button>
            ))}
            {!templates.length && (
              <div className="empty-inline">
                <PlugZap size={26} />
                <p>
                  {s.health === "ok"
                    ? "利用できるテンプレートがありません。APIにテンプレートを登録してください。"
                    : "実APIに接続するとテンプレート一覧を読み込みます。"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="session-section">
        <div>
          <div className="section-title">
            <h2>
              <span className="section-index">03</span> テスト記録
            </h2>
          </div>
          <p className="muted">
            撮影条件をメモし、APIごとの計測結果をCSVで出力できます。
          </p>
        </div>
        <div className="note-field">
          <label htmlFor="tester-note">テストメモ</label>
          <input
            id="tester-note"
            maxLength={500}
            value={s.testerNote}
            onChange={(e) => s.set({ testerNote: e.target.value })}
            placeholder="例：眼鏡あり・室内照明・正面"
          />
        </div>
        <button
          className="button secondary"
          disabled={!s.logs.length}
          onClick={() => downloadCsv(s.logs)}
        >
          <Download size={16} /> CSVを出力{" "}
          <span className="count-label">{s.logs.length}</span>
        </button>
      </section>
      <div className="quick-links">
        <Link href="/lab/capture">
          <Camera size={18} />
          <span>顔の撮影</span>
          <ArrowUpRight size={16} />
        </Link>
        <Link href="/lab/result">
          <Layers3 size={18} />
          <span>解析結果を確認</span>
          <ArrowUpRight size={16} />
        </Link>
        <Link href="/lab/mirror">
          <ScanFace size={18} />
          <span>ミラーテスト</span>
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <VisionCheck />
      <details className="advanced">
        <summary>
          自動撮影の条件を調整 <span>詳細設定</span>
        </summary>
        <div className="rules-grid">
          {(
            [
              {
                key: "minWidth",
                label: "顔幅の下限",
                step: 0.01,
                min: 0.1,
                max: s.rules.maxWidth - 0.01,
              },
              {
                key: "maxWidth",
                label: "顔幅の上限",
                step: 0.01,
                min: s.rules.minWidth + 0.01,
                max: 1,
              },
              {
                key: "centerTolerance",
                label: "中心の許容誤差",
                step: 0.01,
                min: 0.01,
                max: 0.4,
              },
              {
                key: "maxAngle",
                label: "許容角度（°）",
                step: 1,
                min: 1,
                max: 45,
              },
              {
                key: "maxBlink",
                label: "まばたきの閾値",
                step: 0.05,
                min: 0.05,
                max: 1,
              },
              {
                key: "minBrightness",
                label: "明るさの下限（0–255）",
                step: 1,
                min: 0,
                max: 255,
              },
              {
                key: "stableMs",
                label: "安定待機時間（ms）",
                step: 100,
                min: 0,
                max: 5000,
              },
            ] as const
          ).map((r) => (
            <label key={r.key}>
              {r.label}
              <input
                type="number"
                min={r.min}
                max={r.max}
                step={r.step}
                value={s.rules[r.key]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n))
                    s.set({
                      rules: {
                        ...s.rules,
                        [r.key]: Math.max(r.min, Math.min(r.max, n)),
                      },
                    });
                }}
              />
            </label>
          ))}
          <button
            className="button secondary"
            onClick={() => s.set({ rules: defaultRules })}
          >
            初期値に戻す
          </button>
        </div>
      </details>
      <p className="privacy-footnote">
        <Info size={14} />{" "}
        このアプリは写真と記録をセッション内のメモリに保持します。実APIモードでは接続先のAPIへ写真を送信します。
      </p>
    </>
  );
}
