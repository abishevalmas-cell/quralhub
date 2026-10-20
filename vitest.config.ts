import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    environment: "node",
    testTimeout: 20000,
    pool: "forks",
  },
});
