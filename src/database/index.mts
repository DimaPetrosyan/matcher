export { client, db, type Database } from "./client.mts"
export { setupDb } from "./setupDb.mts"
export { recordAudit, type AuditType, type Inserter } from "./audit.mts"
export {
  findCommunityByChatId,
  listActiveCommunities,
  registerCommunityFromChat,
} from "./community.mts"
export {
  recordStart,
  registerUser,
  removeUserFromCommunity,
  type RegisterCommand,
  type UserSource,
} from "./users.mts"
export { appUser, auditLog, community, userCommunity, type CommunityRow } from "./schema.mts"
