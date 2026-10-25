import { sql } from "drizzle-orm"
import { client, db } from "../src/database/client.mts"
import { acceptEvent, declineEvent, generateEvents, pendingInvitations, settleDueEvents } from "../src/database/events.mts"

const chatId = -1009999000002
const firstTgId = 901000000

let failed = 0

const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ок  " : " ПЛОХО"} ${name}${ok || got === undefined ? "" : `  → ${JSON.stringify(got)}`}`)
  if (!ok) failed += 1
}

// Код дня недели по RRULE для даты через N дней, считая по Москве.
const dayIn = (days: number) => {
  const msk = new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" })
  const index = new Date(`${msk}T12:00:00Z`).getUTCDay()
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][index]!
}

// Чистим и трогаем только свою песочницу: рядом живут настоящие встречи.
const cleanup = async () => {
  await db.execute(sql`
    delete from event where community_id in (select id from community where tg_chat_id = ${chatId})`)
  await db.execute(sql`delete from app_user where tg_id between ${firstTgId} and ${firstTgId + 99}`)
  await db.execute(sql`delete from community where tg_chat_id = ${chatId}`)
  await db.execute(sql`delete from audit_log where user_id is null`)
}

await client.connect()

try {
  await cleanup()

  const [chat] = await db.execute<{ id: string }>(sql`
    insert into community (title, tg_chat_id) values ('Проверка', ${chatId}) returning id`)

  const add = async (index: number, status = "active") => {
    const [user] = await db.execute<{ id: string }>(sql`
      insert into app_user (tg_id, first_name, username, status, onboarding_step)
      values (${firstTgId + index}, ${`П${index}`}, ${`check_${index}`}, ${status}, 'done')
      returning id`)
    await db.execute(sql`
      insert into user_community (user_id, community_id) values (${user!.id}, ${chat!.id})`)
    return user!.id
  }

  const want = (userId: string, key: string, day: string) =>
    db.execute(sql`
      insert into user_interest (user_id, interest_id, recurrence, start_time, end_time)
      select ${userId}, id, ${`RRULE:FREQ=WEEKLY;BYDAY=${day}`}, '19:00'::time, '23:00'::time
      from interest where key = ${key}::interest_key`)

  const soon = dayIn(1)
  const ok = dayIn(3)

  console.log("\n── генерация ──")

  const a = await add(1)
  const b = await add(2)
  await want(a, "movie", soon)
  await want(b, "movie", soon)
  check("встреча ближе 48 часов не создаётся", (await generateEvents()).events === 0)

  await want(a, "bar", ok)
  check("один кандидат — встречи нет", (await generateEvents()).events === 0)

  await want(b, "bar", ok)
  const first = await generateEvents()
  check("двое — встреча есть", first.events === 1, first)
  check("приглашены оба", first.invitations === 2, first)

  const again = await generateEvents()
  check("повторный прогон ничего не делает", again.events === 0 && again.invitations === 0, again)

  const paused = await add(3, "paused")
  await want(paused, "bar", ok)
  check("неактивного не зовут", (await generateEvents()).invitations === 0)

  await db.execute(sql`update interest set is_active = false where key = 'expo'`)
  const c = await add(4)
  const d = await add(5)
  await want(c, "expo", ok)
  await want(d, "expo", ok)
  check("по выключенному занятию встреч нет", (await generateEvents()).events === 0)
  await db.execute(sql`update interest set is_active = true where key = 'expo'`)

  console.log("\n── ответы ──")

  const mine = (await pendingInvitations()).filter(i => i.interestKey === "bar")
  const [invite] = mine
  const eventId = invite!.eventId

  check("приглашение ждёт отправки", Boolean(invite))
  check("«Иду»", (await acceptEvent(a, eventId)).result === "accepted")
  check("«Иду» повторно — тот же ответ", (await acceptEvent(a, eventId)).result === "accepted")
  check("«Не в этот раз»", (await declineEvent(b, eventId)).result === "declined")
  check("«Иду» после отказа не воскрешает", (await acceptEvent(b, eventId)).result === "gone")
  check("чужая встреча — gone", (await acceptEvent(c, eventId)).result === "gone")

  console.log("\n── занятость слота ──")

  await want(a, "tennis", ok)
  await want(c, "tennis", ok)
  await want(d, "tennis", ok)
  await generateEvents()
  const [tennis] = await db.execute<{ id: string }>(sql`
    select e.id from event e join interest i on i.id = e.interest_id
    where i.key = 'tennis' and e.community_id = ${chat!.id}`)
  const invitedToTennis = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from event_user where event_id = ${tennis!.id} and user_id = ${a}`)
  check("занятого в этом слоте в новую встречу не зовут", invitedToTennis[0]!.n === 0, invitedToTennis[0])

  console.log("\n── набор до максимума ──")

  const many = []
  for (let i = 10; i < 15; i += 1) {
    const user = await add(i)
    await want(user, "billiards", ok)
    many.push(user)
  }
  await generateEvents()
  const [bill] = await db.execute<{ id: string; max: number }>(sql`
    select e.id, i.max_size as max from event e join interest i on i.id = e.interest_id
    where i.key = 'billiards' and e.community_id = ${chat!.id}`)

  const results = []
  for (const user of many) results.push((await acceptEvent(user, bill!.id)).result)
  check(`первые ${bill!.max} попали, остальным мест нет`,
    results.filter(r => r === "accepted").length === bill!.max && results.at(-1) === "full", results)

  const [state] = await db.execute<{ status: string; waiting: number }>(sql`
    select e.status::text as status,
           (select count(*)::int from event_user where event_id = e.id and status = 'invited') as waiting
    from event e where e.id = ${bill!.id}`)
  check("встреча подтверждена, ожидающих не осталось",
    state!.status === "confirmed" && state!.waiting === 0, state)

  console.log("\n── добор в подтверждённую ──")

  const late = await add(20)
  await want(late, "billiards", ok)
  await generateEvents()
  const [invitedLate] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from event_user where event_id = ${bill!.id} and user_id = ${late}`)
  check("в подтверждённую с местами не зовут (их нет)", invitedLate!.n === 0, invitedLate)

  const roomy = await add(21)
  const mate = await add(22)
  await want(roomy, "karaoke", ok)
  await want(mate, "karaoke", ok)
  await generateEvents()
  const [kara] = await db.execute<{ id: string }>(sql`
    select e.id from event e join interest i on i.id = e.interest_id
    where i.key = 'karaoke' and e.community_id = ${chat!.id}`)
  await acceptEvent(roomy, kara!.id)
  await acceptEvent(mate, kara!.id)

  const third = await add(23)
  await want(third, "karaoke", ok)
  await generateEvents()
  const joined = await acceptEvent(third, kara!.id)
  check("к подтверждённой с местами можно присоединиться",
    joined.result === "accepted" && joined.joined && joined.roster.length === 3, joined.result)

  console.log("\n── срок ──")

  check("до срока ничего не подводится", (await settleDueEvents()).length === 0)

  await db.execute(sql`
    update event set respond_until = now() - interval '1 minute'
    where status = 'open' and community_id = ${chat!.id}`)
  const settled = await settleDueEvents()
  const barEvent = settled.find(e => e.interestKey === "bar")
  check("встречу без минимума отменили", barEvent?.status === "cancelled", barEvent?.status)

  check("повторный проход пустой", (await settleDueEvents()).length === 0)
  const [left] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from event_user eu join event e on e.id = eu.event_id
    where eu.status = 'invited' and e.status <> 'open' and e.community_id = ${chat!.id}`)
  check("у закрытых встреч ожидающих нет", left!.n === 0, left)
} finally {
  await cleanup()
  await client.close()
}

console.log(failed === 0 ? "\nвсё сошлось\n" : `\nрасхождений: ${failed}\n`)
process.exit(failed === 0 ? 0 : 1)
