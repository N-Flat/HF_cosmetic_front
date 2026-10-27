"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-page">
      <p className="eyebrow">UNEXPECTED ERROR</p>
      <h1>画面を表示できませんでした</h1>
      <p>
        もう一度お試しください。解決しない場合はページを再読み込みしてください。
      </p>
      <button className="button primary" onClick={reset}>
        再試行
      </button>
    </div>
  );
}
