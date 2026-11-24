import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AnalyzerError } from "../src/analyzer.js";
import { createApp, MAX_IMAGE_BYTES } from "../src/app.js";
import { fakeAnalyzer, sampleDiagnosis, tinyJpeg } from "./helpers.js";

// Silence expected error logs from the 502 tests.
vi.spyOn(console, "error").mockImplementation(() => {});

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(createApp({ analyzer: fakeAnalyzer() })).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/diagnose", () => {
  it("returns the diagnosis for a valid JPEG", async () => {
    const app = createApp({ analyzer: fakeAnalyzer() });
    const res = await request(app)
      .post("/api/diagnose")
      .attach("image", tinyJpeg, { filename: "leaf.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleDiagnosis);
  });

  it("passes the image bytes and mime type to the analyzer", async () => {
    const analyze = vi.fn(async () => sampleDiagnosis);
    const app = createApp({ analyzer: { analyze } });
    await request(app)
      .post("/api/diagnose")
      .attach("image", tinyJpeg, { filename: "leaf.webp", contentType: "image/webp" });

    expect(analyze).toHaveBeenCalledOnce();
    const arg = analyze.mock.calls[0] as unknown as [{ buffer: Buffer; mimeType: string }];
    expect(arg[0].mimeType).toBe("image/webp");
    expect(arg[0].buffer.equals(tinyJpeg)).toBe(true);
  });

  it("rejects an unsupported file type with 400", async () => {
    const res = await request(createApp({ analyzer: fakeAnalyzer() }))
      .post("/api/diagnose")
      .attach("image", Buffer.from("GIF89a"), { filename: "anim.gif", contentType: "image/gif" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Formato no permitido/);
  });

  it("rejects files bigger than 5 MB with 413", async () => {
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1, 0);
    const res = await request(createApp({ analyzer: fakeAnalyzer() }))
      .post("/api/diagnose")
      .attach("image", big, { filename: "big.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/5 MB/);
  });

  it("returns 400 when no file is sent", async () => {
    const res = await request(createApp({ analyzer: fakeAnalyzer() })).post("/api/diagnose");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No se recibió ninguna imagen/);
  });

  it("returns 400 when the file is sent under the wrong field name", async () => {
    const res = await request(createApp({ analyzer: fakeAnalyzer() }))
      .post("/api/diagnose")
      .attach("photo", tinyJpeg, { filename: "leaf.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(400);
  });

  it("returns 502 when the analyzer throws", async () => {
    const app = createApp({
      analyzer: fakeAnalyzer(async () => {
        throw new AnalyzerError("Gemini responded with HTTP 500");
      }),
    });
    const res = await request(app)
      .post("/api/diagnose")
      .attach("image", tinyJpeg, { filename: "leaf.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/No pudimos obtener un diagnóstico/);
  });

  it("returns 502 when the model output is invalid JSON", async () => {
    // Simulates GeminiPlantAnalyzer rejecting output that failed zod validation.
    const app = createApp({
      analyzer: fakeAnalyzer(async () => {
        throw new AnalyzerError("Gemini returned output that does not match the diagnosis schema");
      }),
    });
    const res = await request(app)
      .post("/api/diagnose")
      .attach("image", tinyJpeg, { filename: "leaf.png", contentType: "image/png" });

    expect(res.status).toBe(502);
    expect(res.body).not.toHaveProperty("diagnosis");
  });

  it("returns isPlant=false for a non-plant photo", async () => {
    const notAPlant = {
      ...sampleDiagnosis,
      isPlant: false,
      plantName: "",
      healthStatus: "unknown" as const,
      diagnosis: "La imagen no muestra una planta.",
      symptoms: [],
      treatment: [],
      prevention: [],
      speechSummary: "No detecté ninguna planta en la foto. Sube otra imagen.",
    };
    const res = await request(createApp({ analyzer: fakeAnalyzer(async () => notAPlant) }))
      .post("/api/diagnose")
      .attach("image", tinyJpeg, { filename: "mug.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.isPlant).toBe(false);
    expect(res.body.healthStatus).toBe("unknown");
  });

  it("returns 429 after the rate limit is reached", async () => {
    const app = createApp({ analyzer: fakeAnalyzer(), rateLimit: { limit: 2, windowMs: 60_000 } });
    const send = () =>
      request(app)
        .post("/api/diagnose")
        .attach("image", tinyJpeg, { filename: "leaf.jpg", contentType: "image/jpeg" });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
