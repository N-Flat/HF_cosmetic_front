"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  RotateCcw,
  FlaskConical,
} from "lucide-react";
import { CameraView } from "./CameraView";
import { useLabStore } from "@/store/labStore";
import { usePhotoUrl } from "./usePhotoUrl";
import { loadPhoto, jpegPhoto } from "@/lib/face/photo";
import { runAnalysis } from "@/lib/ai/client";
export function Capture() {
  const s = useLabStore(),
    url = usePhotoUrl(s.photo),
    input = useRef<HTMLInputElement>(null),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    router = useRouter();
  const save = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const p = await loadPhoto(file);
      s.set({
        photo: p.blob,
        photoSize: { w: p.w, h: p.h },
        photoLandmarks: [],
        analyze: null,
        composite: null,
        errors: {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像を読み込めませんでした。");
    } finally {
      setUploading(false);
    }
  };
  const demo = async () => {
    setUploading(true);
    try {
      const img = new Image();
      img.src = "/sample-face.svg";
      await img.decode();
      const p = await jpegPhoto(img, 960, 1200);
      s.set({
        photo: p.blob,
        photoSize: { w: p.w, h: p.h },
        photoLandmarks: [],
        analyze: null,
        composite: null,
        errors: {},
      });
    } catch {
      setError("サンプルを読み込めませんでした。");
    } finally {
      setUploading(false);
    }
  };
  const proceed = async () => {
    await runAnalysis();
    if (
      useLabStore.getState().analyze ||
      useLabStore.getState().composite ||
      Object.keys(useLabStore.getState().errors).length
    )
      router.push("/lab/result");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">01 / CAPTURE</p>
          <h1>
            {s.photo
              ? "撮影した写真を確認してください"
              : "顔をガイドに合わせてください"}
          </h1>
          <p className="page-description">
            {s.photo
              ? "この写真で顔解析と時代合成を同時に実行します。"
              : "条件がそろうと、3秒のカウントダウン後に自動撮影します。"}
          </p>
        </div>
        <Link className="text-link" href="/lab">
          <ArrowLeft size={15} /> 設定に戻る
        </Link>
      </div>
      <div className="workspace-grid">
        <section>
          {url ? (
            <div className="photo-review">
              <img
                src={url}
                width={s.photoSize?.w}
                height={s.photoSize?.h}
                alt="送信前に確認する元の写真"
              />
              <span>ORIGINAL · NOT MIRRORED</span>
            </div>
          ) : (
            <CameraView mode="capture" />
          )}
          <div className="capture-actions">
            {s.photo ? (
              <>
                <button
                  className="button secondary"
                  disabled={s.busy}
                  onClick={() =>
                    s.set({
                      photo: null,
                      photoSize: null,
                      photoLandmarks: [],
                      analyze: null,
                      composite: null,
                      errors: {},
                    })
                  }
                >
                  <RotateCcw size={16} /> 撮り直す
                </button>
                <button
                  className="button primary"
                  disabled={s.busy || !s.templateId}
                  onClick={() => void proceed()}
                >
                  {s.busy ? (
                    <>
                      <span className="spinner" /> 解析・合成中…
                    </>
                  ) : (
                    <>
                      この写真で解析 <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <input
                  hidden
                  aria-label="テスト用の写真を選択"
                  ref={input}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) void save(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  className="button secondary"
                  disabled={uploading}
                  onClick={() => input.current?.click()}
                >
                  <Upload size={16} />{" "}
                  {uploading ? "画像を準備中…" : "写真をアップロード"}
                </button>
                {s.mock && (
                  <button
                    className="button text"
                    disabled={uploading}
                    onClick={() => void demo()}
                  >
                    <FlaskConical size={16} /> サンプルで試す
                  </button>
                )}
              </>
            )}
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {!s.templateId && (
            <p className="notice">
              設定画面で接続を確認し、合成テンプレートを選択してください。
            </p>
          )}
        </section>
        <aside className="instruction-panel">
          <span className="eyebrow">CAPTURE CHECKLIST</span>
          <h2>撮影のポイント</h2>
          <ol>
            <li>
              <strong>正面を向いてください</strong>
              <p>眼鏡や前髪で目が隠れないようにしてください。</p>
            </li>
            <li>
              <strong>顔を中央に合わせてください</strong>
              <p>顔幅が画面の35〜60%に収まるように調整してください。</p>
            </li>
            <li>
              <strong>明るい場所で撮影してください</strong>
              <p>逆光を避け、顔全体に光が当たるようにしてください。</p>
            </li>
          </ol>
          <div className="small-note">
            <strong>表示と送信の向き</strong>
            <p>
              カメラは鏡像で表示します。撮影結果とAPIに送信する画像は反転しません。
            </p>
          </div>
          <div className="small-note">
            <strong>送信画像</strong>
            <p>
              JPEG · 長辺1920px以下
              <br />
              品質0.92・元の縦横比を維持
            </p>
          </div>
          <div className="selected-template">
            <small>選択したテンプレート</small>
            <strong>{s.templateId || "未選択"}</strong>
          </div>
          {s.mock && (
            <p className="notice">
              モックでは特徴と合成はサンプルです。合成欄には元画像を表示します。
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
