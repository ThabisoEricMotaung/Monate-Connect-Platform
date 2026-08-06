import path from "node:path"
import { defineConfig } from "vitest/config"

// Mirrors the "@/*" -> "./src/*" path alias from tsconfig.json so tests can
// import real modules (not just types) without a bundler in the loop.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
