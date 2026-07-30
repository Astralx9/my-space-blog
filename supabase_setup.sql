-- Fresh-install schema for My Space.
-- Existing projects must use supabase/migrations/20260726190000_secure_content_and_media.sql instead.

create table if not exists public.posts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  title text not null,
  content text not null,
  category text not null check (category in ('diary', 'learning')),
  tags text[] not null default '{}',
  "isDraft" boolean not null default false,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

create table if not exists public.photos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  url text not null,
  storage_path text,
  "extractedColors" jsonb,
  "createdAt" bigint not null
);

create table if not exists public.weights (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  weight numeric not null,
  date bigint not null
);

create table if not exists public.todos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  title text not null,
  description text not null,
  completed boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  "createdAt" bigint not null
);

create index if not exists posts_user_created_idx on public.posts (user_id, "createdAt" desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);
create index if not exists photos_user_created_idx on public.photos (user_id, "createdAt" desc);
create index if not exists weights_user_date_idx on public.weights (user_id, date);
create index if not exists todos_user_created_idx on public.todos (user_id, "createdAt" desc);

alter table public.posts enable row level security;
alter table public.photos enable row level security;
alter table public.weights enable row level security;
alter table public.todos enable row level security;

create policy "Users manage their own posts" on public.posts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own photos" on public.photos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own weights" on public.weights for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own todos" on public.todos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their own blog media" on storage.objects for select to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users upload their own blog media" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update their own blog media" on storage.objects for update to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their own blog media" on storage.objects for delete to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
