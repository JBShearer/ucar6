-- UCAR 6.0 cron. Run ONCE in the Supabase Dashboard SQL editor.
-- Prereq: Dashboard -> Database -> Extensions -> enable pg_cron and pg_net.
-- Replace __PROJECT_REF__ and __ADMIN_KEY__ before running
-- (deploy.sh prints a filled-in copy of this file for you).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Crawler: discover + fetch + score + promote, every 20 minutes.
select cron.schedule('ucar-crawl', '*/20 * * * *', $$
  select net.http_post(
    url     := 'https://__PROJECT_REF__.supabase.co/functions/v1/crawler?action=run',
    headers := jsonb_build_object('x-admin-key','__ADMIN_KEY__','Content-Type','application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);

-- Extractor: process promoted prospects, every 10 minutes.
select cron.schedule('ucar-extract', '*/10 * * * *', $$
  select net.http_post(
    url     := 'https://__PROJECT_REF__.supabase.co/functions/v1/extract?action=run',
    headers := jsonb_build_object('x-admin-key','__ADMIN_KEY__','Content-Type','application/json'),
    body    := '{"max": 5}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);

-- To verify: select jobname, schedule, active from cron.job;
-- To pause:  select cron.unschedule('ucar-crawl');
