import type { Diagnosis } from "./schema.js";

/** The image the user uploaded, already validated by the HTTP layer. */
export interface PlantImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Anything that can turn a photo into a Diagnosis.
 * The real implementation calls Gemini; tests inject a fake one.
 */
export interface PlantAnalyzer {
  analyze(image: PlantImage): Promise<Diagnosis>;
}

/** Thrown when the AI service fails or returns something we cannot trust. */
export class AnalyzerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AnalyzerError";
  }
}
