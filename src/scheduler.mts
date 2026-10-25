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

const tick = async () => {
  await run("generate", generateEvents)
  await run("invite", sendPendingInvitations)
  await run("settle", announceSettled)
}

// Один процесс: два экземпляра разослали бы приглашения дважды.
// То же ограничение, что у поллинга.
export const startScheduler = () => {
  void tick()

  const timer = setInterval(() => void tick(), minutes(5))

  return { stop: () => clearInterval(timer) }
}
