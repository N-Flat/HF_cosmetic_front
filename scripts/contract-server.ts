/** HTTP contract fixture only. Does not perform AI inference or era compositing. */
import { createServer } from "node:http";
import { mockAnalyze } from "../lib/ai/mock";
const port = Number(process.env.CONTRACT_PORT || 8000);
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  const send = (status: number, data: unknown) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    send(200, {
      status: "ok",
      models: {
        landmarker: "face_landmarker-float16-v1",
        features: "CONTRACT_FIXTURE_ONLY",
      },
    });
    return;
  }
  if (req.method === "GET" && req.url === "/v1/templates") {
    send(200, {
      templates: [
        { id: "past_city", era: "past", label: "接続確認用・元画像を返す" },
        {
          id: "fail_composite",
          era: "future",
          label: "エラー確認用・合成のみ失敗",
        },
      ],
    });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 21 * 1024 * 1024) {
        send(413, {
          error: { code: "INVALID_IMAGE", message: "画像が大きすぎます。" },
        });
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    const request = new Request("http://localhost" + req.url, {
      method: "POST",
      headers: { "content-type": req.headers["content-type"] || "" },
      body,
    });
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.type !== "image/jpeg") {
      send(422, {
        error: {
          code: "INVALID_IMAGE",
          message: "imageにJPEGを指定してください。",
        },
      });
      return;
    }
    if (req.url === "/v1/analyze") {
      const data = mockAnalyze(960, 1200);
      data.request_id = "fixture-" + crypto.randomUUID();
      data.warnings = ["CONTRACT_FIXTURE_ONLY"];
      send(200, data);
      return;
    }
    if (req.url === "/v1/composite") {
      const id = form.get("template_id");
      if (id === "fail_composite") {
        send(422, {
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: "部分失敗を確認するためのテストエラーです。",
          },
        });
        return;
      }
      if (id !== "past_city") {
        send(422, {
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: "テンプレートがありません。",
          },
        });
        return;
      }
      send(200, {
        request_id: "fixture-" + crypto.randomUUID(),
        template_id: id,
        image:
          "data:image/jpeg;base64," +
          Buffer.from(await image.arrayBuffer()).toString("base64"),
        width: 960,
        height: 1200,
        timings_ms: { total: 5 },
      });
      return;
    }
    send(404, {
      error: { code: "NOT_FOUND", message: "エンドポイントがありません。" },
    });
  } catch {
    send(422, {
      error: {
        code: "INVALID_IMAGE",
        message: "multipart/form-dataのimageを確認してください。",
      },
    });
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Contract fixture at http://127.0.0.1:${port} (NO AI, synthetic sample only)`,
  ),
);
