"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, ScanFace } from "lucide-react";
import { useLabStore } from "@/store/labStore";
import { createLandmarker } from "@/lib/face/landmarker";
import { faceBounds, largestFace } from "@/lib/face/anchor";
import { captureConditions, poseFromMatrix } from "@/lib/face/pose";
import { jpegPhoto } from "@/lib/face/photo";
import { mockAnalyze } from "@/lib/ai/mock";
import type { Vec3 } from "@/lib/ai/types";
import type { createMirrorRenderer } from "@/lib/face/mirror-renderer";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
type Condition = { label: string; ok: boolean; help: string };
export function CameraView({ mode }: { mode: "capture" | "mirror" }) {
  const videoRef = useRef<HTMLVideoElement>(null),
    overlayRef = useRef<HTMLCanvasElement>(null),
    threeRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false),
    [retry, setRetry] = useState(0),
    [status, setStatus] = useState(
      "カメラをオンにすると顔の追従を開始します。",
    ),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null),
    [conditions, setConditions] = useState<Condition[]>([]),
    [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false,
      raf = 0,
      stream: MediaStream | null = null,
      landmarker: Awaited<ReturnType<typeof createLandmarker>> | null = null,
      mirror: ReturnType<typeof createMirrorRenderer> | null = null;
    let stableSince = 0,
      lastVideoTime = -1,
      lastProcess = 0,
      fpsStart = performance.now(),
      frames = 0,
      lastUi = 0,
      prevCenter: { x: number; y: number } | null = null,
      previousSeen = 0;
    const fail = (e: unknown) => {
      if (cancelled) return;
      setReady(false);
      const name = e instanceof Error ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "カメラの使用がブロックされています。ブラウザのアドレスバーでカメラを許可して再試行してください。"
          : name === "NotFoundError"
            ? "使用できるカメラがありません。写真をアップロードしてテストできます。"
            : name === "NotReadableError"
              ? "別のアプリがカメラを使用しています。カメラの使用を終了して再試行してください。"
              : "顔モデルまたはカメラを起動できませんでした。HTTPSまたはlocalhostで開き、モデルファイルを確認して再試行してください。",
      );
      useLabStore.getState().setMetrics({ error: "CAMERA_OR_MODEL_ERROR" });
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      landmarker = null;
      mirror?.dispose();
      mirror = null;
    };
    const start = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          throw new Error("カメラはHTTPSまたはlocalhostで使用してください。");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        landmarker = await createLandmarker();
        if (cancelled) {
          landmarker.close();
          return;
        }
        if (mode === "mirror" && threeRef.current) {
          const { createMirrorRenderer } =
            await import("@/lib/face/mirror-renderer");
          if (cancelled) return;
          mirror = createMirrorRenderer(threeRef.current);
        }
        setReady(true);
        setStatus(
          mode === "capture"
            ? "顔をガイドの中に合わせてください。"
            : "顔を検出しています。",
        );
        const sample = document.createElement("canvas");
        sample.width = 32;
        sample.height = 32;
        const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
        const tick = async (now: number) => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
          if (
            now - lastProcess < 30 ||
            video.currentTime === lastVideoTime ||
            video.readyState < 2
          )
            return;
          lastProcess = now;
          lastVideoTime = video.currentTime;
          try {
            const begin = performance.now(),
              result = landmarker!.detectForVideo(video, now),
              inference = performance.now() - begin;
            frames++;
            if (now - fpsStart >= 1000) {
              useLabStore.getState().setMetrics({
                fps: (frames * 1000) / (now - fpsStart),
                inference,
                faces: result.faceLandmarks.length,
              });
              fpsStart = now;
              frames = 0;
            }
            const faces = result.faceLandmarks.map((face) =>
              face.map((p) => [p.x, p.y, p.z] as Vec3),
            );
            const overlay = overlayRef.current!,
              ctx = overlay.getContext("2d")!;
            if (
              overlay.width !== video.videoWidth ||
              overlay.height !== video.videoHeight
            ) {
              overlay.width = video.videoWidth;
              overlay.height = video.videoHeight;
            }
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            let selected = faces.length ? largestFace(faces) : -1;
            if (prevCenter && faces.length) {
              const distances = faces.map((f) => {
                const b = faceBounds(f);
                return Math.hypot(
                  b.x + b.w / 2 - prevCenter!.x,
                  b.y + b.h / 2 - prevCenter!.y,
                );
              });
              selected = distances.indexOf(Math.min(...distances));
              if (distances[selected] > 0.18) selected = -1;
            }
            if (selected < 0) {
              stableSince = 0;
              if (now - previousSeen > 1500) prevCenter = null;
              mirror?.clear();
              if (now - lastUi > 150) {
                setCount(null);
                setConditions([]);
                setStatus("顔をガイドの中に合わせてください。");
                lastUi = now;
              }
              return;
            }
            const points = faces[selected],
              b = faceBounds(points);
            prevCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
            previousSeen = now;
            const matrix =
              result.facialTransformationMatrixes[selected]?.data || [];
            const pose = poseFromMatrix(matrix);
            const state = useLabStore.getState();
            if (mode === "mirror") {
              const features = state.analyze?.features.length
                ? state.analyze.features
                : mockAnalyze(video.videoWidth, video.videoHeight, points)
                    .features;
              mirror?.draw(
                points,
                features,
                now,
                state.settings,
                pose.roll,
                video.videoWidth,
                video.videoHeight,
              );
              if (state.settings.showMesh) {
                ctx.strokeStyle = "rgba(109,222,180,.3)";
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                for (const edge of FaceLandmarker.FACE_LANDMARKS_TESSELATION) {
                  const a = points[edge.start],
                    c = points[edge.end];
                  ctx.moveTo(a[0] * overlay.width, a[1] * overlay.height);
                  ctx.lineTo(c[0] * overlay.width, c[1] * overlay.height);
                }
                ctx.stroke();
              }
              if (state.settings.showLandmarks) {
                ctx.fillStyle = "#9af0d0";
                for (const p of points) {
                  ctx.beginPath();
                  ctx.arc(
                    p[0] * overlay.width,
                    p[1] * overlay.height,
                    1.4,
                    0,
                    Math.PI * 2,
                  );
                  ctx.fill();
                }
              }
              if (now - lastUi > 180) {
                setStatus(`${faces.length}人を検出・選択した顔を追従中`);
                lastUi = now;
              }
              return;
            }
            let brightness = 0;
            if (sampleCtx) {
              sampleCtx.drawImage(
                video,
                Math.max(0, b.x) * video.videoWidth,
                Math.max(0, b.y) * video.videoHeight,
                Math.max(1, b.w * video.videoWidth),
                Math.max(1, b.h * video.videoHeight),
                0,
                0,
                32,
                32,
              );
              const data = sampleCtx.getImageData(0, 0, 32, 32).data;
              for (let i = 0; i < data.length; i += 4)
                brightness +=
                  0.2126 * data[i] +
                  0.7152 * data[i + 1] +
                  0.0722 * data[i + 2];
              brightness /= 1024;
            }
            const blink = Object.fromEntries(
              (result.faceBlendshapes[selected]?.categories || []).map((c) => [
                c.categoryName,
                c.score,
              ]),
            );
            const checks = captureConditions(
                points,
                matrix,
                blink,
                brightness,
                state.rules,
              ),
              ok = checks.every((c) => c.ok);
            if (ok) {
              if (!stableSince) stableSince = now;
              const elapsed = now - stableSince - state.rules.stableMs;
              if (elapsed >= 3000) {
                cancelAnimationFrame(raf);
                raf = 0;
                const photo = await jpegPhoto(
                  video,
                  video.videoWidth,
                  video.videoHeight,
                );
                if (cancelled) return;
                state.set({
                  photo: photo.blob,
                  photoSize: { w: photo.w, h: photo.h },
                  photoLandmarks: points,
                  analyze: null,
                  composite: null,
                  errors: {},
                });
                setEnabled(false);
                return;
              }
              if (now - lastUi > 150) {
                setCount(elapsed >= 0 ? 3 - Math.floor(elapsed / 1000) : null);
                setStatus(
                  elapsed >= 0
                    ? "動かずに、そのままお待ちください。"
                    : "そのまま姿勢を保ってください。",
                );
              }
            } else {
              stableSince = 0;
              if (now - lastUi > 150) {
                setCount(null);
                setStatus(checks.find((c) => !c.ok)!.help);
              }
            }
            if (now - lastUi > 150) {
              setConditions(checks);
              lastUi = now;
            }
          } catch (e) {
            cancelAnimationFrame(raf);
            fail(e);
          }
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        fail(e);
      }
    };
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      landmarker = null;
      mirror?.dispose();
      mirror = null;
      useLabStore.getState().setMetrics({ fps: 0, inference: 0, faces: 0 });
    };
  }, [enabled, retry, mode]);
  return (
    <div className="camera-group">
      <div className={`camera-stage ${ready ? "is-ready" : ""}`}>
        <video
          ref={videoRef}
          className="mirrored"
          playsInline
          muted
          aria-label="フロントカメラの映像"
          aria-hidden={!ready}
        />
        <canvas
          ref={threeRef}
          className="camera-layer mirrored"
          aria-hidden="true"
        />
        <canvas
          ref={overlayRef}
          className="camera-layer mirrored"
          aria-hidden="true"
        />
        {ready && mode === "capture" && (
          <div
            className={`face-guide ${conditions.length && conditions.every((c) => c.ok) ? "valid" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {!ready && (
          <div className="camera-placeholder">
            <div className="scan-symbol">
              <ScanFace size={66} strokeWidth={1} />
            </div>
            <h2>
              {enabled && !error
                ? "モデルを準備中"
                : "カメラの準備はできましたか？"}
            </h2>
            <p>{error || "明るい場所で顔がはっきり映るようにしてください。"}</p>
            {(!enabled || error) && (
              <button
                className="button light"
                onClick={() => {
                  setError(null);
                  setReady(false);
                  setStatus("カメラと顔モデルを準備しています…");
                  setEnabled(true);
                  setRetry((n) => n + 1);
                }}
              >
                {error ? <RefreshCw size={17} /> : <Camera size={17} />}{" "}
                {error ? "再試行" : "カメラをオンにする"}
              </button>
            )}
          </div>
        )}
        {count !== null && ready && (
          <div className="countdown" role="status">
            {count}
          </div>
        )}
        {ready && (
          <div className="camera-caption">
            <span className="live-dot" />
            {status}
            <button
              aria-label="カメラをオフにする"
              onClick={() => {
                setEnabled(false);
                setReady(false);
                setConditions([]);
                setCount(null);
              }}
            >
              <CameraOff size={16} />
            </button>
          </div>
        )}
        <div className="camera-corner">
          FRONT CAMERA <span>LOCAL PROCESSING</span>
        </div>
      </div>
      {mode === "capture" && (
        <div className="condition-strip" aria-live="polite">
          {conditions.length ? (
            conditions.map((c) => (
              <span key={c.label} className={c.ok ? "passed" : ""}>
                {c.ok ? "✓" : "○"} {c.label}
              </span>
            ))
          ) : (
            <span>顔の大きさ・位置・向き・目・明るさを確認します。</span>
          )}
        </div>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
