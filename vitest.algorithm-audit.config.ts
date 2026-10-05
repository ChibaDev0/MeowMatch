import { mergeConfig, defineConfig } from "vitest/config";
import base from "./vitest.config";

// Separate acceptance gate: known failures must remain visible, never skipped/xfail.
export default mergeConfig(base, defineConfig({
  test: { include: ["tests/algorithm-audit/**/*.test.ts"] },
}));
