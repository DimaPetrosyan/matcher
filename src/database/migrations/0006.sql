-- ─── Встречи: модель «доска событий» ──────────────────────────────────
-- Бот предлагает не людей, а встречу: «Бильярд, суббота, вечер». Приглашение
-- уходит всем, у кого совпали интерес и время; кто первым согласился — тот идёт.
-- Размер группы берётся из interest по interest_id, во встречу не копируется.
-- Индексов под запросы пока нет: добавим, когда запросы появятся в коде.


-- ─── Статусы ──────────────────────────────────────────────────────────
-- У create type нет "if not exists", повтор гасится вручную.

do $$ begin
    create type event_status as enum ('open', 'confirmed', 'cancelled');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type event_user_status as enum ('invited', 'accepted', 'declined', 'closed');
exception
    when duplicate_object then null;
end $$;


-- ─── Встреча ──────────────────────────────────────────────────────────

create table if not exists event (
    id            uuid         primary key default uuidv7(),                          -- как везде: сортируемый UUID
    community_id  uuid         not null references community(id) on delete cascade,  -- встреча внутри одного сообщества: закрытый контур
    interest_id   uuid         not null references interest(id),                     -- занятие; отсюда же min_size и max_size
    starts_at     timestamptz  not null,                                             -- начало: настоящий момент, а не правило, как у слота
    ends_at       timestamptz  not null,                                             -- конец окна
    respond_until timestamptz  not null,                                             -- до какого момента принимаются ответы; дальше подводится итог
    status        event_status not null default 'open',                              -- open — идёт набор; confirmed — состоится; cancelled — не собрались
    created       timestamptz  not null default now(),                               -- когда встречу создал планировщик
    updated       timestamptz  not null default now(),                               -- когда менялся статус; проставляется в самом UPDATE

    unique (community_id, interest_id, starts_at),                                   -- идемпотентность генерации: повторный прогон не создаст дубль
    constraint event_time_check check (ends_at > starts_at and respond_until <= starts_at)  -- срок ответа не позже начала
);


-- ─── Приглашение человека на встречу ──────────────────────────────────
-- Время приглашения — это created: строка появляется ровно в момент приглашения.
-- Время ответа как метрика пишется в audit_log, отдельной колонки нет.

create table if not exists event_user (
    event_id   uuid              not null references event(id) on delete cascade,     -- встреча; каскад: с отменённой встречей уходят и приглашения
    user_id    uuid              not null references app_user(id) on delete cascade,  -- приглашённый
    status     event_user_status not null default 'invited',                          -- invited → accepted | declined | closed; closed — «не успел», а не отказ
    message_id bigint,                                                                -- сообщение с приглашением: чтобы погасить кнопки, когда набор закрылся
    created    timestamptz       not null default now(),                              -- когда пригласили; по нему считается лимит в неделю
    updated    timestamptz       not null default now(),                              -- когда менялся статус

    primary key (event_id, user_id)                                                   -- одного человека на одну встречу дважды не пригласить
);
