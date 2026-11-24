import { AnalyzerError, type PlantAnalyzer, type PlantImage } from "./analyzer.js";
import { buildDiagnosisPrompt } from "./prompt.js";
import { geminiResponseSchema, parseDiagnosis, type Diagnosis } from "./schema.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** "low" makes Gemini 3.x models think less, so answers arrive in ~10 s instead of ~20-30 s. */
  thinkingLevel?: string;
}

/** The parts of Gemini's response that we actually read. */
interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

/** Builds the JSON body for generateContent. Exported so it can be unit-tested. */
export function buildGeminiRequest(image: PlantImage, thinkingLevel?: string) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: image.mimeType, data: image.buffer.toString("base64") } },
          { text: buildDiagnosisPrompt() },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
      ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
    },
  };
}

/**
 * Calls the Gemini REST API (generateContent) with the photo + prompt and
 * asks for JSON that follows our response schema.
 */
export class GeminiPlantAnalyzer implements PlantAnalyzer {
  private readonly timeoutMs: number;

  constructor(private readonly options: GeminiOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async analyze(image: PlantImage): Promise<Diagnosis> {
    const url = `${API_BASE}/models/${encodeURIComponent(this.options.model)}:generateContent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The key travels in a header (not in the URL) so it never ends up in access logs.
          "x-goog-api-key": this.options.apiKey,
        },
        body: JSON.stringify(buildGeminiRequest(image, this.options.thinkingLevel)),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new AnalyzerError(timedOut ? "Gemini request timed out" : "Could not reach Gemini", {
        cause: error,
      });
    }

    if (!response.ok) {
      // Only the status code is reported; the client does not need Gemini's error body.
      throw new AnalyzerError(`Gemini responded with HTTP ${response.status}`);
    }

    const json = (await response.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

    const diagnosis = parseDiagnosis(text);
    if (!diagnosis) {
      throw new AnalyzerError("Gemini returned output that does not match the diagnosis schema");
    }
    return diagnosis;
  }
}
