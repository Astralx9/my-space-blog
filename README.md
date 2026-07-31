# My Space Blog — 自托管版

React/Vite 前端配套 Fastify + 本地 PostgreSQL。Supabase、Vercel Function 与 Supabase Storage 均不参与运行时。首次启动的是空数据库，不导入或迁移旧 Supabase 数据。

## 数据与权限模型

- 注册会自动创建唯一博客；`blogs.owner_user_id` 有唯一约束。
- JWT 只存于 `HttpOnly` Cookie，默认有效期 14 天；服务端每次请求都验证 JWT 对应的用户和博客仍存在。
- 文章、相册、待办、体重、内嵌图片均以 `blog_id` 过滤。文件不暴露为静态目录，`/api/media/:id` 必须通过当前用户验证后才能读取。
- PostgreSQL schema 在 `server/migrations/001_initial_schema.sql`，`npm run db:migrate` 使用 `schema_migrations` 记录已执行迁移。

## 本地运行

需要 Node 22+ 与本地 PostgreSQL，或 Docker Compose。

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev:server
# 另一个终端：Vite 的 /blog/api 会代理到 3001
npm run dev
```

打开 `http://localhost:5173/blog/`。生产 API 配置使用 `.env.server`；可从 `.env.server.example` 复制并填入强随机 `JWT_SECRET` 与数据库密码。

```bash
cp .env.server.example .env.server
docker compose up -d --build
```

`docker compose` reads its PostgreSQL variables and `DATABASE_URL` directly from `.env.server`; keep the credentials in those two values consistent.

或者在已配置的 PostgreSQL 上执行：

```bash
npm run build
npm run db:migrate
npm run start
```

`npm run start` 仅启动 Fastify API（默认 `127.0.0.1:3001`）；生产前端由 Nginx 提供 `dist/` 静态文件。`deploy/nginx-blog.conf.example` 已将 `/blog/api/*` 反代为 Fastify 的 `/api/*`，并保留 React 的 `/blog/` SPA 回退。部署时设置 `COOKIE_SECURE=true` 并通过 HTTPS 提供站点。

## 验证

```bash
npm run lint
npm run check
npm run build
```

## 运行环境变量

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for a direct Node deployment |
| `JWT_SECRET` | At least 32 random characters; keep only on the server |
| `MEDIA_DIR` | Private local directory for uploads |
| `COOKIE_PATH` | `/blog` when behind the supplied Nginx config |
| `COOKIE_SECURE` | `true` behind HTTPS, `false` only for local HTTP |
| `PUBLIC_API_PREFIX` | Browser-visible API prefix, normally `/blog/api` |
| `UPLOAD_LIMIT_BYTES` | Per-image server limit; default 3 MB |
