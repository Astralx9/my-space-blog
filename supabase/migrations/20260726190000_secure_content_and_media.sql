-- Personal blog hardening and media migration.
-- Existing rows are assigned to the earliest auth account. This is suitable for
-- the current single-author blog; review before applying to a multi-user project.

alter table public.posts add column if not exists user_id uuid references auth.users(id);
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists "updatedAt" bigint;
alter table public.posts add column if not exists "isDraft" boolean not null default false;

alter table public.photos add column if not exists user_id uuid references auth.users(id);
alter table public.photos add column if not exists storage_path text;

alter table public.weights add column if not exists user_id uuid references auth.users(id);
alter table public.todos add column if not exists user_id uuid references auth.users(id);

do $$
declare
  owner_id uuid;
begin
  select id into owner_id from auth.users order by created_at asc limit 1;
  if owner_id is null then
    raise exception 'Create the blog owner account before applying this migration.';
  end if;

  update public.posts set user_id = owner_id where user_id is null;
  update public.photos set user_id = owner_id where user_id is null;
  update public.weights set user_id = owner_id where user_id is null;
  update public.todos set user_id = owner_id where user_id is null;
end $$;

alter table public.posts alter column user_id set not null;
alter table public.photos alter column user_id set not null;
alter table public.weights alter column user_id set not null;
alter table public.todos alter column user_id set not null;

alter table public.posts alter column user_id set default auth.uid();
alter table public.photos alter column user_id set default auth.uid();
alter table public.weights alter column user_id set default auth.uid();
alter table public.todos alter column user_id set default auth.uid();

update public.posts set "updatedAt" = "createdAt" where "updatedAt" is null;
alter table public.posts alter column "updatedAt" set not null;

create index if not exists posts_user_created_idx on public.posts (user_id, "createdAt" desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);
create index if not exists photos_user_created_idx on public.photos (user_id, "createdAt" desc);
create index if not exists weights_user_date_idx on public.weights (user_id, date);
create index if not exists todos_user_created_idx on public.todos (user_id, "createdAt" desc);

drop policy if exists "Allow public read access on posts" on public.posts;
drop policy if exists "Allow public read access on photos" on public.photos;
drop policy if exists "Allow public read access on weights" on public.weights;
drop policy if exists "Allow public read access on todos" on public.todos;
drop policy if exists "Allow auth users to modify posts" on public.posts;
drop policy if exists "Allow auth users to modify photos" on public.photos;
drop policy if exists "Allow auth users to modify weights" on public.weights;
drop policy if exists "Allow auth users to modify todos" on public.todos;
drop policy if exists "Allow public to modify posts" on public.posts;
drop policy if exists "Allow public to modify photos" on public.photos;
drop policy if exists "Allow public to modify weights" on public.weights;
drop policy if exists "Allow public to modify todos" on public.todos;

create policy "Users manage their own posts" on public.posts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own photos" on public.photos for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own weights" on public.weights for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own todos" on public.todos for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their own blog media" on storage.objects;
drop policy if exists "Users upload their own blog media" on storage.objects;
drop policy if exists "Users update their own blog media" on storage.objects;
drop policy if exists "Users delete their own blog media" on storage.objects;

create policy "Users read their own blog media" on storage.objects for select to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users upload their own blog media" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update their own blog media" on storage.objects for update to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their own blog media" on storage.objects for delete to authenticated
  using (bucket_id = 'blog-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
