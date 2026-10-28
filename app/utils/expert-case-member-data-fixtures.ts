/**
 * Local member-data fixture for expert-case-reviews (unit / UI demos).
 * Includes core draft `profile.display_profile` plus raw snapshot intake bag.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ExpertCaseMemberProfile } from './expert-case-display'
import { isRecord } from './expert-case-display'

export type ExpertCaseMemberDataFixture = {
  goals?: unknown
  goals_source?: unknown
  messages?: unknown
  health_report?: unknown
  profile?: ExpertCaseMemberProfile | null
  [key: string]: unknown
}

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'test/fixtures/expert-case-member-data.json'), 'utf8')
) as ExpertCaseMemberDataFixture

export function expertCaseMemberDataFixture(): ExpertCaseMemberDataFixture {
  return structuredClone(fixture)
}

export function expertCaseMemberDataFixtureWithoutDisplayProfile(): ExpertCaseMemberDataFixture {
  const data = expertCaseMemberDataFixture()
  if (isRecord(data.profile)) {
    const { display_profile: _omit, ...rest } = data.profile
    data.profile = rest
  }
  return data
}
