"use client";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { useLabStore } from "@/store/labStore";
import { CameraView } from "./CameraView";
export function Mirror() {
  const settings = useLabStore((s) => s.settings),
    setSettings = useLabStore((s) => s.setSettings),
    analyze = useLabStore((s) => s.analyze);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">03 / LIVE MIRROR</p>
          <h1>動きに追従するスタンプ</h1>
          <p className="page-description">
            顔をゆっくり動かして、スタンプの位置と追従性能を確認します。
          </p>
        </div>
        <Link href="/lab/result" className="text-link">
          <ArrowLeft size={15} /> 解析結果
        </Link>
      </div>
      {!analyze?.features.length && (
        <p className="notice">
          <Info size={16} />{" "}
          解析済みの特徴がないため、両頬と額の固定アンカーにテスト用スタンプを表示します。
        </p>
      )}
      <div className="workspace-grid">
        <CameraView mode="mirror" />
        <aside className="instruction-panel mirror-settings">
          <p className="eyebrow">RENDER SETTINGS</p>
          <h2>追従オプション</h2>
          <div className="setting-row">
            <label htmlFor="smoothing">
              <strong>動きの平滑化</strong>
              <span>One Euro Filterで揺れを抑えます。</span>
            </label>
            <input
              id="smoothing"
              className="switch"
              type="checkbox"
              checked={settings.smoothing}
              onChange={(e) => setSettings({ smoothing: e.target.checked })}
            />
          </div>
          <label className="select-field">
            合成モード
            <select
              value={settings.blend}
              onChange={(e) =>
                setSettings({ blend: e.target.value as typeof settings.blend })
              }
            >
              <option value="normal">通常・Normal</option>
              <option value="screen">スクリーン・Screen</option>
              <option value="multiply">乗算・Multiply</option>
            </select>
          </label>
          <label className="select-field">
            スタンプ素材
            <select
              value={settings.stamp}
              onChange={(e) =>
                setSettings({ stamp: e.target.value as typeof settings.stamp })
              }
            >
              <option value="type">特徴の種類に応じて自動選択</option>
              <option value="star">星・Star</option>
              <option value="planet">惑星・Planet</option>
              <option value="glitter">きらめき・Glitter</option>
            </select>
          </label>
          <fieldset className="display-options">
            <legend>オーバーレイ表示</legend>
            <label>
              <input
                type="checkbox"
                checked={settings.showLandmarks}
                onChange={(e) =>
                  setSettings({ showLandmarks: e.target.checked })
                }
              />{" "}
              ランドマーク478点
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.showMesh}
                onChange={(e) => setSettings({ showMesh: e.target.checked })}
              />{" "}
              顔メッシュのワイヤー
            </label>
          </fieldset>
          <div className="small-note">
            <strong>ブラウザ内で処理します</strong>
            <p>
              毎フレームの追従ではAI
              APIを呼びません。撮影時のアンカーを現在の顔座標に適用します。
            </p>
          </div>
          <div className="selected-template">
            <small>性能目標</small>
            <strong>30 FPS以上</strong>
            <span>下部のLIVE METRICSで実測値を確認できます。</span>
          </div>
        </aside>
      </div>
    </>
  );
}
