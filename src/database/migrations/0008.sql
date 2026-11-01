-- ─── Кальян, театр, лекции ────────────────────────────────────────────
-- Тип пересобирается целиком, а не дополняется через alter type: тест
-- test/interests.spec.mts читает последний блок `create type ... as enum`.
-- Повторный прогон безопасен: если 'hookah' уже есть, блок пропускается.
--
-- 'expo' остаётся ключом, но в словарях теперь зовётся «Музей» — это то же
-- самое место в списке, менять ключ ради подписи смысла нет.

do $$
begin
    if not exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'interest_key'
          and e.enumlabel = 'hookah'
    ) then
        create type interest_key_next as enum (
            'bar', 'run', 'movie', 'expo', 'bike', 'karaoke', 'tennis', 'billiards',
            'walk', 'hookah', 'theatre', 'lecture'
        );

        alter table interest
            alter column key type interest_key_next
            using key::text::interest_key_next;

        drop type interest_key;

        alter type interest_key_next rename to interest_key;
    end if;
end $$;


-- ─── Строки справочника ───────────────────────────────────────────────
-- Кальян и театр — небольшой компанией, лекция собирает шире.

insert into interest (key, min_size, max_size)
values ('hookah', 2, 5), ('theatre', 2, 4), ('lecture', 2, 8)
on conflict (key) do nothing;
