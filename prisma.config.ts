import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Replaces the deprecated `prisma` block in package.json (removed in Prisma 7).
// A config file disables Prisma's automatic .env loading, so we load it above.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
