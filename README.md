# 坦見／Candor — 商家後台

Operator 端：商品／庫存／價格帶、訂單出貨、報告校正與權重（目標直連 [candor-core](https://github.com/DaydreamLab/candor-core) `/api/v1/admin/**`）。**不是**客人端 App。

## 線上示範

- 預覽：https://daydreamlab.github.io/candor-consultant-admin/
- 原始碼：https://github.com/DaydreamLab/candor-consultant-admin

登入已打 core `POST /api/v1/admin/auth/login`。其餘畫面仍是**前端 Mock**（多租戶示範資料）。目標為單租戶 operator 後台，範圍見 [docs/00-overview.md](docs/00-overview.md)。

## 技術棧

| 技術 | 用途 |
|------|------|
| Nuxt 4／Vue 3／TypeScript | 應用框架 |
| Nuxt UI v4／Tailwind v4 | 元件與主題 |
| Pinia | session／ops |
| Zod／@nuxtjs/i18n | 表單與繁中／EN |
| pnpm／Node 22 | 套件與 runtime |

## 文件索引

| 文件 | 說明 |
|------|------|
| [docs/00-overview.md](docs/00-overview.md) | 願景、現況 vs 目標、非目標 |
| [docs/01-architecture.md](docs/01-architecture.md) | Mock／直連邊界 |
| [docs/02-roadmap.md](docs/02-roadmap.md) | M0–M4 里程碑 |
| [docs/03-progress.md](docs/03-progress.md) | 接線進度（與 core 04 雙寫） |
| [docs/spec/10-screen-scope.md](docs/spec/10-screen-scope.md) | 側欄 in-scope vs 不做 |
| [docs/spec/11-operator-session.md](docs/spec/11-operator-session.md) | 示範角色 vs expert／ops／admin |
| [AGENTS.md](AGENTS.md) | AI／貢獻者硬規則 |

Core 側：[docs/04](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md)、[docs/05](https://github.com/DaydreamLab/candor-core/blob/main/docs/05-integration-architecture.md)、[spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)、[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md)。

## 常用指令

```bash
nvm use
pnpm install
pnpm dev
pnpm run lint && pnpm run typecheck
pnpm generate   # GitHub Pages
```

本機單獨開發：http://localhost:3000

與 candor-core 一起用 `docker compose` 時，後台是 `admin` 服務，開 http://localhost:3001（`NUXT_PUBLIC_API_BASE=http://localhost:8080/api/v1`）。埠避開前台的 3000；core 的 `CORS_ALLOWED_ORIGINS` 須包含 `http://localhost:3001`。

登入走 core `POST /admin/auth/login`（operator 帳號，見 [spec 24](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/24-identity-and-auth.md)）。
