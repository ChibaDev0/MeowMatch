import { defineConfig } from "vitest/config";
import base from "./vitest.config";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    environment: "node",
    include: ["tests/supabase/**/*.live.test.ts"],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
