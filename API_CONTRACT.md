# Python AI API 連携契約

2026-10-15の設計書ドラフトに準拠しています。Python担当との最終合意は未確認です。

| メソッド | エンドポイント  | リクエスト                                     | 応答                                                       |
| -------- | --------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| GET      | `/health`       | なし                                           | `{status:"ok", models:{landmarker:"...", features:"..."}}` |
| GET      | `/v1/templates` | なし                                           | `{templates:[{id, era, label, thumbnail?}]}`               |
| POST     | `/v1/analyze`   | multipart `image`: JPEG                        | `AnalyzeResponse`                                          |
| POST     | `/v1/composite` | multipart `image`: JPEG、`template_id`: string | `CompositeResponse`                                        |

正確な型は `lib/ai/types.ts`、実行時の受け入れ条件は `lib/ai/validation.ts` を参照してください。

## 座標・必須項目

`AnalyzeResponse` は `request_id`, `image.width/height`, `face.bbox`, `face.landmarks`（478点の `[x,y,z]`）, `face.transform`（row-majorの16要素）, `face.blendshapes`, `features`, `warnings`, `timings_ms` を返します。

各特徴には `id`, `type`（`mole/freckle/smile_line/other`）, `xy`, `uv`, `anchor.tri`（0〜477の整数3点）, `anchor.bary`（0〜1の重み3点・合計1）, `size`（画像幅に対する直径）, `confidence`（0〜1）が必要です。

xyとuvは0〜1、xyの原点は送信した未反転画像の左上です。bboxは `[x,y,w,h]`。ランドマークzはMediaPipeと同じ相対スケールです。

`CompositeResponse` は `request_id`, `template_id`, `image`（JPEG/PNG/WebPのbase64データURL）, `width`, `height`, `timings_ms` を返します。

`era` は `past/present/future`。`thumbnail` が `/v1/...` のような相対パスなら、プロキシ接続時は `/ai`、直接接続時はBase URLを付加します。画像ロード失敗時は既定の時代アイコンを表示します。

## エラー

4xx/5xxと以下のJSONを返します。

```json
{
  "error": {
    "code": "NO_FACE",
    "message": "顔を検出できませんでした。正面の写真でお試しください。"
  }
}
```

設計書のコード：`NO_FACE`, `INVALID_IMAGE`, `LOW_RESOLUTION`, `TEMPLATE_NOT_FOUND`, `INTERNAL`。複数顔は最大の顔を採用し `warnings: ["MULTIPLE_FACES"]` を返します。API由来の `error.message` はそのまま表示するため、利用者向けの日本語にし、スタックトレースや秘密情報を含めないでください。

## 合意が必要な項目

- 同じモデルファイルとそのハッシュ、`/health` に返すモデル名
- 顔の特徴とアンカーの座標定義・頂点番号
- テンプレートIDと利用可能な合成方式
- API起動場所とBase URL、直接接続する場合のCORS
- サーバーでの写真の取り扱いと保存方針
