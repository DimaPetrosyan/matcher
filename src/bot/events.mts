import { InlineKeyboard, type Bot, type Context } from "grammy"
import {
  acceptEvent,
  declineEvent,
  eventBrief,
  findUserByTgId,
  markInvitationSent,
  pendingInvitations,
  settleDueEvents,
  timeZone,
  type AnswerResult,
  type Invitation,
  type Settled,
} from "../database/index.mts"
import { resolveLocale, translatorFor, type TextKey } from "../i18n/index.mts"
import { escapeHtml } from "./screens.mts"
import { interestTextKey, isInterestKey } from "./catalog.mts"
import { actions, pack, parse } from "./screens.mts"

const when = (startsAt: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(startsAt)

const interestLabel = (key: string, t: ReturnType<typeof translatorFor>) =>
  isInterestKey(key) ? t(interestTextKey[key]) : key

export const renderInvite = (invitation: Invitation) => {
  const t = translatorFor(invitation.languageCode ?? undefined)
  const locale = resolveLocale(invitation.languageCode ?? undefined)

  return {
    text: t("eventInvite", {
      interest: isInterestKey(invitation.interestKey)
        ? t(interestTextKey[invitation.interestKey])
        : invitation.interestKey,
      when: when(invitation.startsAt, locale),
      min: String(invitation.minSize),
      max: String(invitation.maxSize),
    }),
    keyboard: new InlineKeyboard()
      .text(t("eventGoing"), pack(actions.event, invitation.eventId, "yes"))
      .text(t("eventSkip"), pack(actions.event, invitation.eventId, "no")),
  }
}

export const sendPendingInvitations = async (bot: Bot) => {
  const invitations = await pendingInvitations()

  for (const invitation of invitations) {
    const screen = renderInvite(invitation)

    try {
      const sent = await bot.api.sendMessage(invitation.tgId, screen.text, {
        parse_mode: "HTML",
        reply_markup: screen.keyboard,
      })

      await markInvitationSent(invitation.eventId, invitation.userId, sent.message_id)
    } catch (error) {
      console.error(`could not invite ${invitation.tgId} to ${invitation.eventId}:`, error)
    }
  }

  return invitations.length
}

const alertKey: Record<AnswerResult, TextKey> = {
  accepted: "eventAccepted",
  declined: "eventDeclined",
  full: "eventFull",
  busy: "eventBusy",
  gone: "eventGone",
}

export const onEventAnswer = async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery?.data) return

  const t = translatorFor(ctx.from.language_code)
  const [eventId = "", choice = ""] = parse(ctx.callbackQuery.data).args
  const user = await findUserByTgId(ctx.from.id)

  if (!user || !eventId) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const answer =
    choice === "yes" ? await acceptEvent(user.id, eventId) : await declineEvent(user.id, eventId)

  await ctx.answerCallbackQuery(t(alertKey[answer.result]))

  const brief = await eventBrief(eventId)
  if (!brief) return

  const locale = resolveLocale(ctx.from.language_code)

  const status =
    answer.result === "accepted"
      ? `${t("eventAccepted")}. ${t("eventWaiting", { deadline: when(brief.respondUntil, locale) })}`
      : t(alertKey[answer.result])

  // Переписываем само сообщение: иначе под ним остаётся «кто первым — тот идёт».
  try {
    await ctx.editMessageText(
      t("eventAnswered", {
        interest: interestLabel(brief.interestKey, t),
        when: when(brief.startsAt, locale),
        status,
      }),
      { parse_mode: "HTML", reply_markup: new InlineKeyboard() },
    )
  } catch {
    // уже переписано — не ошибка
  }
}

// Без username написать человеку нельзя — поэтому без него в анкету не пускаем,
// и здесь ссылка есть у всех. Имя оставляем как запасной вариант.
const member = (person: Settled["members"][number]) =>
  person.username
    ? `• <a href="https://t.me/${person.username}">${escapeHtml(person.firstName ?? person.username)}</a>`
    : `• ${escapeHtml(person.firstName ?? "без имени")}`

export const announceSettled = async (bot: Bot) => {
  const settled = await settleDueEvents()

  for (const event of settled) {
    for (const person of event.members) {
      const language = event.languageByTgId[person.tgId] ?? undefined
      const t = translatorFor(language)

      const text =
        event.status === "confirmed"
          ? t("eventConfirmed", {
              interest: interestLabel(event.interestKey, t),
              when: when(event.startsAt, resolveLocale(language)),
              members: event.members.map(member).join("\n"),
            })
          : t("eventCancelled", {
              interest: interestLabel(event.interestKey, t),
              when: when(event.startsAt, resolveLocale(language)),
            })

      try {
        await bot.api.sendMessage(person.tgId, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        })
      } catch (error) {
        console.error(`could not tell ${person.tgId} about ${event.eventId}:`, error)
      }
    }
  }

  return settled.length
}
