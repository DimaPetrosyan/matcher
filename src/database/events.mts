import { sql } from "drizzle-orm"
import { db } from "./client.mts"

export const timeZone = "Europe/Moscow"

export const generationWindowDays = 7

export const minHoursBeforeStart = 48

export const respondHours = 24

// Кандидаты: активный участник активного сообщества, у которого занятие
// стоит в слоте, выпадающем на конкретный день окна. День недели сверяется
// по isodow, а не по to_char: он не зависит от локали базы.
const candidates = sql`
  with wanted as (
    select
      c.id as community_id,
      ui.interest_id,
      ui.user_id,
      (d::date + ui.start_time) at time zone ${timeZone} as starts_at,
      (d::date + ui.end_time) at time zone ${timeZone} as ends_at
    from community c
    join user_community uc on uc.community_id = c.id
    join app_user u on u.id = uc.user_id and u.status = 'active'
    join user_interest ui on ui.user_id = u.id and ui.recurrence is not null
    join interest i on i.id = ui.interest_id and i.is_active
    cross join generate_series(
      (now() at time zone ${timeZone})::date,
      (now() at time zone ${timeZone})::date + ${generationWindowDays},
      interval '1 day'
    ) d
    where c.is_active
      and ui.recurrence =
        'RRULE:FREQ=WEEKLY;BYDAY=' ||
        (array['MO','TU','WE','TH','FR','SA','SU'])[extract(isodow from d)::int]
      and (d::date + ui.start_time) at time zone ${timeZone}
        >= now() + make_interval(hours => ${minHoursBeforeStart})
  )`

export const generateEvents = () =>
  db.transaction(async trx => {
    const created = await trx.execute(sql`
      ${candidates}
      insert into event (community_id, interest_id, starts_at, ends_at, respond_until)
      select
        w.community_id,
        w.interest_id,
        w.starts_at,
        w.ends_at,
        least(
          now() + make_interval(hours => ${respondHours}),
          w.starts_at - make_interval(hours => ${respondHours})
        )
      from wanted w
      join interest i on i.id = w.interest_id
      group by w.community_id, w.interest_id, w.starts_at, w.ends_at, i.min_size
      having count(distinct w.user_id) >= i.min_size
      on conflict (community_id, interest_id, starts_at) do nothing
      returning id`)

    const invited = await trx.execute(sql`
      ${candidates}
      insert into event_user (event_id, user_id)
      select e.id, w.user_id
      from wanted w
      join event e
        on e.community_id = w.community_id
       and e.interest_id = w.interest_id
       and e.starts_at = w.starts_at
      join interest i on i.id = e.interest_id
      -- В подтверждённую встречу тоже зовём, пока есть места и не вышел срок:
      -- минимум — это «состоится», а не «набор закрыт».
      where e.status in ('open', 'confirmed')
        and e.respond_until > now()
        and (select count(*) from event_user taken
             where taken.event_id = e.id and taken.status = 'accepted') < i.max_size
        and not exists (
          select 1
          from event_user busy
          join event taken on taken.id = busy.event_id
          where busy.user_id = w.user_id
            and busy.status = 'accepted'
            and taken.starts_at = w.starts_at
        )
      on conflict do nothing
      returning event_id`)

    return { events: created.length, invitations: invited.length }
  })

export type Invitation = {
  eventId: string
  userId: string
  tgId: number
  languageCode: string | null
  interestKey: string
  startsAt: Date
  minSize: number
  maxSize: number
}

export const pendingInvitations = (limit = 50): Promise<Invitation[]> =>
  db.execute(sql`
    select
      eu.event_id as "eventId",
      eu.user_id as "userId",
      u.tg_id as "tgId",
      u.language_code as "languageCode",
      i.key::text as "interestKey",
      e.starts_at as "startsAt",
      i.min_size as "minSize",
      i.max_size as "maxSize"
    from event_user eu
    join event e on e.id = eu.event_id
    join interest i on i.id = e.interest_id
    join app_user u on u.id = eu.user_id
    where eu.status = 'invited'
      and eu.message_id is null
      and e.status = 'open'
      and e.respond_until > now()
    order by e.starts_at
    limit ${limit}`) as unknown as Promise<Invitation[]>

export const markInvitationSent = (eventId: string, userId: string, messageId: number) =>
  db.execute(sql`
    update event_user set message_id = ${messageId}, updated = now()
    where event_id = ${eventId} and user_id = ${userId}`)

export type AnswerResult = "accepted" | "declined" | "full" | "busy" | "gone"

export type Member = {
  tgId: number
  username: string | null
  firstName: string | null
  languageCode: string | null
}

export type Answer = {
  result: AnswerResult
  // Минимум набран только что: встречу можно обещать.
  justConfirmed: boolean
  // Присоединился к уже обещанной встрече.
  joined: boolean
  roster: Member[]
}

const empty = (result: AnswerResult): Answer => ({
  result,
  justConfirmed: false,
  joined: false,
  roster: [],
})

export const declineEvent = (userId: string, eventId: string): Promise<Answer> =>
  db
    .execute(
      sql`
      update event_user set status = 'declined', updated = now()
      where event_id = ${eventId} and user_id = ${userId} and status = 'invited'
      returning user_id`,
    )
    .then(rows => empty(rows.length ? "declined" : "gone"))

export const acceptEvent = (userId: string, eventId: string): Promise<Answer> =>
  db.transaction(async trx => {
    // Порядок блокировок фиксирован: сначала человек, потом встреча.
    // Блокировка человека — единственное, что не даёт согласиться
    // на две встречи в один слот двумя одновременными нажатиями.
    await trx.execute(sql`select 1 from app_user where id = ${userId} for update`)

    const [event] = await trx.execute<{
      startsAt: Date
      status: string
      minSize: number
      maxSize: number
      expired: boolean
    }>(sql`
      select e.starts_at as "startsAt", e.status::text as status,
             i.min_size as "minSize", i.max_size as "maxSize",
             e.respond_until <= now() as expired
      from event e join interest i on i.id = e.interest_id
      where e.id = ${eventId} for update of e`)

    // К обещанной встрече можно присоединиться, пока есть места и не вышел
    // срок: минимум — условие «состоится», а не «набор закрыт».
    if (!event || event.expired || event.status === "cancelled") return empty("gone")

    const [mine] = await trx.execute<{ status: string }>(sql`
      select status::text from event_user where event_id = ${eventId} and user_id = ${userId}`)

    if (!mine) return empty("gone")
    if (mine.status === "accepted") return empty("accepted")
    if (mine.status !== "invited") return empty(event.status === "confirmed" ? "full" : "gone")

    const [busy] = await trx.execute<{ n: number }>(sql`
      select count(*)::int as n
      from event_user eu join event e on e.id = eu.event_id
      where eu.user_id = ${userId} and eu.status = 'accepted' and e.starts_at = ${event.startsAt}`)

    if ((busy?.n ?? 0) > 0) {
      await trx.execute(sql`
        update event_user set status = 'closed', updated = now()
        where event_id = ${eventId} and user_id = ${userId}`)
      return empty("busy")
    }

    const [before] = await trx.execute<{ n: number }>(sql`
      select count(*)::int as n from event_user
      where event_id = ${eventId} and status = 'accepted'`)

    const accepted = before?.n ?? 0

    if (accepted >= event.maxSize) {
      await trx.execute(sql`
        update event_user set status = 'closed', updated = now()
        where event_id = ${eventId} and user_id = ${userId}`)
      return empty("full")
    }

    await trx.execute(sql`
      update event_user set status = 'accepted', updated = now()
      where event_id = ${eventId} and user_id = ${userId}`)

    const total = accepted + 1
    const justConfirmed = total >= event.minSize && event.status !== "confirmed"

    if (justConfirmed) {
      await trx.execute(sql`
        update event set status = 'confirmed', updated = now() where id = ${eventId}`)
    }

    if (total >= event.maxSize) {
      await trx.execute(sql`
        update event_user set status = 'closed', updated = now()
        where event_id = ${eventId} and status = 'invited'`)
    }

    // Приглашения на другие встречи в этот же слот человеку больше не нужны.
    await trx.execute(sql`
      update event_user set status = 'closed', updated = now()
      where user_id = ${userId} and status = 'invited' and event_id in (
        select id from event where starts_at = ${event.startsAt} and id <> ${eventId})`)

    const roster = (await trx.execute(sql`
      select u.tg_id as "tgId", u.username, u.first_name as "firstName",
             u.language_code as "languageCode"
      from event_user eu join app_user u on u.id = eu.user_id
      where eu.event_id = ${eventId} and eu.status = 'accepted'
      order by eu.updated`)) as unknown as Member[]

    return { result: "accepted" as const, justConfirmed, joined: !justConfirmed, roster }
  })

export type Settled = {
  eventId: string
  status: "confirmed" | "cancelled"
  members: { tgId: number; username: string | null; firstName: string | null }[]
  interestKey: string
  startsAt: Date
  languageByTgId: Record<number, string | null>
}

// Срок вышел: набрали минимум — встреча состоится, нет — отменяем.
// Оба перехода идут только из 'open', поэтому повторный проход ничего не портит.
export const settleDueEvents = async (): Promise<Settled[]> => {
  const due = await db.execute<{ id: string }>(sql`
    update event e
    set status = case
          when (select count(*) from event_user eu
                where eu.event_id = e.id and eu.status = 'accepted') >= i.min_size
            then 'confirmed'::event_status
          else 'cancelled'::event_status
        end,
        updated = now()
    from interest i
    where i.id = e.interest_id and e.status = 'open' and e.respond_until <= now()
    returning e.id`)

  if (due.length === 0) return []

  const ids = sql.join(
    due.map(row => sql`${row.id}`),
    sql`, `,
  )

  await db.execute(sql`
    update event_user set status = 'closed', updated = now()
    where status = 'invited' and event_id in (${ids})`)

  const rows = await db.execute<{
    eventId: string
    status: "confirmed" | "cancelled"
    interestKey: string
    startsAt: Date
    tgId: number
    username: string | null
    firstName: string | null
    languageCode: string | null
  }>(sql`
    select e.id as "eventId", e.status::text as status, i.key::text as "interestKey",
           e.starts_at as "startsAt", u.tg_id as "tgId", u.username, u.first_name as "firstName",
           u.language_code as "languageCode"
    from event e
    join interest i on i.id = e.interest_id
    join event_user eu on eu.event_id = e.id and eu.status = 'accepted'
    join app_user u on u.id = eu.user_id
    where e.id in (${ids})
    order by e.id`)

  const byEvent = new Map<string, Settled>()

  for (const row of rows) {
    const settled: Settled = byEvent.get(row.eventId) ?? {
      eventId: row.eventId,
      status: row.status,
      members: [],
      interestKey: row.interestKey,
      startsAt: row.startsAt,
      languageByTgId: {},
    }

    settled.members.push({ tgId: row.tgId, username: row.username, firstName: row.firstName })
    settled.languageByTgId[row.tgId] = row.languageCode
    byEvent.set(row.eventId, settled)
  }

  return [...byEvent.values()]
}

export type EventBrief = {
  eventId: string
  interestKey: string
  startsAt: Date
  respondUntil: Date
}

export const eventBrief = async (eventId: string): Promise<EventBrief | null> => {
  const [row] = (await db.execute(sql`
    select e.id as "eventId", i.key::text as "interestKey", e.starts_at as "startsAt",
           e.respond_until as "respondUntil"
    from event e join interest i on i.id = e.interest_id
    where e.id = ${eventId}`)) as unknown as EventBrief[]

  return row ?? null
}

export type UserEvent = {
  id: string
  interestKey: string
  startsAt: Date
  endsAt: Date
  respondUntil: Date
  status: "open" | "confirmed" | "cancelled"
  myStatus: "invited" | "accepted" | "declined" | "closed"
  minSize: number
  maxSize: number
  going: number
  roster: { firstName: string | null; username: string | null }[]
}

// Встречи человека: и те, где ещё ждут ответа, и уже решённые.
// Прошедшие держим сутки, чтобы «вчера ходили» не исчезало на глазах.
export const listUserEvents = (userId: string) =>
  db.execute(sql`
    select e.id, i.key::text as "interestKey", e.starts_at as "startsAt",
           e.ends_at as "endsAt", e.respond_until as "respondUntil",
           e.status::text as status, eu.status::text as "myStatus",
           i.min_size as "minSize", i.max_size as "maxSize",
           (select count(*)::int from event_user a
            where a.event_id = e.id and a.status = 'accepted') as going,
           (select coalesce(
              json_agg(json_build_object('firstName', u.first_name, 'username', u.username)
                       order by a.updated), '[]'::json)
            from event_user a join app_user u on u.id = a.user_id
            where a.event_id = e.id and a.status = 'accepted') as roster
    from event_user eu
    join event e on e.id = eu.event_id
    join interest i on i.id = e.interest_id
    where eu.user_id = ${userId} and e.starts_at > now() - interval '1 day'
    order by e.starts_at`) as unknown as Promise<UserEvent[]>
