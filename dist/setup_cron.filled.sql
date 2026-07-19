-- UCAR 6.0 cron. Run ONCE in the Supabase Dashboard SQL editor.
-- Prereq: Dashboard -> Database -> Extensions -> enable pg_cron and pg_net.
-- Replace znhsnishdqrmumxbgobq and 4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87 before running
-- (deploy.sh prints a filled-in copy of this file for you).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Crawler: discover + fetch + score + promote, every 20 minutes.
select cron.schedule('ucar-crawl', '*/20 * * * *', $$
  select net.http_post(
    url     := 'https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/crawler?action=run',
    headers := jsonb_build_object('x-admin-key','4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87','Content-Type','application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);

-- Extractor: process promoted prospects, every 10 minutes.
select cron.schedule('ucar-extract', '*/10 * * * *', $$
  select net.http_post(
    url     := 'https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/extract?action=run',
    headers := jsonb_build_object('x-admin-key','4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87','Content-Type','application/json'),
    body    := '{"max": 5}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);

-- To verify: select jobname, schedule, active from cron.job;
-- To pause:  select cron.unschedule('ucar-crawl');
