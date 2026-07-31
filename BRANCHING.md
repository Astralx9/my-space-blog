## My Space Blog 分支策略

本仓库维护两套彼此独立的运行系统：

| 分支 | 系统 | 数据库与部署 |
| --- | --- | --- |
| `master` | Supabase + Vercel 主线 | Supabase Auth/Database/Storage + Vercel |
| `selfhost/tencent-cloud` | 腾讯云自托管版本 | Fastify + 本地 PostgreSQL + Nginx/systemd |

### 开发规则

- Windows 本地目录 `C:\Users\Astral\Documents\my-space-blog-vercel` 只用于 `master` 主线。
- 腾讯云服务器运行 `selfhost/tencent-cloud`，不在 Windows 本地复制或开发自托管代码。
- 修改前先运行 `git status -sb` 和 `git branch --show-current`。
- `master` 的功能分支从 `master` 创建，例如 `codex/vercel-gallery-fix`。
- `selfhost/tencent-cloud` 的功能分支从自托管分支创建，例如 `codex/selfhost-gallery-fix`。
- 不要把两个长期分支互相合并，也不要用一个分支覆盖另一个分支。
- 共享的纯 UI 修改可以手动移植；认证、数据访问、上传、新闻 API 和部署配置必须分别实现。
- `master` 不得引入 Fastify、PostgreSQL、systemd、Nginx 或 `server/` 运行时。
- 自托管分支不得恢复 Supabase 客户端、Supabase Storage、Vercel Function 或 `vercel.json` 运行时依赖。

### Windows 主线验证

```powershell
npm run check
npm run lint
npm run build
```

发布前确认目标是 Vercel 项目，不要把 Windows 主线代码部署到腾讯云自托管服务。

### 给 Codex 的明确提示

```text
目标系统：Supabase + Vercel
项目路径：C:\Users\Astral\Documents\my-space-blog-vercel
目标分支：master
不要修改 selfhost/tencent-cloud
```
