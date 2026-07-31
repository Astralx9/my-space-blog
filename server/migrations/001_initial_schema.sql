create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists blogs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references users(id) on delete cascade,
  name text not null default '我的空间',
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  content text not null,
  category text not null check (category in ('diary', 'learning')),
  tags text[] not null default '{}',
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_files (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  storage_key text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  media_id uuid not null unique references media_files(id) on delete cascade,
  extracted_colors jsonb,
  taken_on date,
  location text,
  story text,
  created_at timestamptz not null default now()
);

create table if not exists weights (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  weight numeric(5, 2) not null check (weight > 0 and weight < 300),
  recorded_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  completed boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_blog_created_idx on posts (blog_id, created_at desc);
create index if not exists photos_blog_created_idx on photos (blog_id, created_at desc);
create index if not exists weights_blog_recorded_idx on weights (blog_id, recorded_at);
create index if not exists todos_blog_created_idx on todos (blog_id, created_at desc);
