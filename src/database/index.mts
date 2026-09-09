export { client, db, type Database } from "./client.mts"
export { setupDb } from "./setupDb.mts"
export {
  loadProfile,
  removeSuggestion,
  saveArea,
  saveInterests,
  saveSlots,
  type Profile,
} from "./profile.mts"
export { recordAudit, type AuditType, type Inserter } from "./audit.mts"
export {
  finishAvailability,
  listUserSlots,
  setOnboardingStep,
  setUserSlot,
  slotTarget,
  type SlotValue,
} from "./availability.mts"
export {
  deactivateCommunity,
  findCommunityByChatId,
  listActiveCommunities,
  listUserCommunities,
  registerCommunityFromChat,
} from "./community.mts"
export {
  addUserSuggestion,
  findUserByTgId,
  finishInterests,
  listActiveInterests,
  listUserInterestKeys,
  listUserSuggestions,
  setUserInterest,
  setWizardMessage,
  type InterestKeyValue,
} from "./interests.mts"
export {
  recordStart,
  registerUser,
  removeUserFromCommunity,
  type RegisterCommand,
  type UserSource,
} from "./users.mts"
export {
  appUser,
  auditLog,
  community,
  interest,
  interestKey,
  interestSuggestion,
  userCommunity,
  userInterest,
  type CommunityRow,
  type InterestRow,
} from "./schema.mts"
