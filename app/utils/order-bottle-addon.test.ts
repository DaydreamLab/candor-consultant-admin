import { describe, expect, it } from 'vitest'
import {
  bottleAddonAmountOf,
  bottleAddonPickItemsOf,
  bottleAddonsOf,
  orderHasBottleAddon,
  packageAmountOf
} from './order-bottle-addon'

describe('order-bottle-addon', () => {
  const orderWithSnapshot = {
    amount_total: 4500,
    package_amount: 3980,
    addon_amount: 520,
    package: { package_plan_price: 3980 },
    bottle_addons: [
      {
        sellable_item_id: 'si_1',
        sellable_item_name: 'Omega 整瓶',
        sellable_item_sku: 'OMG-BTL',
        qty: 2,
        unit_price: 260,
        amount: 520
      }
    ],
    lines: [
      { kind: 'lab_service', lab_service_name: '血檢', amount: 0 }
    ]
  }

  it('reads bottle_addons snapshot first', () => {
    const rows = bottleAddonsOf(orderWithSnapshot)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      sellable_item_name: 'Omega 整瓶',
      sellable_item_sku: 'OMG-BTL',
      qty: 2,
      unit_price: 260,
      amount: 520
    })
  })

  it('falls back to lines kind=bottle_addon', () => {
    const rows = bottleAddonsOf({
      lines: [
        {
          kind: 'bottle_addon',
          sellable_item_name: '維他命D',
          sku: 'VD-BTL',
          quantity: 1,
          bottle_price: 390
        }
      ]
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.sellable_item_sku).toBe('VD-BTL')
    expect(rows[0]?.qty).toBe(1)
    expect(rows[0]?.unit_price).toBe(390)
    expect(rows[0]?.amount).toBe(390)
  })

  it('list badge uses only has_bottle_addon (not addon_amount / snapshot)', () => {
    expect(orderHasBottleAddon({ has_bottle_addon: true })).toBe(true)
    expect(orderHasBottleAddon({ has_bottle_addon: false })).toBe(false)
    expect(orderHasBottleAddon({
      has_bottle_addon: false,
      addon_amount: 100,
      bottle_addons: [{ amount: 100, qty: 1 }]
    })).toBe(false)
    expect(orderHasBottleAddon({ addon_amount: 100 })).toBe(false)
    expect(orderHasBottleAddon(orderWithSnapshot)).toBe(false)
    expect(orderHasBottleAddon(null)).toBe(false)
  })

  it('splits package vs addon amounts', () => {
    expect(packageAmountOf(orderWithSnapshot)).toBe(3980)
    expect(bottleAddonAmountOf(orderWithSnapshot)).toBe(520)
    expect(packageAmountOf({
      amount_total: 4500,
      bottle_addons: [{ amount: 500, qty: 1 }]
    })).toBe(4000)
  })

  it('builds pick items for shipping', () => {
    expect(bottleAddonPickItemsOf(orderWithSnapshot)).toEqual([
      { sku: 'OMG-BTL', qty: 2, name: 'Omega 整瓶' }
    ])
  })
})
