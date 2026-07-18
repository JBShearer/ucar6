-- UCAR 6.0 — Enhanced similar_cases to return latest headline

create or replace function similar_cases(p_case_id uuid, p_limit int default 6)
returns table (id uuid, case_number bigint, title_render text, filing_count int, latest_headline text, sim real)
language sql stable as $$
  select c.id, c.case_number, c.title_render, c.filing_count,
         (select f.headline from filings f where f.case_id = c.id and f.status = 'live'
          order by f.created_at desc limit 1) as latest_headline,
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
