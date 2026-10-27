import test from "node:test";
import assert from "node:assert/strict";
import { mockAnalyze } from "../lib/ai/mock";
import { validAnalyze, validComposite } from "../lib/ai/validation";
import { anchorPosition, largestFace } from "../lib/face/anchor";
import { OneEuroFilter } from "../lib/face/smoothing";
import { captureConditions } from "../lib/face/pose";
import { csvCell, logsCsv } from "../lib/csv";
import { defaultRules, useLabStore } from "../store/labStore";
import { runAnalysis, validateApiUrl, checkConnection } from "../lib/ai/client";
import type { Vec3 } from "../lib/ai/types";
test("문서 형식의 478점 응답을 허용하고 잘못된 anchor, NaN 좌표, 누락 필드를 거부한다", () => {
  const value = mockAnalyze(960, 1200);
  assert.equal(validAnalyze(value), true);
  for (const mutate of [
    (v: typeof value) => {
      v.features[0].anchor.tri[0] = 478;
    },
    (v: typeof value) => {
      v.features[0].anchor.bary = [1, 1, 1];
    },
    (v: typeof value) => {
      v.features[0].xy[0] = NaN;
    },
    (v: typeof value) => {
      v.face.landmarks.pop();
    },
    (v: typeof value) => {
      v.face.blendshapes = { eyeBlinkLeft: NaN };
    },
  ]) {
    const v = structuredClone(value);
    mutate(v);
    assert.equal(validAnalyze(v), false);
  }
});
test("합성 데이터 URL의 MIME과 필수 응답 필드를 검증한다", () => {
  const c = {
    request_id: "1",
    template_id: "past_city",
    image: "data:image/jpeg;base64,YQ==",
    width: 100,
    height: 100,
    timings_ms: { total: 2 },
  };
  assert.equal(validComposite(c), true);
  assert.equal(validComposite({ ...c, image: "javascript:alert(1)" }), false);
  assert.equal(validComposite({ ...c, width: 0 }), false);
});
test("바리센트릭 anchor를 현재 랜드마크에 적용한다", () => {
  assert.deepEqual(
    anchorPosition({ tri: [0, 1, 2], bary: [0.2, 0.5, 0.3] }, [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]),
    [0.5, 0.3, 0],
  );
  assert.equal(
    anchorPosition({ tri: [0, 1, 9], bary: [0.2, 0.5, 0.3] }, [
      [0, 0, 0],
      [1, 0, 0],
    ]),
    null,
  );
});
test("두 얼굴 중 면적이 큰 얼굴로 추적을 시작한다", () => {
  assert.equal(
    largestFace([
      [
        [0, 0, 0],
        [0.1, 0.1, 0],
      ],
      [
        [0, 0, 0],
        [0.5, 0.4, 0],
      ],
    ]),
    1,
  );
});
test("촬영 조건: 밝기, 눈 깜빡임, 크기, 자세를 검사한다", () => {
  const points: Vec3[] = [
    [0.3, 0.2, 0],
    [0.7, 0.8, 0],
  ];
  const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert.ok(
    captureConditions(
      points,
      m,
      { eyeBlinkLeft: 0, eyeBlinkRight: 0 },
      100,
      defaultRules,
    ).every((c) => c.ok),
  );
  assert.equal(
    captureConditions(
      points,
      m,
      { eyeBlinkLeft: 0.8, eyeBlinkRight: 0 },
      100,
      defaultRules,
    )[3].ok,
    false,
  );
  assert.equal(
    captureConditions(
      points,
      m,
      { eyeBlinkLeft: 0, eyeBlinkRight: 0 },
      20,
      defaultRules,
    )[4].ok,
    false,
  );
});
test("One Euro 필터가 점프를 줄이고 시간 간격이 0이어도 유한값을 유지한다", () => {
  const f = new OneEuroFilter();
  assert.equal(f.filter(0, 0), 0);
  const smoothed = f.filter(1, 16);
  assert.ok(smoothed > 0 && smoothed < 1);
  assert.ok(Number.isFinite(f.filter(1, 16)));
});
test("CSV는 쉼표·따옴표·줄바꿈을 보존하고 스프레드시트 수식 주입을 차단한다", () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell("  @SUM(A1)"), '"\'  @SUM(A1)"');
  assert.ok(logsCsv([]).startsWith("\uFEFFdate,note"));
});
test("API 주소에서 인증 정보와 위험한 프로토콜을 거부한다", () => {
  assert.equal(
    validateApiUrl("http://localhost:8000/"),
    "http://localhost:8000",
  );
  assert.throws(() => validateApiUrl("javascript:alert(1)"));
  assert.throws(() => validateApiUrl("https://user:password@example.com"));
  assert.throws(() => validateApiUrl("https://example.com/?key=secret"));
});
test("실제 모드: health/templates 연결 및 분석 성공·합성 실패를 독립 처리하고 두 요청을 기록한다", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; body?: FormData }[] = [];
  const value = mockAnalyze(100, 100);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body as FormData | undefined });
    if (url.endsWith("/health"))
      return Response.json({ status: "ok", models: { landmarker: "test" } });
    if (url.endsWith("/v1/templates"))
      return Response.json({
        templates: [{ id: "past_city", era: "past", label: "Past" }],
      });
    if (url.endsWith("/analyze")) return Response.json(value);
    return Response.json(
      { error: { code: "TEMPLATE_NOT_FOUND", message: "unknown template" } },
      { status: 422 },
    );
  };
  try {
    useLabStore.setState({
      mock: false,
      apiUrl: "",
      photo: new Blob(["image"], { type: "image/jpeg" }),
      photoSize: { w: 100, h: 100 },
      logs: [],
      templateId: "past_city",
    });
    await checkConnection();
    assert.equal(useLabStore.getState().health, "ok");
    await runAnalysis();
    const state = useLabStore.getState();
    assert.equal(state.analyze?.request_id, value.request_id);
    assert.equal(state.composite, null);
    assert.match(state.errors.composite!, /TEMPLATE_NOT_FOUND/);
    assert.equal(state.logs.length, 2);
    assert.equal(state.busy, false);
    const post = calls.filter((c) => c.body);
    assert.equal(post.length, 2);
    assert.ok(post.every((c) => c.body?.get("image") instanceof Blob));
    assert.equal(post[1].body?.get("template_id"), "past_city");
    assert.ok(calls.every((c) => c.url.startsWith("/ai/")));
  } finally {
    globalThis.fetch = original;
  }
});

test("화면과 오류 메시지는 일본어이며 한국어 UI가 남아 있지 않다", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  async function scan(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const children = await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? scan(`${dir}/${e.name}`)
          : /\.(tsx?|css)$/.test(e.name)
            ? [`${dir}/${e.name}`]
            : [],
      ),
    );
    return children.flat();
  }
  for (const file of [
    ...(await scan("app")),
    ...(await scan("components")),
    ...(await scan("lib")),
  ])
    assert.equal(
      /[가-힣]/.test(await readFile(file, "utf8")),
      false,
      `${file} contains Korean UI text`,
    );
  assert.match(await readFile("app/layout.tsx", "utf8"), /lang="ja"/);
});
