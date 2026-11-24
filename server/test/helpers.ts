import type { PlantAnalyzer } from "../src/analyzer.js";
import type { Diagnosis } from "../src/schema.js";

export const sampleDiagnosis: Diagnosis = {
  isPlant: true,
  plantName: "Jitomate (Solanum lycopersicum)",
  healthStatus: "diseased",
  diagnosis: "Tizón tardío causado por Phytophthora infestans.",
  confidence: "high",
  symptoms: ["Manchas café oscuro en las hojas"],
  treatment: ["Retira y destruye las hojas afectadas"],
  prevention: ["Riega al pie de la planta, sin mojar las hojas"],
  speechSummary: "Tu jitomate parece tener tizón tardío. Retira las hojas dañadas y evita mojar el follaje.",
};

/** A fake analyzer that returns a fixed value (or runs a custom function). */
export function fakeAnalyzer(impl: () => Promise<Diagnosis> = async () => sampleDiagnosis): PlantAnalyzer {
  return { analyze: impl };
}

/** A tiny buffer is enough: the fake analyzer never looks at the pixels. */
export const tinyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
