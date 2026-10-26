import { describe, expect, it } from 'vitest'
import { itemsSummary, orderNoFromCaseId, shipmentUpdatedAt } from './shipping-display'

describe('orderNoFromCaseId', () => {
  it('maps C- prefix to ORD-', () => {
    expect(orderNoFromCaseId('C-24076')).toBe('ORD-24076')
  })

  it('passes through unknown ids', () => {
    expect(orderNoFromCaseId('SH-24076')).toBe('SH-24076')
  })
})

describe('shipmentUpdatedAt', () => {
  it('uses latest event', () => {
    expect(shipmentUpdatedAt([
      { at: '2026-09-07 09:10' },
      { at: '2026-09-07 15:42' }
    ], null)).toBe('2026-09-07 15:42')
  })

  it('falls back to shippedAt', () => {
    expect(shipmentUpdatedAt([], '2026-09-01')).toBe('2026-09-01')
  })
})

describe('itemsSummary', () => {
  it('summarizes first item and total count', () => {
    expect(itemsSummary(
      [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }, { sku: 'C', qty: 1 }],
      sku => (sku === 'A' ? 'Omega-3' : sku),
      n => `等 ${n} 項`
    )).toBe('Omega-3 ×2 等 3 項')
  })

  it('shows a single line without more suffix', () => {
    expect(itemsSummary(
      [{ sku: 'A', qty: 1 }],
      () => 'Mg',
      n => `等 ${n} 項`
    )).toBe('Mg ×1')
  })
})
