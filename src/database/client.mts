import { SQL } from "bun"
import { drizzle } from "drizzle-orm/bun-sql"
import { env } from "../env.mts"
import * as schema from "./schema.mts"

export const client = new SQL(env.databaseUrl)

export const db = drizzle(client, { schema })

export type Database = typeof db
