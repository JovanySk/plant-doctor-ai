/** Reads and checks environment variables once, at startup. */
export interface Config {
  apiKey: string;
  model: string;
  thinkingLevel?: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your_google_ai_studio_key_here") {
    throw new Error("GEMINI_API_KEY is missing. Copy server/.env.example to server/.env and add your key.");
  }
  return {
    apiKey,
    model: env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
    // Set GEMINI_THINKING_LEVEL to an empty value for models that do not support it.
    thinkingLevel: env.GEMINI_THINKING_LEVEL === undefined ? "low" : env.GEMINI_THINKING_LEVEL.trim() || undefined,
    port: Number(env.PORT) || 3001,
  };
}
