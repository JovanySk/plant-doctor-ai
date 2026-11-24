import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { PlantAnalyzer } from "./analyzer.js";
import { createRateLimiter, type RateLimitOptions } from "./rateLimit.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface AppOptions {
  analyzer: PlantAnalyzer;
  rateLimit?: RateLimitOptions;
}

/** Marker error so the error handler knows the file type was rejected. */
class UnsupportedFileError extends Error {}

/**
 * Builds the Express app. The analyzer is passed in (dependency injection),
 * so tests can use a fake one and never call the real AI.
 */
export function createApp({ analyzer, rateLimit = { limit: 10, windowMs: 60_000 } }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");

  // Files stay in memory (never written to disk) and are capped at 5 MB.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new UnsupportedFileError());
    },
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post(
    "/api/diagnose",
    createRateLimiter(rateLimit),
    upload.single("image"),
    async (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({
          error: "No se recibió ninguna imagen. Adjunta una foto en el campo 'image'.",
        });
        return;
      }

      try {
        const diagnosis = await analyzer.analyze({
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
        });
        res.json(diagnosis);
      } catch (error) {
        // Log only the message: never the request body, headers or keys.
        console.error("[diagnose] analyzer failed:", error instanceof Error ? error.message : error);
        res.status(502).json({
          error: "No pudimos obtener un diagnóstico en este momento. Inténtalo de nuevo en unos segundos.",
        });
      }
    },
  );

  // Central error handler for upload problems (size, type, malformed form).
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof UnsupportedFileError) {
      res.status(400).json({ error: "Formato no permitido. Sube una imagen JPG, PNG o WEBP." });
      return;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "La imagen es demasiado grande. El máximo es 5 MB." });
        return;
      }
      res.status(400).json({ error: "Solicitud no válida. Envía una sola imagen en el campo 'image'." });
      return;
    }
    console.error("[server] unexpected error:", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Ocurrió un error inesperado en el servidor." });
  });

  return app;
}
