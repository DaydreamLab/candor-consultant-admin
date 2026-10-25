import type {
  PrivacyPolicy,
  PrivacyPolicyVersionDetail,
  PrivacyPolicyVersionSummary
} from '~/utils/privacy-policy-api'

/** Fixture bodies for UI screenshots when core #87 is not live. */
const BODY_V1 = `# 隱私權政策

感謝您使用坦見服務。

## 我們收集的資料

- 帳號與聯絡資訊
- 服務使用紀錄
- 必要的 Cookie／本機儲存

## 資料用途

我們僅在提供健康顧問相關服務所需範圍內處理資料。
`

const BODY_V2 = `# 隱私權政策

感謝您使用坦見服務。本版更新了 Cookie 與第三方說明。

## 我們收集的資料

- 帳號與聯絡資訊
- 服務使用紀錄與裝置資訊
- 必要的 Cookie／本機儲存（登入與同意狀態）

## 資料用途

我們僅在提供健康顧問相關服務所需範圍內處理資料，並可能與金流／簡訊服務商分享完成交易所需欄位。

## Cookie

詳見網站 Cookie 說明；政策版本變更時會再次徵求同意。
`

export const PRIVACY_POLICY_FIXTURE_CURRENT: PrivacyPolicy = {
  title: '坦見隱私權政策',
  body: BODY_V2,
  version: 2,
  updated_at: '2026-10-24T12:00:00Z',
  updated_by: 'ops@candor.local'
}

export const PRIVACY_POLICY_FIXTURE_VERSIONS: PrivacyPolicyVersionSummary[] = [
  {
    version: 2,
    title: '坦見隱私權政策',
    updated_at: '2026-10-24T12:00:00Z',
    updated_by: 'ops@candor.local',
    preview: '感謝您使用坦見服務。本版更新了 Cookie…'
  },
  {
    version: 1,
    title: '坦見隱私權政策',
    updated_at: '2026-09-01T08:00:00Z',
    updated_by: 'admin@candor.local',
    preview: '感謝您使用坦見服務。'
  }
]

const DETAILS: Record<number, PrivacyPolicyVersionDetail> = {
  1: {
    version: 1,
    title: '坦見隱私權政策',
    body: BODY_V1,
    updated_at: '2026-09-01T08:00:00Z',
    updated_by: 'admin@candor.local'
  },
  2: {
    version: 2,
    title: '坦見隱私權政策',
    body: BODY_V2,
    updated_at: '2026-10-24T12:00:00Z',
    updated_by: 'ops@candor.local'
  }
}

export function privacyPolicyFixtureVersion(version: number): PrivacyPolicyVersionDetail {
  const row = DETAILS[version]
  if (!row) {
    return {
      version,
      title: PRIVACY_POLICY_FIXTURE_CURRENT.title,
      body: PRIVACY_POLICY_FIXTURE_CURRENT.body,
      updated_at: PRIVACY_POLICY_FIXTURE_CURRENT.updated_at,
      updated_by: PRIVACY_POLICY_FIXTURE_CURRENT.updated_by
    }
  }
  return row
}
