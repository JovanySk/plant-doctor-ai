import type { Diagnosis } from "./types";

/** Client-side checks give instant feedback; the server checks again (never trust the client). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Formato no permitido. Sube una imagen JPG, PNG o WEBP.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen es demasiado grande. El máximo es 5 MB.";
  return null;
}

/** Sends the photo to our own backend. The backend is the only one that talks to Gemini. */
export async function diagnosePlant(file: File): Promise<Diagnosis> {
  const form = new FormData();
  form.append("image", file);

  let response: Response;
  try {
    response = await fetch("/api/diagnose", { method: "POST", body: form });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisa que esté encendido.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "Ocurrió un error inesperado. Inténtalo de nuevo.");
  }
  return data as Diagnosis;
}
