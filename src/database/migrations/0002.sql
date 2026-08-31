-- ─── Перечисление занятий ─────────────────────────────────────────────
-- Порядок значений роли не играет: кнопки сортируются по подписи при
-- отрисовке. У create type нет "if not exists", повтор гасится вручную.

do $$ begin
    create type interest_key as enum (
        'board', 'bar', 'run', 'movie', 'expo',
        'coffee', 'bike', 'banya', 'volley', 'karaoke'
    );
exception
    when duplicate_object then null;
end $$;


-- ─── Справочник интересов ─────────────────────────────────────────────

create table if not exists interest (
    id        uuid         primary key default uuidv7(),  -- как везде: сортируемый UUID; на него ссылается user_interest
    key       interest_key not null unique,               -- занятие; едет в callback_data, по нему берётся подпись из i18n. Порядок кнопок отсюда не берётся
    is_active boolean      not null default true,         -- выключенное не рисуется и не участвует в матчинге, но старые связи не теряются
    created   timestamptz  not null default now(),        -- когда строка появилась
    updated   timestamptz  not null default now()         -- когда менялась последний раз; проставляется в самом UPDATE
);


-- ─── Интересы пользователя: many-to-many ──────────────────────────────

create table if not exists user_interest (
    user_id     uuid        not null references app_user(id) on delete cascade,  -- каскад: с пользователем уходят и его интересы
    interest_id uuid        not null references interest(id) on delete cascade,  -- ссылка на справочник; значения вне перечисления физически не запишутся
    created     timestamptz not null default now(),                              -- когда отметил. updated не нужен: строка не меняется
    primary key (user_id, interest_id)                                           -- пара уникальна: задвоить связь нельзя
);


-- ─── Свои варианты: сырьё для расширения справочника ──────────────────
-- В матчинге не участвуют: текст не нормализован. Нужны, чтобы понять,
-- каких занятий не хватает в перечислении.

create table if not exists interest_suggestion (
    id      uuid        primary key default uuidv7(),                            -- как и везде: сортируемый UUID
    user_id uuid        not null references app_user(id) on delete cascade,       -- чей вариант
    body    text        not null,                                                -- что человек написал, как написал. body, а не text: text — имя типа
    created timestamptz not null default now(),                                  -- когда написал. updated не нужен: строка не меняется
    unique (user_id, body)                                                       -- повтор того же текста не создаёт строку
);


-- ─── Состояние онбординга ─────────────────────────────────────────────
-- onboarding_step: 'interests' | 'availability' | 'area' | 'done'.
-- Без него обработчик текста не отличит «свой вариант» от случайного
-- сообщения. CHECK не ставим: состав шагов ещё меняется.
-- wizard_message_id: сообщение мастера, которое перерисовывается на каждый
-- тап. После свободного текста мастер уезжает вниз, и id обновляется.

alter table app_user add column if not exists onboarding_step   text not null default 'interests';
alter table app_user add column if not exists wizard_message_id bigint;


-- ─── Сид справочника ──────────────────────────────────────────────────
-- Состав берётся из самого перечисления, повторять список не нужно.
-- do nothing, а не do update: погашенный руками пункт не воскресает.

insert into interest (key)
select unnest(enum_range(null::interest_key))
on conflict (key) do nothing;
