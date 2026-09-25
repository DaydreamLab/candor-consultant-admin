# Spec 11 — Operator Session

規範示範登入與目標 operator 身份的對照。權威權限矩陣：[candor-core spec 29](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)、身份：[spec 24](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/24-identity-and-auth.md)。

## 現況（Mock）

| 項目 | 實作 |
|------|------|
| Store | `app/stores/session.ts` |
| 登入 | `loginAs(staffId)` 從 `DEMO_STAFF` 選人 |
| 存放 | cookie `candor-admin-session`（整份 `SessionUser`） |
| 型別 | `Role` = `platform_viewer`｜`platform_assist`｜`consultant_ops`｜`consultant_admin` |
| 租戶 | `orgId`／`orgName` 可空；platform 角色看全部 org |

**僅供示範**，不得當成 core 契約。

## 目標（直連）

| 項目 | 契約 |
|------|------|
| 登入 | `POST /admin/auth/login` → operator JWT |
| 目前身份 | `GET /admin/me` |
| 角色 | `expert`｜`ops`｜`admin` |
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
| `auth.global.ts` | 未登入導向 `/login` | 改為檢查 operator token／me |
| `platform.global.ts` | 限制 platformOnly nav | 改為 core 角色；`orgs` 等不做頁應移除或永遠隱藏 |

## 相關

- 畫面範圍：[10-screen-scope.md](10-screen-scope.md)
- 架構：[../01-architecture.md](../01-architecture.md)
