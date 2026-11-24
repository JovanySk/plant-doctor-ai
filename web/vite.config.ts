import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, the browser calls /api on the Vite server and Vite forwards it
    // to Express. The browser never talks to Gemini and never sees the API key.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
