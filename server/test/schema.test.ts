import { describe, expect, it } from "vitest";
import { buildGeminiRequest } from "../src/geminiAnalyzer.js";
import { buildDiagnosisPrompt } from "../src/prompt.js";
import { createRateLimiter } from "../src/rateLimit.js";
import { diagnosisSchema, geminiResponseSchema, parseDiagnosis } from "../src/schema.js";
import { sampleDiagnosis, tinyJpeg } from "./helpers.js";

describe("diagnosis schema", () => {
  it("parses a valid JSON diagnosis", () => {
    expect(parseDiagnosis(JSON.stringify(sampleDiagnosis))).toEqual(sampleDiagnosis);
  });

  it("returns null for text that is not JSON", () => {
    expect(parseDiagnosis("Lo siento, no puedo ayudar con eso.")).toBeNull();
  });

  it("returns null when a field has an unexpected value", () => {
    const bad = { ...sampleDiagnosis, healthStatus: "dying" };
    expect(parseDiagnosis(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    const { speechSummary: _omit, ...withoutSummary } = sampleDiagnosis;
    expect(parseDiagnosis(JSON.stringify(withoutSummary))).toBeNull();
  });

  it("keeps the Gemini responseSchema in sync with the zod schema", () => {
    const zodKeys = Object.keys(diagnosisSchema.shape).sort();
    expect(Object.keys(geminiResponseSchema.properties).sort()).toEqual(zodKeys);
    expect([...geminiResponseSchema.required].sort()).toEqual(zodKeys);
  });
});

describe("prompt builder", () => {
  it("asks for Spanish (Mexico) output and handles non-plant images", () => {
    const prompt = buildDiagnosisPrompt();
    expect(prompt).toMatch(/español de México/);
    expect(prompt).toMatch(/isPlant=false/);
    expect(prompt).toMatch(/speechSummary/);
  });

  it("builds a Gemini request with inline image data and JSON output", () => {
    const body = buildGeminiRequest({ buffer: tinyJpeg, mimeType: "image/jpeg" });
    const [imagePart, textPart] = body.contents[0].parts as [
      { inline_data: { mime_type: string; data: string } },
      { text: string },
    ];
    expect(imagePart.inline_data.mime_type).toBe("image/jpeg");
    expect(imagePart.inline_data.data).toBe(tinyJpeg.toString("base64"));
    expect(textPart.text).toBe(buildDiagnosisPrompt());
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toBe(geminiResponseSchema);
  });
});

describe("rate limiter", () => {
  it("opens a new window after windowMs has passed", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => clock });
    const statuses: number[] = [];
    const run = () => {
      let status = 200;
      const res = {
        setHeader: () => res,
        status: (code: number) => {
          status = code;
          return res;
        },
        json: () => res,
      };
      limiter({ ip: "1.2.3.4" } as any, res as any, () => {});
      statuses.push(status);
    };

    run(); // allowed
    run(); // blocked
    clock = 1000;
    run(); // allowed again
    expect(statuses).toEqual([200, 429, 200]);
  });
});
