import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  out: "./src/database",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
