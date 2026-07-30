# My Space

一个基于 React、Vite 和 Supabase 的个人记录空间，包含文章、摄影作品、Todo、体重记录与轻量 PWA 支持。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中配置：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

不要把 `service_role` 或任何私钥放进 Vite 环境变量。

## 首次创建 Supabase 数据库

在 Supabase SQL Editor 执行 `supabase_setup.sql`。它会创建数据表、按登录用户隔离的 RLS 策略，以及公共读取、仅本人写入的 `blog-media` 图片桶。

## 已有项目升级

已部署过旧版本时，请先在 Supabase SQL Editor 执行：

`supabase/migrations/20260726190000_secure_content_and_media.sql`

该迁移会：

- 将旧内容归属到项目中最早创建的认证账号；
- 移除匿名全写入策略，改为 `auth.uid()` 所有权策略；
- 添加文章标签、草稿、更新时间和图片 Storage 路径；
- 创建 `blog-media` Storage bucket 和其对象策略。

执行迁移后，以该账号登录网站，确认历史文章和图片存在，再部署新版前端。

## 验证命令

```bash
npm run lint
npm run check
npm run build
```

生产构建会生成 `manifest.webmanifest` 和 Service Worker；支持安装为轻量 PWA，并缓存应用外壳以改善弱网下的启动体验。
