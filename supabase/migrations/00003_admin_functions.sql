-- UCAR 6.0 — admin and similarity functions

-- Nearby cases by embedding (the "similar-to" graph view).
create or replace function similar_cases(p_case_id uuid, p_limit int default 6)
returns table (id uuid, case_number bigint, title_render text, filing_count int, sim real)
language sql stable as $$
  select c.id, c.case_number, c.title_render, c.filing_count,
         (1 - (c.embedding <=> src.embedding))::real as sim
  from cases c,
       (select embedding from cases where id = p_case_id) src
  where c.id <> p_case_id
    and c.status = 'live'
    and c.embedding is not null
    and src.embedding is not null
  order by c.embedding <=> src.embedding
  limit p_limit;
$$;

-- Merge a pending/duplicate vocab term into a canonical one.
-- Re-points cases; when the re-pointed triple collides with an existing
-- case, moves the filings there and retires the duplicate.
create or replace function merge_vocab_term(p_from uuid, p_into uuid)
returns void
language plpgsql as $$
declare
  r record;
  v_target uuid;
begin
  for r in
    select * from cases
    where verb_id = p_from or instrument_id = p_from or object_class_id = p_from
  loop
    select id into v_target from cases
    where verb_id       = (case when r.verb_id       = p_from then p_into else r.verb_id end)
      and instrument_id = (case when r.instrument_id = p_from then p_into else r.instrument_id end)
      and object_key    = coalesce(
            (case when r.object_class_id = p_from then p_into else r.object_class_id end),
            '00000000-0000-0000-0000-000000000000'::uuid)
      and id <> r.id;

    if v_target is not null then
      update filings set case_id = v_target where case_id = r.id;
      update cases set
        status = 'retired', filing_count = 0
      where id = r.id;
      update cases set
        filing_count  = (select count(*) from filings where case_id = v_target),
        last_filed_at = (select max(created_at) from filings where case_id = v_target),
        first_filed_at= (select min(created_at) from filings where case_id = v_target)
      where id = v_target;
    else
      update cases set
        verb_id         = (case when verb_id = p_from then p_into else verb_id end),
        instrument_id   = (case when instrument_id = p_from then p_into else instrument_id end),
        object_class_id = (case when object_class_id = p_from then p_into else object_class_id end)
      where id = r.id;
    end if;
  end loop;

  update vocab_terms set status = 'merged', merged_into = p_into where id = p_from;
end $$;

-- Flip review cases to live once every term in their triple is active.
create or replace function release_review_cases()
returns int
language plpgsql as $$
declare n int;
begin
  update cases c set status = 'live'
  where c.status = 'review'
    and (select status from vocab_terms where id = c.verb_id) = 'active'
    and (select status from vocab_terms where id = c.instrument_id) = 'active'
    and (c.object_class_id is null
         or (select status from vocab_terms where id = c.object_class_id) = 'active');
  get diagnostics n = row_count;
  return n;
end $$;
