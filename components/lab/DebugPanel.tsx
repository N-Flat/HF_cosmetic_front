"use client";
import { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useLabStore } from "@/store/labStore";
export function DebugPanel() {
  const [open, setOpen] = useState(false),
    m = useLabStore((s) => s.metrics),
    mock = useLabStore((s) => s.mock),
    features = useLabStore((s) => s.analyze?.features.length ?? 0);
  const ms = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)} ms`);
  return (
    <footer className={`debug-panel ${open ? "expanded" : ""}`}>
      <button
        className="debug-label"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Activity size={16} />
        <span>LIVE METRICS</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      <div className="debug-stats">
        <div>
          <span>FPS</span>
          <strong>{m.fps ? m.fps.toFixed(1) : "—"}</strong>
        </div>
        <div>
          <span>推論</span>
          <strong>{m.inference ? ms(m.inference) : "—"}</strong>
        </div>
        <div>
          <span>ANALYZE</span>
          <strong>{ms(m.analyzeMs)}</strong>
        </div>
        <div>
          <span>COMPOSITE</span>
          <strong>{ms(m.compositeMs)}</strong>
        </div>
        <div>
          <span>顔 / 特徴</span>
          <strong>
            {m.faces} / {features}
          </strong>
        </div>
      </div>
      <span className="debug-mode">{mock ? "MOCK" : "LIVE API"}</span>
      {open && (
        <div className="debug-detail">
          <p>
            クライアント実測 ·{" "}
            {mock
              ? "モックの処理時間は性能評価には使用できません。"
              : "撮影・ミラー画面で推論時間を測定します。"}
          </p>
          {Object.entries(m.server).map(([key, t]) => (
            <p key={key}>
              <strong>{key}</strong>{" "}
              {Object.entries(t)
                .map(([k, v]) => `${k}: ${v} ms`)
                .join(" · ")}
            </p>
          ))}
          <p>Warnings: {m.warnings.join(", ") || "なし"}</p>
          <p
            className={m.error ? "error-text" : ""}
            role={m.error ? "alert" : undefined}
          >
            Error: {m.error || "なし"}
          </p>
        </div>
      )}
    </footer>
  );
}
