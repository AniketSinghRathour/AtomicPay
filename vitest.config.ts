import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 180000, // 3 minutes timeout for remote database transactions over internet
    hookTimeout: 45000,
    include: ["tests/**/*.test.ts"],
    fileParallelism: false, // Run tests sequentially to preserve ledger ordering
  },
});
