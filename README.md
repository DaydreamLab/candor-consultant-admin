# 坦見／Candor 顧問後台

路徑：`~/Projects/candor-consultant-admin`

Y 顧問營運後台（多租戶）。**不是** A 客人端 App。客人只付給 A；諮詢內容不存放於此。

## 第一週可見

- 側欄：履約、倉儲出貨、請款與報表、平台
- **簽核**已上線給業主／老闆看（人工檢視、臨床判定；引擎尚未接入）
- 主色 `#629DE0`，日間／夜間，繁中／EN
- 示範登入可切角色：A 股東唯讀、A 協助、顧問營運、顧問管理員

## 技術

Nuxt 4、Vue 3、TypeScript、Nuxt UI v4、Tailwind v4、Pinia、Zod、`@nuxtjs/i18n`、pnpm、Node 22。資料先 Mock。

```bash
nvm use
pnpm install
pnpm dev
```

開發網址：http://localhost:3000

預設角色用「A 股東／業主」登入，可看到全部顧問公司與簽核列表。
