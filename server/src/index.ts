import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { GeminiPlantAnalyzer } from "./geminiAnalyzer.js";

const config = loadConfig();

const analyzer = new GeminiPlantAnalyzer({
  apiKey: config.apiKey,
  model: config.model,
  thinkingLevel: config.thinkingLevel,
  timeoutMs: 30_000,
});

createApp({ analyzer }).listen(config.port, () => {
  // Print the model name only, never the key.
  console.log(`Plant Doctor API listening on http://localhost:${config.port} (model: ${config.model})`);
});
