import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  (process.env.VERCEL === "1" || process.env.FINCONTROL_BUILD === "1"
    ? "postgresql://build:build@127.0.0.1:5432/build"
    : env("DATABASE_URL"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
