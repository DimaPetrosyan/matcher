-- ─── Размер группы у занятия ──────────────────────────────────────────
-- Сколько людей нужно, задаёт занятие, а не человек: человек не знает,
-- со сколькими незнакомцами хочет встретиться, а у падела ответ один — четверо.
-- Встреча собирается, когда набран минимум, и не растёт выше максимума.

alter table interest add column if not exists min_size smallint not null default 2;  -- с этого числа согласившихся встреча состоится
alter table interest add column if not exists max_size smallint not null default 4;  -- на этом числе набор закрывается

do $$ begin
    alter table interest
        add constraint interest_size_check check (min_size >= 2 and max_size >= min_size);
exception
    when duplicate_object then null;
end $$;


-- ─── Убираем волейбол и падел ─────────────────────────────────────────
-- Для них нужно четверо и больше: в одном чате такие группы почти
-- не соберутся, а человек будет ждать встречу, которой не будет.
-- Значение из enum удалить нельзя — тип пересобирается целиком.
-- Повторный прогон безопасен: если значений уже нет, блок пропускается.

do $$
begin
    if exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'interest_key'
          and e.enumlabel in ('volley', 'padel')
    ) then
        delete from user_interest
        using interest
        where user_interest.interest_id = interest.id
          and interest.key in ('volley', 'padel');

        delete from interest where key in ('volley', 'padel');

        create type interest_key_next as enum (
            'bar', 'run', 'movie', 'expo', 'bike', 'karaoke', 'tennis', 'billiards'
        );

        alter table interest
            alter column key type interest_key_next
            using key::text::interest_key_next;

        drop type interest_key;

        alter type interest_key_next rename to interest_key;
    end if;
end $$;


-- ─── Размеры по занятиям ──────────────────────────────────────────────

update interest set min_size = 2, max_size = 4 where key in ('tennis', 'billiards', 'movie', 'expo');
update interest set min_size = 2, max_size = 6 where key in ('bar', 'run', 'bike');
update interest set min_size = 2, max_size = 8 where key = 'karaoke';
