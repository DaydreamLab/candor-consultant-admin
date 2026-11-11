import { describe, expect, it } from 'vitest'
import {
  displayOrderNo,
  mapAdminShipmentToRow,
  mapApiShipStatus,
  mapShipStatus,
  readShipmentListPayload,
  shipmentSearchHaystack
} from './shipment-map'

describe('mapShipStatus', () => {
  it('keeps UI statuses', () => {
    expect(mapShipStatus('picking')).toBe('picking')
    expect(mapShipStatus('labeling')).toBe('labeling')
    expect(mapShipStatus('in_transit')).toBe('in_transit')
    expect(mapShipStatus('delivered')).toBe('delivered')
  })

  it('maps core aliases', () => {
    expect(mapShipStatus('arrived')).toBe('delivered')
    expect(mapShipStatus('shipped')).toBe('in_transit')
    expect(mapShipStatus('picked')).toBe('picking')
  })
})

describe('mapApiShipStatus', () => {
  it('keeps API statuses', () => {
    expect(mapApiShipStatus('picking')).toBe('picking')
    expect(mapApiShipStatus('in_transit')).toBe('in_transit')
    expect(mapApiShipStatus('arrived')).toBe('arrived')
  })

  it('maps aliases onto API statuses', () => {
    expect(mapApiShipStatus('delivered')).toBe('arrived')
    expect(mapApiShipStatus('shipped')).toBe('in_transit')
    expect(mapApiShipStatus('picked')).toBe('picking')
  })
})

describe('mapAdminShipmentToRow', () => {
  it('maps order_id / order_no / tracking_no and derives events', () => {
    const row = mapAdminShipmentToRow({
      id: 'shp_1',
      order_id: 'ord_9',
      order_no: 'ORD-1001',
      status: 'picking',
      tracking_no: null,
      package_plan_name: '進階方案',
      updated_at: '2026-10-26T02:00:00Z',
      picked_at: '2026-10-26T01:00:00Z',
      shipped_at: null,
      arrived_at: null
    }, {
      id: 'ord_9',
      order_no: 'ORD-1001',
      recipient: { name: '王小明' },
      package: {
        components: [{ sku: 'SKU-A', qty: 2 }]
      }
    })

    expect(row).toMatchObject({
      id: 'shp_1',
      orderId: 'ord_9',
      orderNo: 'ORD-1001',
      customer: '王小明',
      status: 'picking',
      apiStatus: 'picking',
      packagePlanName: '進階方案',
      updatedAt: '2026-10-26T02:00:00Z',
      source: 'api',
      items: [{ sku: 'SKU-A', qty: 2 }]
    })
    expect(row?.events.some(event => event.status === 'picking')).toBe(true)
  })

  it('maps arrived status to delivered UI and arrived API', () => {
    const row = mapAdminShipmentToRow({
      id: 'shp_2',
      status: 'arrived',
      arrived_at: '2026-10-20T12:00:00Z',
      shipped_at: '2026-10-19T08:00:00Z',
      picked_at: '2026-10-18T08:00:00Z'
    })
    expect(row?.status).toBe('delivered')
    expect(row?.apiStatus).toBe('arrived')
  })

  it('appends bottle_addons pick items alongside package components', () => {
    const row = mapAdminShipmentToRow({
      id: 'shp_3',
      order_id: 'ord_3',
      order_no: 'ORD-3003',
      status: 'picking',
      package_plan_name: '基礎方案'
    }, {
      id: 'ord_3',
      package: {
        components: [{ sku: 'SKU-A', qty: 2 }]
      },
      bottle_addons: [
        {
          sellable_item_sku: 'OMG-BTL',
          sellable_item_name: 'Omega 整瓶',
          qty: 2
        }
      ]
    })
    expect(row?.items).toEqual([
      { sku: 'SKU-A', qty: 2 },
      { sku: 'OMG-BTL', qty: 2 }
    ])
  })
})

describe('displayOrderNo / search', () => {
  it('prefers orderNo over caseId mapping', () => {
    expect(displayOrderNo({ caseId: 'C-1', orderNo: 'ORD-REAL' })).toBe('ORD-REAL')
    expect(displayOrderNo({ caseId: 'C-24076', orderNo: null })).toBe('ORD-24076')
  })

  it('includes order keys in haystack', () => {
    const hay = shipmentSearchHaystack({
      id: 'shp_1',
      caseId: 'ord_9',
      orderId: 'ord_9',
      orderNo: 'ORD-1001',
      orgId: '',
      customer: '王小明',
      status: 'picking',
      tracking: 'SF1',
      shippedAt: null,
      items: [],
      events: []
    })
    expect(hay).toContain('ord-1001')
    expect(hay).toContain('ord_9')
    expect(hay).toContain('sf1')
  })
})

describe('readShipmentListPayload', () => {
  it('reads shipments / items envelopes', () => {
    expect(readShipmentListPayload({ shipments: [{ id: 'a' }] })).toEqual([{ id: 'a' }])
    expect(readShipmentListPayload({ items: [{ id: 'b' }] })).toEqual([{ id: 'b' }])
    expect(readShipmentListPayload([{ id: 'c' }])).toEqual([{ id: 'c' }])
  })
})
