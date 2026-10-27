import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Face Lab · COSME 2126",
  description: "顔解析・合成APIとリアルタイム顔追従の検証ツール",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
