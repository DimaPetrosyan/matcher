import { describe, expect, it, mock } from "bun:test"
import type { Bot } from "grammy"
import { checkAllCommunities, checkMembership } from "../src/bot/membership.mts"
import type { CommunityRow } from "../src/database/schema.mts"

const community = {
  id: "c1",
  title: "Наши на Мясницкой",
  tgChatId: -1001234567890,
  isActive: true,
  created: new Date(),
  updated: new Date(),
} satisfies CommunityRow

const botWith = (getChatMember: ReturnType<typeof mock>) =>
  ({ api: { getChatMember } }) as unknown as Bot

describe("проверка членства", () => {
  it.each(["creator", "administrator", "member"])("%s — член сообщества", async status => {
    await expect(
      checkMembership(botWith(mock().mockResolvedValue({ status })), 1, community),
    ).resolves.toBe("member")
  })

  it("restricted считается членом только при is_member", async () => {
    await expect(
      checkMembership(
        botWith(mock().mockResolvedValue({ status: "restricted", is_member: true })),
        1,
        community,
      ),
    ).resolves.toBe("member")

    await expect(
      checkMembership(
        botWith(mock().mockResolvedValue({ status: "restricted", is_member: false })),
        1,
        community,
      ),
    ).resolves.toBe("notMember")
  })

  it.each(["left", "kicked"])("%s — не член", async status => {
    await expect(
      checkMembership(botWith(mock().mockResolvedValue({ status })), 1, community),
    ).resolves.toBe("notMember")
  })

  it("ошибка API — unverifiable, а не отказ пользователю", async () => {
    await expect(
      checkMembership(botWith(mock().mockRejectedValue(new Error("chat not found"))), 1, community),
    ).resolves.toBe("unverifiable")
  })

  it("членство хотя бы в одном перевешивает несработавшую проверку", async () => {
    const second = { ...community, id: "c2", title: "Другой", tgChatId: -1009 }
    const bot = botWith(
      mock().mockResolvedValueOnce({ status: "member" }).mockRejectedValueOnce(new Error("boom")),
    )

    const result = await checkAllCommunities(bot, 1, [community, second])

    expect(result.memberOf.map(c => c.tgChatId)).toEqual([-1001234567890])
    expect(result.unverifiable).toBe(true)
  })
})
