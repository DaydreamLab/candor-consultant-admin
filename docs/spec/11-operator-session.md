# Spec 11 — Operator Session

規範示範登入與目標 operator 身份的對照。權威權限矩陣：[candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)、身份：[spec 24](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/24-identity-and-auth.md)。

## 現況

| 項目 | 實作 |
|------|------|
| Store | `app/stores/session.ts` |
| 登入 | `POST /api/v1/admin/auth/login`（email、password） |
| Base | `NUXT_PUBLIC_API_BASE`，預設 `https://candor-core.dev.daydream-lab.com/api/v1` |
| Token | `localStorage` 鍵 `candor.operator.token`（不進 cookie、URL、log） |
| 身份 | 同鍵旁的 profile（`operator`：`id`、`roles[]`、`email`、`name`）；過期即清掉 |
| 角色 | API 只回 `roles: ("expert"｜"ops"｜"admin")[]`（非空、去重）；**不再有單一 `role`** |
| 目前身份 API | `GET /admin/me` 已接（`data={id,email,name,roles[],status,last_login_at}`，無 `permissions`）。`/account` 唯讀顯示回應。401（含舊 JWT 只有 `role`）→ 清 session 並導回 `/login?reason=session_expired` |
| Operators CRUD | `/operators` 已接 core `/admin/operators/**`（僅 admin；expert／ops 403／導回總覽）。表單 `roles[]` 多選至少一項；409 `cannot_modify_self`／`cannot_remove_last_admin`／`conflict` 與 422 顯示中文 |

舊 cookie `candor-admin-session` 在 session store 啟動時清除，不再當登入憑證。

其餘示範頁仍用 `Role`（`platform_*`／`consultant_*`）做 Mock 權限。登入成功後只在 store 內暫時對應，**不寫進 API**：

| operator `roles` | 暫時對應的示範 `Role` | 用途 |
|------------------|------------------------|------|
| 含 `admin` | `consultant_admin` | 既有 Mock 頁的寫入／帳號權限 |
| 其餘（`ops`／`expert`） | `consultant_ops` | 既有 Mock 頁的寫入 |

側欄底部姓名用 `GET /admin/me` 的 `name`；請求尚未回來時，暫用登入寫入的 `operator.name`。角色標籤用 `roles[]`。

權限繼承：`admin` 含 expert 與 ops 能力（可進專家站與營運後台；登入後走 `/choose-panel`）。

## 目標（直連）

| 項目 | 契約 |
|------|------|
| 登入／refresh | `POST /admin/auth/login`／`refresh` → `operator.roles[]`（無 `role`） |
| 目前身份 | `GET /admin/me` → 同上 |
| Operators CRUD | list／create／patch 的 request／response 用 `roles[]` |
| 預設帳號 | `admin@daydream-lab.com` → `roles: ["admin","expert"]` |
| Token | 私有儲存，鍵與 younger user token **分開**（建議 `candor.operator.token`） |
| Header | `Authorization: Bearer <operator token>` |
| 租戶 | 單租戶；無 `orgId` 切換 API |

## 示範角色 → 目標角色（遷移參考）

| 示範 `Role` | 建議對應 | 備註 |
|-------------|----------|------|
| `platform_viewer` | （移除或唯讀 `admin` 觀察） | core 無「平台股東」角色；接線後刪除 |
| `platform_assist` | `ops` 或 `admin` | 依產品決定；禁止自造 platform API |
| `consultant_ops` | `ops` | 商品／訂單 |
| `consultant_admin` | `admin` | 帳號與去識別化 |
| （無） | `expert` | 調權／校正；示範站需新增入口 |

對照僅供 UI 遷移；**API 不得接受** `platform_*`／`consultant_*` 字串。

## Middleware

| 檔案 | 現況 | 接線後 |
|------|------|--------|
| `auth.global.ts` | 檢查 operator token；未登入導向 `/login`。登入後依 `operator.roles`：僅 expert → `/expert/`；僅 ops → `/`；有營運＋專家站能力（含單純 `admin`、或 `ops`+`expert`）→ `/choose-panel`。`/expert/*` 需專家站能力；營運後台頁需營運能力。已登入可直打網址。舊 `/bookings*`、`/calendar*` 轉 `/expert/...`。不在這裡打 `GET /admin/me` | 仍只檢查 token＋角色路徑 |
| `platform.global.ts` | 限制 platformOnly nav | 改為 core 角色；`orgs` 等不做頁應移除或永遠隱藏 |

前端只看 `roles[]`（正規化排序 admin→ops→expert），不以 email 判斷多角色，不依賴 `permissions[]`。JWT 只有 `roles` claim；舊 token 只有 `role` 會驗證失敗→重登。

## 相關

- 畫面範圍：[10-screen-scope.md](10-screen-scope.md)
- 架構：[../01-architecture.md](../01-architecture.md)
