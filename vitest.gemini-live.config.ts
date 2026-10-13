import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const env = loadEnv("development", process.cwd(), "GEMINI_");
for (const [key, value] of Object.entries(env)) process.env[key] ??= value;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live-gemini/**/*.test.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
