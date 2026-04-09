-- 这是一个完整的初始化脚本。如果您之前没有成功建表，请直接运行这个脚本。

-- 1. 创建文章表
create table if not exists posts (
  id uuid primary key,
  title text not null,
  content text not null,
  category text not null,
  "createdAt" bigint not null
);

-- 2. 创建照片表
create table if not exists photos (
  id uuid primary key,
  url text not null,
  "extractedColors" jsonb,
  "createdAt" bigint not null
);

-- 3. 创建体重记录表
create table if not exists weights (
  id uuid primary key,
  weight numeric not null,
  date bigint not null
);

-- 4. 创建 TODO 列表表
create table if not exists todos (
  id uuid primary key,
  title text not null,
  description text not null,
  completed boolean default false,
  steps jsonb default '[]'::jsonb,
  "createdAt" bigint not null
);

-- 5. 开启所有表的行级安全策略 (Row Level Security)
alter table posts enable row level security;
alter table photos enable row level security;
alter table weights enable row level security;
alter table todos enable row level security;

-- 6. 删除可能存在的旧安全策略（以防冲突）
drop policy if exists "Allow public read access on posts" on posts;
drop policy if exists "Allow public read access on photos" on photos;
drop policy if exists "Allow public read access on weights" on weights;
drop policy if exists "Allow public read access on todos" on todos;
drop policy if exists "Allow auth users to modify posts" on posts;
drop policy if exists "Allow auth users to modify photos" on photos;
drop policy if exists "Allow auth users to modify weights" on weights;
drop policy if exists "Allow auth users to modify todos" on todos;
drop policy if exists "Allow public to modify posts" on posts;
drop policy if exists "Allow public to modify photos" on photos;
drop policy if exists "Allow public to modify weights" on weights;
drop policy if exists "Allow public to modify todos" on todos;

-- 7. 创建全新的安全策略：允许任何人读取数据（浏览博客）
create policy "Allow public read access on posts" on posts for select using (true);
create policy "Allow public read access on photos" on photos for select using (true);
create policy "Allow public read access on weights" on weights for select using (true);
create policy "Allow public read access on todos" on todos for select using (true);

-- 8. 创建全新的安全策略：允许任何人写入/修改数据
-- （由于我们在前端已经加上了 "hph" 密码拦截，所以这里向前端代码放行所有操作）
create policy "Allow public to modify posts" on posts for all using (true) with check (true);
create policy "Allow public to modify photos" on photos for all using (true) with check (true);
create policy "Allow public to modify weights" on weights for all using (true) with check (true);
create policy "Allow public to modify todos" on todos for all using (true) with check (true);
