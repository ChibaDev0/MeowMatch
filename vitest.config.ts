import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Unit/integration tests (Vitest).
 * แยกจาก Playwright E2E ที่อยู่ใน tests/e2e
 * เน้นทดสอบกฎพันธุกรรมใน src/domain/genetics และ validation/services
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/algorithm-audit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only throw เมื่อถูก import นอก RSC — ระหว่างเทสต์ alias เป็นโมดูลว่าง
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
