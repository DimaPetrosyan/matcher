import type { Bot } from "grammy"
import { announceSettled, sendPendingInvitations } from "./bot/index.mts"
import { generateEvents } from "./database/index.mts"

const minutes = (count: number) => count * 60 * 1000

const run = async (name: string, task: () => Promise<unknown>) => {
  try {
    const result = await task()
    if (result) console.log(`${name}: ${JSON.stringify(result)}`)
  } catch (error) {
    console.error(`${name} failed:`, error)
  }
}

const tick = async (bot: Bot) => {
  await run("generate", generateEvents)
  await run("invite", () => sendPendingInvitations(bot))
  await run("settle", () => announceSettled(bot))
}

// Один процесс: два экземпляра разослали бы приглашения дважды.
// То же ограничение, что у поллинга.
export const startScheduler = (bot: Bot) => {
  void tick(bot)

  const timer = setInterval(() => void tick(bot), minutes(5))

  return { stop: () => clearInterval(timer) }
}
