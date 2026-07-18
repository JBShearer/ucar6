-- UCAR 6.0 — Raise embedding threshold to reduce false matches
-- Changed from 0.80 to 0.90 to prevent "AI video analysis" → "sentiment analysis" type errors

create or replace function match_vocab(p_kind text, p_raw text, p_embedding vector(384))
returns table (term_id uuid, canonical text, method text, score real)
language plpgsql as $$
declare v_norm text := lower(btrim(p_raw));
begin
  -- 1. exact
  return query
    select t.id, t.term, 'exact'::text, 1.0::real
    from vocab_terms t
    where t.kind = p_kind and t.status = 'active' and t.term = v_norm
    limit 1;
  if found then return; end if;

  -- 2. alias
  return query
    select t.id, t.term, 'alias'::text, 1.0::real
    from vocab_aliases a join vocab_terms t on t.id = a.term_id
    where t.kind = p_kind and t.status = 'active' and a.alias = v_norm
    limit 1;
  if found then return; end if;

  -- 3. trigram over terms and aliases
  return query
    select m.id, m.term, 'trigram'::text, m.s
    from (
      select t.id, t.term, similarity(t.term, v_norm) as s
      from vocab_terms t
      where t.kind = p_kind and t.status = 'active'
      union all
      select t.id, t.term, similarity(a.alias, v_norm) as s
      from vocab_aliases a join vocab_terms t on t.id = a.term_id
      where t.kind = p_kind and t.status = 'active'
    ) m
    where m.s >= 0.70
    order by m.s desc
    limit 1;
  if found then return; end if;

  -- 4. embedding (raised from 0.80 to 0.90 for stricter matching)
  if p_embedding is not null then
    return query
      select t.id, t.term, 'embedding'::text, (1 - (t.embedding <=> p_embedding))::real
      from vocab_terms t
      where t.kind = p_kind and t.status = 'active' and t.embedding is not null
        and (1 - (t.embedding <=> p_embedding)) >= 0.90
      order by t.embedding <=> p_embedding
      limit 1;
  end if;
end $$;
