-- ─── Сообщества ───────────────────────────────────────────────────────

create table if not exists community (
    id          uuid        primary key default uuidv7(),  -- UUIDv7: сортируемый, время достаётся uuid_extract_timestamp()
    title       text        not null,                      -- название для текстов бота: «участники „Наши на Мясницкой“»
    tg_chat_id  bigint      not null unique,               -- чат сообщества; по нему getChatMember. У супергрупп начинается с -100
    is_active   boolean     not null default true,         -- выключенное не проверяется при /start и не участвует в матчинге
    created     timestamptz not null default now(),        -- когда строка появилась
    updated     timestamptz not null default now()         -- когда менялась последний раз; проставляется в самом UPDATE
);


-- ─── Участники ────────────────────────────────────────────────────────

create table if not exists app_user (
    id              uuid        primary key default uuidv7(),  -- внутренний ключ; все ссылки только на него, никогда на tg_id
    tg_id           bigint      not null unique,               -- пользователь в Telegram и он же идентификатор личного чата. bigint: давно за 32 бита
    username        text,                                      -- @username без собаки; может отсутствовать и меняться. Для кнопки «Контакты»
    first_name      text,                                      -- имя из профиля Telegram; показывается в составе события
    language_code   text,                                      -- язык клиента; пригодится, если появится второй язык
    source          text        not null default 'direct',     -- канал привлечения: по ссылке из группы или открыл бота сам
    status          text        not null default 'onboarding', -- жизненный цикл; в пул матчинга попадают только 'active'
    consent_at      timestamptz,                               -- момент согласия на обработку ПДн; ставится один раз и не переписывается
    consent_version text,                                      -- редакция политики, на которую человек согласился
    created         timestamptz not null default now(),        -- когда зарегистрировался
    updated         timestamptz not null default now(),        -- когда менялся последний раз; проставляется в самом UPDATE

    -- 'onboarding' — профиль не заполнен; 'unreachable' — заблокировал бота;
    -- 'paused' — сам ушёл на паузу; 'left' — вышел из сообщества
    constraint app_user_status_check
        check (status in ('onboarding','active','paused','unreachable','left')),

    -- 'deeplink_unknown' — пришёл со ссылкой, которой нет в справочнике:
    -- ссылка устарела или человек напечатал /start руками
    constraint app_user_source_check
        check (source in ('direct','deeplink','deeplink_unknown'))
);


-- ─── Членство: many-to-many ───────────────────────────────────────────
-- Продуктово пока одно сообщество на человека, но на уровне БД
-- не ограничиваем — потом не мигрировать данные.

create table if not exists user_community (
    user_id      uuid        not null references app_user(id)  on delete cascade,  -- участник; каскад — при удалении данных членство исчезает
    community_id uuid        not null references community(id) on delete cascade,  -- сообщество, членство подтверждено getChatMember
    created      timestamptz not null default now(),                               -- когда членство подтвердилось. updated не нужен: строка не меняется
    primary key (user_id, community_id)                                            -- пара уникальна: дубликат членства невозможен физически
);


-- ─── Журнал действий: append-only, источник всех продуктовых метрик ───

create table if not exists audit_log (
    id      uuid        primary key default uuidv7(),               -- как и везде: сортируемый UUID. Однородность схемы важнее восьми байт
    type    text        not null,                                   -- 'start_command' | 'consent_given' | …; по нему считаются метрики
    user_id uuid        references app_user(id) on delete set null, -- null до регистрации и у отказов — там человека в системе ещё нет
    payload jsonb       not null default '{}'::jsonb,               -- детали: источник, слаг сообщества, исход проверки членства
    created timestamptz not null default now()                      -- когда произошло. updated не нужен: журнал не переписывается
);

-- Под запросы метрик: «сколько событий типа X за неделю»
create index if not exists audit_log_created_type_idx on audit_log (created, type);
