import { describe, expect, it } from 'vitest'
import {
  formatLocalDateTime,
  normalizeInstantString,
  parseInstant
} from './format-local-datetime'

describe('format-local-datetime', () => {
  it('normalizes Postgres-style timestamps', () => {
    expect(normalizeInstantString('2026-10-25 06:22:00+00')).toBe('2026-10-25T06:22:00+00:00')
    expect(normalizeInstantString('2026-10-25 06:22:00+0800')).toBe('2026-10-25T06:22:00+08:00')
  })

  it('parses ISO and Postgres instants', () => {
    expect(parseInstant('2026-10-25T06:22:00Z')?.toISOString()).toBe('2026-10-25T06:22:00.000Z')
    expect(parseInstant('2026-10-25 06:22:00+00')?.toISOString()).toBe('2026-10-25T06:22:00.000Z')
    expect(parseInstant('2026-10-25')).toBeNull()
    expect(parseInstant('')).toBeNull()
  })

  it('formats in Asia/Taipei and UTC', () => {
    const iso = '2026-10-25T06:22:00Z'
    expect(formatLocalDateTime(iso, { timeZone: 'Asia/Taipei', style: 'list' })).toBe('10/25 14:22')
    expect(formatLocalDateTime(iso, { timeZone: 'UTC', style: 'list' })).toBe('10/25 06:22')
    expect(formatLocalDateTime(iso, { timeZone: 'Asia/Taipei', style: 'full' })).toBe('2026-10-25 14:22')
  })

  it('formats Postgres +00 as local', () => {
    expect(formatLocalDateTime('2026-10-25 06:22:00+00', {
      timeZone: 'Asia/Taipei',
      style: 'full'
    })).toBe('2026-10-25 14:22')
  })

  it('leaves pure dates unchanged', () => {
    expect(formatLocalDateTime('2026-10-25', { timeZone: 'UTC' })).toBe('2026-10-25')
  })

  it('returns em-dash for empty and raw for garbage', () => {
    expect(formatLocalDateTime(null)).toBe('—')
    expect(formatLocalDateTime('')).toBe('—')
    expect(formatLocalDateTime('not-a-date')).toBe('not-a-date')
  })
})
