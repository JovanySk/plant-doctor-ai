/** Mirrors the server's zod schema (server/src/schema.ts). */
export type HealthStatus = "healthy" | "diseased" | "pest" | "nutrient_deficiency" | "unknown";
export type Confidence = "low" | "medium" | "high";

export interface Diagnosis {
  isPlant: boolean;
  plantName: string;
  healthStatus: HealthStatus;
  diagnosis: string;
  confidence: Confidence;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  speechSummary: string;
}
