import { describe, expect, it, mock } from "bun:test"
import { GrammyError, type Bot } from "grammy"
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

const apiError = (errorCode: number, description: string, migrateTo?: number) =>
  new GrammyError(
    'Call to "getChatMember" failed!',
    {
      ok: false,
      error_code: errorCode,
      description,
      ...(migrateTo === undefined ? {} : { parameters: { migrate_to_chat_id: migrateTo } }),
    },
    "getChatMember",
    {},
  )

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

describe("потеря доступа к чату", () => {
  it("403 — доступа больше нет, а не временный сбой", async () => {
    await expect(
      checkMembership(
        botWith(
          mock().mockRejectedValue(
            apiError(403, "Forbidden: bot is not a member of the supergroup chat"),
          ),
        ),
        1,
        community,
      ),
    ).resolves.toBe("noAccess")
  })

  it("чат не найден — тоже потеря доступа", async () => {
    await expect(
      checkMembership(
        botWith(mock().mockRejectedValue(apiError(400, "Bad Request: chat not found"))),
        1,
        community,
      ),
    ).resolves.toBe("noAccess")
  })

  it("переезд группы в супергруппу не гасит сообщество", async () => {
    await expect(
      checkMembership(
        botWith(
          mock().mockRejectedValue(
            apiError(400, "Bad Request: group chat was upgraded to a supergroup chat", -1009),
          ),
        ),
        1,
        community,
      ),
    ).resolves.toBe("unverifiable")
  })

  it("обычная ошибка сети остаётся временной", async () => {
    await expect(
      checkMembership(botWith(mock().mockRejectedValue(new Error("socket hang up"))), 1, community),
    ).resolves.toBe("unverifiable")
  })

  it("потерянные чаты и временные сбои не смешиваются", async () => {
    const second = { ...community, id: "c2", title: "Другой", tgChatId: -1009 }
    const bot = botWith(
      mock()
        .mockRejectedValueOnce(apiError(403, "Forbidden: bot was kicked from the group chat"))
        .mockRejectedValueOnce(new Error("boom")),
    )

    const result = await checkAllCommunities(bot, 1, [community, second])

    expect(result.memberOf).toEqual([])
    expect(result.lostAccess.map(c => c.tgChatId)).toEqual([-1001234567890])
    expect(result.unverifiable).toBe(true)
  })
})
