import { client } from "./client.mts"

export const setupDb = async () => {
  await client.connect()
  console.log("database connected")
}
