"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Layers3, RotateCcw } from "lucide-react";
import { useLabStore } from "@/store/labStore";
import { usePhotoUrl } from "./usePhotoUrl";
import { OverlayCanvas } from "./OverlayCanvas";
import { featureLabels, featureColors } from "@/lib/stamps";
import { runAnalysis } from "@/lib/ai/client";
export function Result() {
  const s = useLabStore(),
    url = usePhotoUrl(s.photo),
    [toggles, setToggles] = useState({
      landmarks: true,
      bbox: true,
      features: true,
      anchors: false,
    }),
    [hover, setHover] = useState<string | null>(null);
  if (!s.photo)
    return (
      <div className="empty-page">
        <Layers3 size={44} strokeWidth={1.2} />
        <p className="eyebrow">NO RESULTS YET</p>
        <h1>最初のテストをはじめましょう</h1>
        <p>
          顔を撮影するか、写真をアップロードすると
          <br />
          解析結果と合成画像を比較できます。
        </p>
        <Link href="/lab/capture" className="button primary">
          <Camera size={16} /> 顔を撮影する
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">02 / RESULT</p>
          <h1>解析結果を比較しましょう</h1>
          <p className="page-description">
            元画像に重ねた座標と特徴が、正しい位置を示すか確認します。
          </p>
        </div>
        <Link href="/lab/mirror" className="button primary">
          ミラーで確認 <ArrowRight size={16} />
        </Link>
      </div>
      {s.mock && (
        <p className="notice mock-notice">
          モックデータです。特徴はテスト用のサンプルで、合成欄には元画像を表示します。性能・精度を評価する場合は実APIに接続してください。
        </p>
      )}
      <div className="result-grid">
        <section className="result-panel">
          <div className="section-title">
            <h2>元画像＋解析オーバーレイ</h2>
            <span className="subtle-label">NORMALIZED XY</span>
          </div>
          {url && s.photoSize && (
            <OverlayCanvas
              url={url}
              width={s.photoSize.w}
              height={s.photoSize.h}
              data={s.analyze}
              toggles={toggles}
              hover={hover}
            />
          )}
          <div className="overlay-toggles">
            {(
              [
                { key: "landmarks", label: "ランドマーク478点" },
                { key: "bbox", label: "顔の境界" },
                { key: "features", label: "特徴・信頼度" },
                { key: "anchors", label: "アンカー三角形" },
              ] as const
            ).map((t) => (
              <label key={t.key}>
                <input
                  type="checkbox"
                  checked={toggles[t.key]}
                  onChange={(e) =>
                    setToggles({ ...toggles, [t.key]: e.target.checked })
                  }
                />
                {t.label}
              </label>
            ))}
          </div>
          {s.errors.analyze && (
            <p role="alert" className="notice error">
              解析失敗 · {s.errors.analyze}
            </p>
          )}
        </section>
        <section className="result-panel">
          <div className="section-title">
            <h2>{s.mock ? "合成プレビュー・モック" : "時代合成の結果"}</h2>
            <span className="subtle-label">
              {s.composite?.template_id || "COMPOSITE"}
            </span>
          </div>
          {s.composite ? (
            <div className="composite-view">
              <img
                src={s.composite.image}
                width={s.composite.width}
                height={s.composite.height}
                alt={
                  s.mock
                    ? "モック合成の代わりに表示した元画像"
                    : "APIが生成した時代合成画像"
                }
              />
              {s.mock && <span>MOCK · ORIGINAL IMAGE</span>}
            </div>
          ) : (
            <div className="empty-composite">
              <Layers3 size={36} />
              <p>合成結果がありません。</p>
            </div>
          )}
          {s.errors.composite && (
            <p role="alert" className="notice error">
              合成失敗 · {s.errors.composite}
            </p>
          )}
        </section>
      </div>
      <section className="feature-section">
        <div className="section-title">
          <h2>
            検出された特徴{" "}
            <span className="count-label">
              {s.analyze?.features.length ?? 0}
            </span>
          </h2>
          <span className="muted">
            行にカーソルを合わせるかフォーカスすると、位置を強調します。
          </span>
        </div>
        {s.analyze?.features.length ? (
          <div className="feature-table-wrap">
            <table className="feature-table">
              <thead>
                <tr>
                  <th>ID / 種類</th>
                  <th>正規化座標（x, y）</th>
                  <th>信頼度</th>
                  <th>アンカー（3点）</th>
                </tr>
              </thead>
              <tbody>
                {s.analyze.features.map((f) => (
                  <tr
                    key={f.id}
                    tabIndex={0}
                    onMouseEnter={() => setHover(f.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(f.id)}
                    onBlur={() => setHover(null)}
                  >
                    <td>
                      <span
                        style={{ background: featureColors[f.type] }}
                        className="feature-dot"
                      />
                      {f.id} <strong>{featureLabels[f.type]}</strong>
                    </td>
                    <td>{f.xy.map((n) => n.toFixed(4)).join(", ")}</td>
                    <td>{(f.confidence * 100).toFixed(1)}%</td>
                    <td>{f.anchor.tri.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-inline">
            {s.analyze
              ? "特徴が検出されませんでした。ミラーでは既定の位置にテスト用スタンプを表示します。"
              : "解析の応答を取得できませんでした。エラーを確認して再試行してください。"}
          </p>
        )}
      </section>
      <section className="timing-section">
        <div>
          <span>解析・クライアント往復</span>
          <strong>
            {s.metrics.analyzeMs?.toFixed(0) ?? "—"} <small>ms</small>
          </strong>
          <p>
            サーバー total {s.analyze?.timings_ms.total ?? "—"} ms / 目標 1,500
            ms 以下
          </p>
        </div>
        <div>
          <span>合成・クライアント往復</span>
          <strong>
            {s.metrics.compositeMs?.toFixed(0) ?? "—"} <small>ms</small>
          </strong>
          <p>
            サーバー total {s.composite?.timings_ms.total ?? "—"} ms / 目標
            2,000 ms 以下
          </p>
        </div>
        <div className="result-actions">
          <button
            className="button secondary"
            disabled={s.busy}
            onClick={() => void runAnalysis()}
          >
            <RotateCcw size={15} />
            {s.busy ? "リクエスト中…" : "同じ写真で再実行"}
          </button>
          <Link href="/lab/capture" className="text-link">
            別の写真でテスト <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      {!!s.analyze?.warnings.length && (
        <p className="notice">Warnings: {s.analyze.warnings.join(", ")}</p>
      )}
    </>
  );
}
