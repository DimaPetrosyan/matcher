-- ─── Недельная сетка доступности на интересе ──────────────────────────
-- Слот описывается по образцу Google Calendar: правило повторения плюс
-- часы. Часовой пояс не хранится — он свойство сообщества, а не строки.
-- Строк на интерес теперь несколько: по одной на каждый выбранный слот.

alter table user_interest add column if not exists id         uuid not null default uuidv7();  -- суррогатный ключ: составной сюда не годится, слот между шагами пуст
alter table user_interest add column if not exists recurrence text;                            -- RRULE одного дня: 'RRULE:FREQ=WEEKLY;BYDAY=SA'. Null — интерес выбран, время ещё не спросили
alter table user_interest add column if not exists start_time time;                            -- начало окна по стенным часам; отличает «Сб днём» от «Сб веч» — правило у них одно
alter table user_interest add column if not exists end_time   time;                            -- конец окна


-- Первичный ключ переезжает с пары (user_id, interest_id) на id:
-- пара больше не уникальна, а nullable-колонки в ключ не положить.
do $$
declare
    pk_columns int;
begin
    select coalesce(max(cardinality(conkey)), 0) into pk_columns
    from pg_constraint
    where conrelid = 'user_interest'::regclass and contype = 'p';

    if pk_columns <> 1 then
        alter table user_interest drop constraint if exists user_interest_pkey;
        alter table user_interest add constraint user_interest_pkey primary key (id);
    end if;
end $$;


-- nulls not distinct — то, ради чего это работает: по умолчанию Postgres
-- считает два NULL разными, и строк «интерес без слота» можно было бы
-- наплодить сколько угодно.
create unique index if not exists user_interest_slot_uidx
    on user_interest (user_id, interest_id, recurrence, start_time)
    nulls not distinct;
