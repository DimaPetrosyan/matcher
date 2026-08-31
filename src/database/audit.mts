import type { Database } from "./client.mts"
import { auditLog } from "./schema.mts"

export type AuditType = "start_command" | "consent_given" | "interests_saved" | "interest_suggested"

export type Inserter = Pick<Database, "insert">

export const recordAudit = async (
  tx: Inserter,
  entry: { type: AuditType; userId?: string; payload?: Record<string, unknown> },
) => {
  await tx.insert(auditLog).values({
    type: entry.type,
    userId: entry.userId ?? null,
    payload: entry.payload ?? {},
  })
}
