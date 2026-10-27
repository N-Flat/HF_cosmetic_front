import Link from "next/link";
export default function Page() {
  return (
    <main className="entry">
      <p className="eyebrow">COSME 2126</p>
      <h1>Face Lab</h1>
      <p>顔解析とリアルタイム追従をテストします。</p>
      <Link href="/lab" className="button primary">
        テストアプリを開く →
      </Link>
    </main>
  );
}
