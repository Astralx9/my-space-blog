-- Optional editorial metadata for each personal photography work.
alter table public.photos
  add column if not exists taken_at timestamptz,
  add column if not exists location text,
  add column if not exists story text;

