import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-page">
      <p className="eyebrow">404</p>
      <h1>ページが見つかりません</h1>
      <Link href="/lab" className="button primary">
        テスト設定に戻る
      </Link>
    </main>
  );
}
