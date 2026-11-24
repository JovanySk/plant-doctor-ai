import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { buildGeminiRequest } from "../src/geminiAnalyzer.js";
import { tinyJpeg } from "./helpers.js";

describe("config", () => {
  it("fails fast when the API key is missing or still the placeholder", () => {
    expect(() => loadConfig({})).toThrow(/GEMINI_API_KEY/);
    expect(() => loadConfig({ GEMINI_API_KEY: "your_google_ai_studio_key_here" })).toThrow();
  });

  it("uses sensible defaults", () => {
    const config = loadConfig({ GEMINI_API_KEY: "test-key" });
    expect(config.model).toBe("gemini-3.5-flash");
    expect(config.thinkingLevel).toBe("low");
    expect(config.port).toBe(3001);
  });

  it("only adds thinkingConfig when a thinking level is set", () => {
    const image = { buffer: tinyJpeg, mimeType: "image/png" };
    expect(buildGeminiRequest(image, "low").generationConfig).toHaveProperty("thinkingConfig", {
      thinkingLevel: "low",
    });
    expect(buildGeminiRequest(image).generationConfig).not.toHaveProperty("thinkingConfig");
  });
});
