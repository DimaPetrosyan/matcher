import { bot, startBot } from "./bot/index.mts"
import { client, setupDb } from "./database/index.mts"
import { startServer } from "./server/index.mts"

await setupDb()

const server = startServer(bot)

await startBot()

const shutdown = async (signal: string) => {
  console.log(`shutting down on ${signal}`)
  await server.stop()
  await bot.stop()
  await client.close()
  process.exit(0)
}

process.once("SIGINT", () => void shutdown("SIGINT"))
process.once("SIGTERM", () => void shutdown("SIGTERM"))
