import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Env precedence for CLI workflows:
// 1) Explicit shell env vars (never overwritten)
// 2) .env.local (developer local settings)
// 3) .env (fallback/defaults)
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local", override: false });
}
if (!process.env.DATABASE_URL) {
  config({ path: ".env", override: false });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
