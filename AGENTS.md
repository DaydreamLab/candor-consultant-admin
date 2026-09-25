# AGENTS.md — candor-consultant-admin 開發慣例

給 AI coding agent 與人類貢獻者的專案慣例。違反以下規則的 PR 應被拒絕。

本 repo 是 **商家後台**（operator 端）。HTTP API、領域模型與權限矩陣在 **candor-core**；本專案負責畫面、示範 Mock 與未來直連 `/api/v1/admin/**`。

契約權威：

- 後台範圍：[candor-core docs/spec/29-admin-api.md](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/29-admin-api.md)
- 詞彙：[spec 10](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/10-domain-model.md)
- Client 義務：[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md)
- 直連拓撲：[docs/05](https://github.com/DaydreamLab/candor-core/blob/main/docs/05-integration-architecture.md)
- 接線看板：[docs/04](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md)（本 repo 見 [docs/03-progress.md](docs/03-progress.md)；狀態變更須雙向同步）

## 硬規則

1. **命名以 candor-core domain 為準。** 新程式識別子用 `operator`、`order`、`order_line`、`sellable_item`、`package_plan`。禁止長期以 `staff`、`platform_*`、`consultant_*`、`case`／`caseId`、`selection`／`keyIn` 當正式識別子。示範 Mock 可暫留舊型別，接線 PR 合併前須改名或刪除 shim。
2. **不得為 spec 29「不做」能力自造相容 API。** 明確不做：`orgs`（多租戶）、`cases`、`labs`（檢驗排程）、`selections`／`keyin`、顧問請款 `invoices`、`reviews`（簽核）、履約 `progress` 看板。現有示範頁可留作 UI 殼，但不得對接或發明對應後端契約。
3. **Browser 直連 core admin。** 正式資料經 Bearer **operator** JWT 打 `/api/v1/admin/**`。不得把 user JWT 與 operator JWT 混用同一 storage 鍵或同一 client 預設 header。
4. **Token 存放。** 接線後只放私有儲存（建議 `localStorage`，鍵與 user 前台分開，例如 `candor.operator.token`）；禁止 URL query／前端 log。現行示範 session 用 cookie `candor-admin-session`，僅 Mock。
5. **權限對齊 core。** 目標角色為 `expert`｜`ops`｜`admin`（見 spec 29）；示範角色 `platform_*`／`consultant_*` 不得寫進 API 契約。
6. **不在聊天或 commit 中洩漏 secrets。**
7. **接線狀態雙寫。** 改 Mock／接線中／已接／不做 時，同步本 repo [docs/03-progress.md](docs/03-progress.md) 與 candor-core `docs/04`。

## 目錄結構

```
candor-consultant-admin/
├── AGENTS.md
├── README.md
├── docs/
│   └── spec/
├── app/
│   ├── components/
│   ├── composables/
│   ├── layouts/          # auth、default
│   ├── middleware/       # auth.global、platform.global
│   ├── pages/            # 示範 nav 頁（含不做範圍的殼）
│   ├── stores/           # session、ops
│   ├── types/admin.ts    # 示範型別（含舊詞；接線時改）
│   └── utils/            # nav、demo、labels…
├── i18n/locales/
└── nuxt.config.ts
```

## 測試與 CI

- `pnpm run lint`、`pnpm run typecheck` 必須通過後再 commit／push。

## 文件優先

行為變更若影響後台範圍、角色或必接端點，先更新本 repo `docs/spec/*.md` 與（必要時）candor-core spec 29／04，再改碼。
