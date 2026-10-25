import { sql } from "drizzle-orm"
import { db } from "./client.mts"

// Сидер для ручной проверки подбора: без нескольких участников с пересекающимися
// анкетами генератор всегда возвращает ноль, и проверять нечего.
export const seedCommunity = (people: number) =>
  db.transaction(async trx => {
    const [chat] = await trx.execute<{ id: string }>(sql`
      insert into community (title, tg_chat_id)
      values ('Песочница', -1009999000001)
      on conflict (tg_chat_id) do update set is_active = true
      returning id`)

    const communityId = chat!.id

    for (let index = 0; index < people; index += 1) {
      const [user] = await trx.execute<{ id: string }>(sql`
        insert into app_user (tg_id, first_name, username, status, onboarding_step, consent_at)
        values (
          ${900000000 + index},
          ${`Тест ${index + 1}`},
          ${`test_${index + 1}`},
          'active',
          'done',
          now()
        )
        on conflict (tg_id) do update set status = 'active'
        returning id`)

      const userId = user!.id

      await trx.execute(sql`
        insert into user_community (user_id, community_id)
        values (${userId}, ${communityId})
        on conflict do nothing`)

      // Каждому по два занятия и два слота, с перекрытием между людьми.
      await trx.execute(sql`
        insert into user_interest (user_id, interest_id, recurrence, start_time, end_time)
        select ${userId}, i.id, s.recurrence, s.start_time, s.end_time
        from (select id, row_number() over (order by key) as n from interest where is_active) i
        cross join (values
          ('RRULE:FREQ=WEEKLY;BYDAY=SA', '16:00'::time, '23:00'::time),
          ('RRULE:FREQ=WEEKLY;BYDAY=TU', '19:00'::time, '23:00'::time)
        ) as s(recurrence, start_time, end_time)
        where i.n in (${1 + (index % 3)}, ${2 + (index % 3)})
        on conflict do nothing`)
    }

    return { communityId, people }
  })
