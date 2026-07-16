-- ============================================================================
-- UCAR 6.0 — Use Case Arms Race
-- One schema, one ontology, one extraction path.
--
-- LOCKED ONTOLOGY (do not renegotiate in a prompt ever again):
--   CASE   = VERB + OBJECT_CLASS + INSTRUMENT  (the semantic triple)
--   FILING = a news event filed against a case: WHO (subject) did the
--            triple to WHOM/WHAT (object details), per one source URL.
--   Title  = "VERB OBJECT_CLASS · WITH INSTRUMENT"
--            e.g. "SURVEIL STUDENTS · WITH FACIAL RECOGNITION"
--
-- Vocabulary is CLOSED. The LLM proposes raw terms; resolution happens in
-- SQL (exact -> alias -> trigram -> embedding -> pending review). New terms
-- are never silently canonical: they land as status='pending' and flag the
-- case for review. Matched-but-inexact raw terms are learned as aliases,
-- so the resolver gets stronger with every filing.
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- VOCABULARY
-- ---------------------------------------------------------------------------
create table vocab_terms (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('verb','object_class','instrument')),
  term        text not null,
  status      text not null default 'active'
              check (status in ('active','pending','merged','rejected')),
  merged_into uuid references vocab_terms(id),
  embedding   vector(384),
  created_at  timestamptz not null default now(),
  unique (kind, term)
);
create index vocab_terms_trgm on vocab_terms using gin (term gin_trgm_ops);
create index vocab_terms_vec  on vocab_terms using hnsw (embedding vector_cosine_ops);

create table vocab_aliases (
  id       uuid primary key default gen_random_uuid(),
  term_id  uuid not null references vocab_terms(id) on delete cascade,
  alias    text not null,
  learned_from text,                       -- 'trigram' | 'embedding' | 'manual'
  created_at timestamptz not null default now(),
  unique (term_id, alias)
);
create index vocab_aliases_trgm on vocab_aliases using gin (alias gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- CASES  (identity = the triple; object_class nullable via sentinel key)
-- ---------------------------------------------------------------------------
create table cases (
  id              uuid primary key default gen_random_uuid(),
  case_number     bigint generated always as identity (start with 101),
  verb_id         uuid not null references vocab_terms(id),
  object_class_id uuid references vocab_terms(id),
  instrument_id   uuid not null references vocab_terms(id),
  object_key      uuid generated always as
                  (coalesce(object_class_id,'00000000-0000-0000-0000-000000000000'::uuid)) stored,
  title_render    text not null,
  status          text not null default 'live' check (status in ('live','review','retired')),
  filing_count    int  not null default 0,
  good_votes      int  not null default 0,
  evil_votes      int  not null default 0,
  fake_votes      int  not null default 0,
  embedding       vector(384),
  first_filed_at  timestamptz,
  last_filed_at   timestamptz,
  created_at      timestamptz not null default now(),
  unique (verb_id, instrument_id, object_key)
);
create index cases_last_filed on cases (last_filed_at desc);
create index cases_vec on cases using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- FILINGS
-- ---------------------------------------------------------------------------
create table filings (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid not null references cases(id),
  headline           text not null,
  summary            text not null,
  article_quote      text,
  subject            text,                 -- WHO deployed it (named org)
  raw_verb           text,                 -- what the LLM actually said,
  raw_object_class   text,                 -- kept for audit + alias learning
  raw_instrument     text,
  object_details     jsonb not null default '{}',
  instrument_details jsonb not null default '{}',
  impact             smallint check (impact between 1 and 5),
  source_url         text not null unique,
  source_domain      text,
  published_at       timestamptz,
  status             text not null default 'live'
                     check (status in ('live','under_review','rejected')),
  embedding          vector(384),
  search_tsv         tsvector generated always as (
                       to_tsvector('english',
                         headline || ' ' || summary || ' ' || coalesce(subject,''))
                     ) stored,
  created_at         timestamptz not null default now()
);
create index filings_case    on filings (case_id, created_at desc);
create index filings_created on filings (created_at desc) where status = 'live';
create index filings_tsv     on filings using gin (search_tsv);
create index filings_vec     on filings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- SOCIAL: votes, tracked cases, profiles, daily show
-- ---------------------------------------------------------------------------
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  handle       text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table votes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  case_id    uuid not null references cases(id) on delete cascade,
  kind       text not null check (kind in ('good','evil','fake')),
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

create table tracks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  case_id    uuid not null references cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

create table daily_show (
  show_date date primary key default current_date,
  title     text not null,
  video_url text,
  blurb     text
);

-- ---------------------------------------------------------------------------
-- CRAWL PIPELINE
-- ---------------------------------------------------------------------------
create table sources (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  url            text not null unique,
  kind           text not null default 'rss' check (kind in ('rss','gdelt')),
  enabled        boolean not null default true,
  last_polled_at timestamptz,
  error_count    int not null default 0
);

create table prospects (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,
  source_name   text,
  title         text,
  status        text not null default 'found'
                check (status in ('found','fetched','promoted','extracted','skipped','rejected','error')),
  score         int,
  raw_text      text,
  error         text,
  discovered_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index prospects_status on prospects (status, discovered_at);

-- ---------------------------------------------------------------------------
-- COUNTER TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function bump_case_on_filing() returns trigger
language plpgsql as $$
begin
  update cases set
    filing_count   = filing_count + 1,
    first_filed_at = least(coalesce(first_filed_at, new.created_at), new.created_at),
    last_filed_at  = greatest(coalesce(last_filed_at, new.created_at), new.created_at)
  where id = new.case_id;
  return new;
end $$;
create trigger trg_bump_case after insert on filings
  for each row execute function bump_case_on_filing();

create or replace function recount_votes() returns trigger
language plpgsql security definer as $$
declare v_case uuid := coalesce(new.case_id, old.case_id);
begin
  update cases set
    good_votes = (select count(*) from votes where case_id = v_case and kind='good'),
    evil_votes = (select count(*) from votes where case_id = v_case and kind='evil'),
    fake_votes = (select count(*) from votes where case_id = v_case and kind='fake')
  where id = v_case;
  return null;
end $$;
create trigger trg_recount_votes after insert or update or delete on votes
  for each row execute function recount_votes();

-- ---------------------------------------------------------------------------
-- RESOLUTION LADDER (the fix for vocabulary minting)
-- exact -> alias -> trigram(0.55) -> embedding(0.80) -> no match
-- ---------------------------------------------------------------------------
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
    where m.s >= 0.70  -- raised from 0.55 to prevent games→gamers type errors
    order by m.s desc
    limit 1;
  if found then return; end if;

  -- 4. embedding
  if p_embedding is not null then
    return query
      select t.id, t.term, 'embedding'::text, (1 - (t.embedding <=> p_embedding))::real
      from vocab_terms t
      where t.kind = p_kind and t.status = 'active' and t.embedding is not null
        and (1 - (t.embedding <=> p_embedding)) >= 0.80
      order by t.embedding <=> p_embedding
      limit 1;
  end if;
end $$;

-- Upsert a case by triple identity. Returns case id.
create or replace function resolve_case(
  p_verb uuid, p_object uuid, p_instrument uuid,
  p_title text, p_status text, p_embedding vector(384)
) returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from cases
  where verb_id = p_verb and instrument_id = p_instrument
    and object_key = coalesce(p_object,'00000000-0000-0000-0000-000000000000'::uuid);
  if v_id is not null then return v_id; end if;

  insert into cases (verb_id, object_class_id, instrument_id, title_render, status, embedding)
  values (p_verb, p_object, p_instrument, p_title, p_status, p_embedding)
  on conflict (verb_id, instrument_id, object_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from cases
    where verb_id = p_verb and instrument_id = p_instrument
      and object_key = coalesce(p_object,'00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return v_id;
end $$;

-- Hybrid search: keyword rank + vector similarity, merged.
create or replace function hybrid_search_filings(p_q text, p_qvec vector(384), p_limit int default 40)
returns table (filing_id uuid, score real)
language sql stable as $$
  with kw as (
    select f.id, ts_rank(f.search_tsv, websearch_to_tsquery('english', p_q))::real as r
    from filings f
    where f.status = 'live'
      and p_q is not null and length(btrim(p_q)) > 0
      and f.search_tsv @@ websearch_to_tsquery('english', p_q)
    order by r desc limit 60
  ),
  vec as (
    select f.id, (1 - (f.embedding <=> p_qvec))::real as s
    from filings f
    where f.status = 'live' and f.embedding is not null and p_qvec is not null
    order by f.embedding <=> p_qvec limit 60
  )
  select coalesce(kw.id, vec.id) as filing_id,
         (coalesce(kw.r, 0) * 0.5 + coalesce(vec.s, 0))::real as score
  from kw full outer join vec on kw.id = vec.id
  order by score desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Edge functions use the service role and bypass RLS. The browser uses the
-- anon key + anonymous auth and gets exactly this surface:
-- ---------------------------------------------------------------------------
alter table vocab_terms  enable row level security;
alter table vocab_aliases enable row level security;
alter table cases        enable row level security;
alter table filings      enable row level security;
alter table profiles     enable row level security;
alter table votes        enable row level security;
alter table tracks       enable row level security;
alter table daily_show   enable row level security;
alter table sources      enable row level security;
alter table prospects    enable row level security;

create policy pub_vocab   on vocab_terms for select using (status = 'active');
create policy pub_cases   on cases       for select using (status in ('live','review'));
create policy pub_filings on filings     for select using (status = 'live');
create policy pub_show    on daily_show  for select using (true);

create policy own_profile_sel on profiles for select using (auth.uid() = user_id);
create policy own_profile_ins on profiles for insert with check (auth.uid() = user_id);
create policy own_profile_upd on profiles for update using (auth.uid() = user_id);

create policy own_votes_sel on votes for select using (auth.uid() = user_id);
create policy own_votes_ins on votes for insert with check (auth.uid() = user_id);
create policy own_votes_upd on votes for update using (auth.uid() = user_id);
create policy own_votes_del on votes for delete using (auth.uid() = user_id);

create policy own_tracks_sel on tracks for select using (auth.uid() = user_id);
create policy own_tracks_ins on tracks for insert with check (auth.uid() = user_id);
create policy own_tracks_del on tracks for delete using (auth.uid() = user_id);
-- sources and prospects: no public policies. Service role only.
