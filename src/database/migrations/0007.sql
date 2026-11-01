-- ─── Прогулка ─────────────────────────────────────────────────────────
-- Добавить значение в enum можно и через alter type, но тогда тест
-- test/interests.spec.mts не увидит нового перечисления: он читает
-- последний блок `create type interest_key ... as enum`. Поэтому тип
-- пересобирается целиком, как в 0005.
-- Повторный прогон безопасен: если 'walk' уже есть, блок пропускается.

do $$
begin
    if not exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'interest_key'
          and e.enumlabel = 'walk'
    ) then
        create type interest_key_next as enum (
            'bar', 'run', 'movie', 'expo', 'bike', 'karaoke', 'tennis', 'billiards', 'walk'
        );

        alter table interest
            alter column key type interest_key_next
            using key::text::interest_key_next;

        drop type interest_key;

        alter type interest_key_next rename to interest_key;
    end if;
end $$;


-- ─── Строка справочника ───────────────────────────────────────────────
-- Гулять можно и вдвоём, и компанией — верхняя граница шире средней.

insert into interest (key, min_size, max_size)
values ('walk', 2, 6)
on conflict (key) do nothing;
