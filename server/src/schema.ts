import { z } from "zod";

/** Allowed values for the overall health of the plant. */
export const HEALTH_STATUSES = [
  "healthy",
  "diseased",
  "pest",
  "nutrient_deficiency",
  "unknown",
] as const;

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

/**
 * Zod schema = the single source of truth for what a diagnosis looks like.
 * We validate EVERY model response against it before sending it to the browser,
 * because an LLM can still return something unexpected.
 */
export const diagnosisSchema = z.object({
  isPlant: z.boolean(),
  plantName: z.string(),
  healthStatus: z.enum(HEALTH_STATUSES),
  diagnosis: z.string().min(1),
  confidence: z.enum(CONFIDENCE_LEVELS),
  symptoms: z.array(z.string()),
  treatment: z.array(z.string()),
  prevention: z.array(z.string()),
  speechSummary: z.string().min(1),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

const FIELD_ORDER = [
  "isPlant",
  "plantName",
  "healthStatus",
  "diagnosis",
  "confidence",
  "symptoms",
  "treatment",
  "prevention",
  "speechSummary",
];

/**
 * The same shape expressed in Gemini's "responseSchema" format (an OpenAPI subset).
 * Gemini uses it to force the output to be JSON with exactly these fields.
 */
export const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    isPlant: { type: "BOOLEAN" },
    plantName: { type: "STRING" },
    healthStatus: { type: "STRING", enum: [...HEALTH_STATUSES] },
    diagnosis: { type: "STRING" },
    confidence: { type: "STRING", enum: [...CONFIDENCE_LEVELS] },
    symptoms: { type: "ARRAY", items: { type: "STRING" } },
    treatment: { type: "ARRAY", items: { type: "STRING" } },
    prevention: { type: "ARRAY", items: { type: "STRING" } },
    speechSummary: { type: "STRING" },
  },
  required: FIELD_ORDER,
  propertyOrdering: FIELD_ORDER,
};

/**
 * Parses raw text from the model into a validated Diagnosis.
 * Returns null when the text is not JSON or does not match the schema.
 */
export function parseDiagnosis(rawText: string): Diagnosis | null {
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    return null;
  }
  const result = diagnosisSchema.safeParse(data);
  return result.success ? result.data : null;
}
