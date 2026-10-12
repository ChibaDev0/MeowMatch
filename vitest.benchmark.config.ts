import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/benchmarks/**/*.test.ts"],
    fileParallelism: false,
    minWorkers: 1,
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
