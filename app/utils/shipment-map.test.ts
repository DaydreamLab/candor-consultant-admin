import { describe, expect, it } from 'vitest'
import {
  displayOrderNo,
  mapAdminShipmentToRow,
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

describe('mapAdminShipmentToRow', () => {
  it('maps order_id / order_no / tracking_no and derives events', () => {
    const row = mapAdminShipmentToRow({
      id: 'shp_1',
      order_id: 'ord_9',
      order_no: 'ORD-1001',
      status: 'picking',
      tracking_no: null,
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
      source: 'api',
      items: [{ sku: 'SKU-A', qty: 2 }]
    })
    expect(row?.events.some(event => event.status === 'picking')).toBe(true)
  })

  it('maps arrived status to delivered', () => {
    const row = mapAdminShipmentToRow({
      id: 'shp_2',
      status: 'arrived',
      arrived_at: '2026-10-20T12:00:00Z',
      shipped_at: '2026-10-19T08:00:00Z',
      picked_at: '2026-10-18T08:00:00Z'
    })
    expect(row?.status).toBe('delivered')
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
