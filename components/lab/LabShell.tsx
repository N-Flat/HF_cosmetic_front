"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  FlaskConical,
  SlidersHorizontal,
  Camera,
  Layers3,
  ScanFace,
  ArrowUpRight,
} from "lucide-react";
import { useLabStore } from "@/store/labStore";
import { checkConnection } from "@/lib/ai/client";
import { DebugPanel } from "./DebugPanel";
const nav = [
  { href: "/lab", name: "テスト設定", en: "SETUP", icon: SlidersHorizontal },
  { href: "/lab/capture", name: "顔の撮影", en: "CAPTURE", icon: Camera },
  { href: "/lab/result", name: "解析結果", en: "RESULT", icon: Layers3 },
  {
    href: "/lab/mirror",
    name: "リアルタイムミラー",
    en: "MIRROR",
    icon: ScanFace,
  },
];
export function LabShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    mock = useLabStore((s) => s.mock),
    health = useLabStore((s) => s.health);
  useEffect(() => {
    void checkConnection();
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <aside className="sidebar">
        <Link href="/lab" className="brand" aria-label="Face Lab COSME 2126">
          <span className="brand-mark">
            <FlaskConical size={25} />
          </span>
          <span>
            Face Lab<small>COSME 2126</small>
          </span>
        </Link>
        <div className="workspace-label">DEVELOPMENT WORKSPACE</div>
        <nav aria-label="テスト画面">
          {nav.map((n, i) => (
            <Link
              key={n.href}
              aria-label={n.name}
              title={n.name}
              href={n.href}
              className={`nav-link ${path.replace(/\/$/, "") === n.href ? "active" : ""}`}
              aria-current={
                path.replace(/\/$/, "") === n.href ? "page" : undefined
              }
            >
              <n.icon size={19} />
              <span>
                {n.name}
                <small>{n.en}</small>
              </span>
              <span className="nav-number">0{i + 1}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="tiny-orbit" />
            <p>
              画像はセッション内で保持します。
              <br />
              <strong>再読み込みすると初期化されます。</strong>
            </p>
          </div>
          <span className="version">
            TEST BUILD{" "}
            <span>
              v1.0.0 <ArrowUpRight size={12} />
            </span>
          </span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {nav.find((n) => n.href === path.replace(/\/$/, ""))?.name ||
                "Face Lab"}
            </strong>
          </div>
          <div className="topbar-status">
            <span className={`status-dot ${health === "ok" ? "green" : ""}`} />
            {mock
              ? "モックモード"
              : health === "ok"
                ? "API接続済み"
                : "実APIモード"}
            <span className="test-tag">EXPERIMENTAL</span>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <DebugPanel />
      </div>
    </div>
  );
}
