# COSME 2126 · Face Lab

顔認識・顔加工APIを検証するNext.js + TypeScriptのテストアプリです。UIは日本語です。要件設計書（2026-10-15ドラフト）の4画面と常設デバッグパネルを実装しています。

## 起動

Node.js 22.13以上を使用してください。

```bash
git clone https://github.com/N-Flat/HF_cosmetic_front.git
cd HF_cosmetic_front
npm ci
npm run setup:vision
npm run dev
```

[http://localhost:3000/lab](http://localhost:3000/lab) を開きます。初期状態はモックモードです。「顔の撮影」→「サンプルで試す」→「この写真で解析」で、カメラやAI APIなしでも流れを確認できます。

スタンプPNGは `public/stamps/` に同梱しています。顔モデルとWASMはGitには含めず、初回に `npm run setup:vision` で `public/models/` と `public/wasm/` に用意します。モデルを再取得する場合も同じコマンドを実行してください。フォントはGoogle Fontsを使用し、未接続時はシステムフォントにフォールバックします。

## 必要なダウンロードとパッケージ

| 分類 | 必要なもの | 用意する方法 |
| --- | --- | --- |
| 開発環境 | Node.js 22.13以上（推奨：このアプリの動作確認に使用した24系）とnpm | [Node.js公式](https://nodejs.org/en/download)からインストール。npmも同梱 |
| ソース取得 | Git | [Git公式](https://git-scm.com/downloads)からインストール |
| アプリ本体 | Next.js、React、React DOM、TypeScript | `npm ci` で一括インストール |
| 顔の追従 | `@mediapipe/tasks-vision` 0.10.32 | `npm ci` で一括インストール |
| スタンプ描画 | `three` | `npm ci` で一括インストール |
| 画面間の状態 | `zustand` | `npm ci` で一括インストール |
| UIアイコン | `lucide-react` | `npm ci` で一括インストール |
| 開発・検証 | ESLint、`eslint-config-next`、`tsx`、各`@types/*` | `npm ci` で一括インストール |
| 顔モデル | `face_landmarker.task`（公式float16/v1、約3.6MB） | `npm run setup:vision` でダウンロード |
| WASM | MediaPipeの実行ファイル | 同じコマンドでインストール済みパッケージからコピー |
| 実行ブラウザ | Chrome等のWebカメラ対応ブラウザ | カメラはlocalhostまたはHTTPSで使用 |

個々のnpmパッケージを手作業で追加する必要はありません。`package-lock.json` を共有し、`npm ci` で同じバージョンを再現します。最初の依存関係インストールとモデル取得にはインターネット接続が必要です。

このフロントエンドだけならPython、FastAPI、PostgreSQL、Dockerは不要です。実際のAI解析・画像合成には別のPython APIサーバーが必要ですが、そのサーバーのPythonパッケージはこのリポジトリでは管理していません。バックエンド担当の環境構築手順を確認してください。

## 実際のAPIをつなぐ（推奨）

`.env.example` を `.env.local` にコピーして、以下を設定します。

```dotenv
AI_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_AI_MOCK=false
NEXT_PUBLIC_FACE_MODEL_VERSION=face_landmarker-float16-v1
```

1. Python APIを起動します。
2. Next.jsを再起動します。ビルド済み環境では再ビルドも必要です。
3. 設定画面の「API Base URL」は空欄にします。
4. 「API接続を確認」で `/health` と `/v1/templates` を確認します。
5. テンプレートを選び、撮影して解析します。

ブラウザは `/ai/*` の同一オリジンだけに送信し、`next.config.ts` のrewritesが設定先のAPIへ中継します。URLにAPIエンドポイント（`/health` や `/v1/analyze`）を含めないでください。

画面でBase URLを入力した場合は、ブラウザからそのURLへ直接接続します。この場合はAPI側でアプリのオリジンをCORSで許可してください。HTTPSの共有デモからHTTPやlocalhostのAPIに接続する場合はブラウザの制限があるため、ローカルのNext.jsアプリを使用してください。APIキーをURLに含める方式には対応していません。

**URLだけで接続できる条件は、APIが設計書の契約に対応していることです。** 応答形式が異なる場合は `lib/ai/client.ts`、`types.ts`、`validation.ts` を調整します。AIによる特徴検出・背景や衣服の合成自体はPython APIが担当します。

## 画面

| パス           | 機能                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `/lab`         | モック／実API切替、接続確認、テンプレート、テストメモ、CSV、自動撮影条件、モデル読み込み確認                  |
| `/lab/capture` | 前面カメラ、顔の条件判定、安定待機＋3秒自動撮影、確認、撮り直し、JPEG化、写真アップロード                     |
| `/lab/result`  | 元画像オーバーレイ、478点、bbox、特徴と信頼度、アンカー三角形、特徴行のホバー／フォーカス、合成結果、応答時間 |
| `/lab/mirror`  | MediaPipe VIDEO追従、Three.js Sprite、One Euro Filter、通常／スクリーン／乗算、メッシュ・点、スタンプ素材選択 |

カメラ画像と描画は表示だけ鏡像にします。送信するJPEGは反転せず、長辺1920px以下、品質0.92です。画像とログはZustandのメモリに保持し、ページ間の移動で維持、再読み込みで初期化します。Blob URLは使用終了時に破棄します。実APIへの写真送信後の保存方針はAPI側の実装に依存します。

解析と合成は `Promise.allSettled` で同時に呼び出し、一方の失敗が他方の結果表示を妨げません。30秒でタイムアウトし、エラーコードと日本語の対処案を表示します。CSVにはモック／実APIを区別する `mode` 列を追加し、数式として実行される可能性のあるセルを無害化しています。

## 顔モデルと座標

- MediaPipe Tasks Vision `0.10.32`、モデルは公式の `face_landmarker/float16/1`。
- Python担当と `public/models/face_landmarker.task` の同一ファイルを共有してください。`/health` のモデル名と表示用の環境変数をそろえます。文字列の一致だけではファイル同一性を保証しないため、ハッシュでも確認してください。
- API: xyは左上原点、右が+x、下が+yの0〜1正規化座標。bboxは `[x,y,w,h]`。transformは設計書どおりrow-majorの16要素として受信します。
- ブラウザ: MediaPipeの行列はcolumn-majorとして姿勢に使用し、APIのtransformとは混在させません。
- アンカー: `b0 * L[t0] + b1 * L[t1] + b2 * L[t2]`。三角形の頂点番号、重み合計、特徴座標を実行時に検証します。
- 複数人では最初に最大面積の顔を選択し、以後は中心の連続性で追従対象を維持します。見失った場合はスタンプを消し、1.5秒後に再選択します。人物の本人識別は行いません。交差・遮蔽時の完全な同一人物維持は保証していません。
- 特徴が0件なら頬と額の固定アンカーにテスト用スタンプを表示します。

## モックと共有デモ

モックのランドマークと特徴は合成したテスト値です。カメラで撮影した場合は撮影時のブラウザランドマークを利用します。アップロードでは例示座標です。モック合成は**元の画像をそのまま返します**。肌の特徴や背景を実際に検出・合成した結果ではなく、モック時間を速度評価に使うこともできません。

```bash
npm run build:demo
```

静的デモを `out/` に生成します。静的ホスティングにはNext.jsのサーバーがないため `/ai` 中継はありません。実APIをつなぐ際は画面のBase URLにHTTPS APIを入力し、API側のCORSを許可してください。out/ を静的ホスティングへ配信できます。この静的出力とは別に、VercelではNext.jsサーバーとしてデモを配信します。

通常のサーバー実行は `npm run build && npm start` です。こちらでは `/ai` 中継が有効です。

## 検証

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:api` はポート8000に契約確認用サーバーを起動します。AI処理は行わず、960×1200の内蔵合成サンプル専用です。`/health`、`/v1/templates`、multipartの `image` と `template_id`、合成だけ失敗するケースを確認できます。実APIの代わりに誤って運用しないでください。

確認済み：モックの撮影確認から結果表示、モデルとWASMの初期化、実HTTPの `/ai` 中継、直接URLの接続、分析成功＋合成失敗の独立表示、CSVダウンロード、375／768／1280pxでの横スクロールなし。実カメラでの自動撮影・追従、展示PCで30fps、±45度、5人での位置一致、iPad Safari、実AIの精度・処理時間は実機受け入れテストが必要です。

MediaPipeは初期化情報をconsole.warn／console.errorに出す場合があります（例：`INFO: Created TensorFlow Lite XNNPACK delegate for CPU.`）。モデル確認が成功している場合、このINFO行自体は推論失敗ではありません。

依存関係：実行時依存は `npm audit --omit=dev` で既知の指摘0件。開発用ESLintの間接依存 `braces` に未修正のDoS指摘があり、同じ経路の5パッケージがauditに表示されます。フレームワークを不整合な旧版に下げる自動修正は適用していません。

## 主な構成

- `app/lab/`: Server Componentのページと共通レイアウト
- `components/lab/`: カメラ、設定、結果、ミラー、デバッグのクライアントUI
- `lib/ai/`: API契約、実行時検証、モック、通信・計測
- `lib/face/`: モデル初期化、姿勢、撮影条件、アンカー、平滑化、Three.js描画
- `store/labStore.ts`: セッション状態
- `public/models/`, `public/wasm/`: 初回セットアップで生成する顔モデルとWASM（Git管理外）
- `public/stamps/`: Gitに含めるスタンプPNG
- `tests/core.test.ts`: API契約、部分失敗、座標計算、撮影判定、CSV、UI言語のテスト

参考：[Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)、[静的エクスポート](https://nextjs.org/docs/app/guides/static-exports)、[MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)。


## Vercelでチームに共有する

デモURL：[Face Lab](https://cosme2126-face-lab.vercel.app/lab)

2026-10-20、ProductionのReadyを確認。認証なしのHTTP 200、日本語表示、モデルとWASMの初期化、サンプル解析から結果表示まで確認済みです。

`vercel.json` はNext.jsを指定し、`npm ci` → `npm run setup:vision && npm run build` の順で実行します。モデルとWASMはビルド中に用意するため、ローカルの大きなモデルファイルをアップロードする必要はありません。`.vercelignore` で `.env*`、`.openai`、ローカルビルド成果物を除外しています。

初期状態はモックモードです。チームメンバーは「顔の撮影」→「サンプルで試す」→「この写真で解析」でAPIなしでも確認できます。カメラをオンにすると、その端末のカメラを使います。

実APIを使うときは、チームから到達できるAPIを用意し、Vercelの環境変数 `AI_API_BASE_URL` に設定して再デプロイしてください。設定画面のBase URLは空欄のままで `/ai` 中継を利用できます。Vercelサーバーから各自PCの `localhost:8000` に接続することはできません。画面からHTTPS APIのURLを直接指定する場合は、API側でデモのオリジンをCORSで許可してください。

再デプロイ：

```bash
npx vercel --scope jeongbinparks-projects-39d3ffc1 deploy --project cosme2126-face-lab --prod
```
