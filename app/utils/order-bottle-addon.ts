/**
 * Whole-bottle add-on (整瓶加購) helpers.
 * Contract (candor-core PR① / openapi-admin): order_lines kind=bottle_addon,
 * order.bottle_addons snapshot, sellable_items.addon_eligible / bottle_only.
 */

export type BottleAddonLine = {
  sellable_item_id: string
  sellable_item_name: string
  sellable_item_sku: string
  qty: number
  unit_price: number | null
  amount: number | null
  raw: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function recordsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function scalarText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function qtyOf(row: Record<string, unknown>): number {
  const raw = row.qty ?? row.quantity ?? row.bottles ?? row.bottle_qty
  const n = numberOf(raw)
  return n != null && n > 0 ? n : 1
}

function mapAddonRow(row: Record<string, unknown>): BottleAddonLine {
  const unit = numberOf(row.unit_price ?? row.bottle_price ?? row.price)
  const amount = numberOf(row.amount ?? row.line_amount ?? row.subtotal)
  const qty = qtyOf(row)
  return {
    sellable_item_id: scalarText(row.sellable_item_id) || scalarText(row.id),
    sellable_item_name:
      scalarText(row.sellable_item_name)
      || scalarText(row.name)
      || scalarText(row.name_zh)
      || scalarText(row.sellable_item_code)
      || '',
    sellable_item_sku:
      scalarText(row.sellable_item_sku)
      || scalarText(row.sku)
      || scalarText(row.sellable_item_code)
      || '',
    qty,
    unit_price: unit,
    amount: amount ?? (unit != null ? unit * qty : null),
    raw: row
  }
}

/** Prefer order.bottle_addons snapshot; fall back to lines with kind=bottle_addon. */
export function bottleAddonsOf(order: Record<string, unknown> | null | undefined): BottleAddonLine[] {
  if (!order) {
    return []
  }
  const snapshot = recordsOf(order.bottle_addons)
  if (snapshot.length) {
    return snapshot.map(mapAddonRow)
  }
  return recordsOf(order.lines)
    .filter(row => row.kind === 'bottle_addon')
    .map(mapAddonRow)
}

export function orderHasBottleAddon(order: Record<string, unknown> | null | undefined): boolean {
  if (!order) {
    return false
  }
  if (order.has_bottle_addon === true) {
    return true
  }
  const flagged = numberOf(order.addon_amount ?? order.bottle_addon_amount)
  if (flagged != null && flagged > 0) {
    return true
  }
  return bottleAddonsOf(order).length > 0
}

export function bottleAddonAmountOf(order: Record<string, unknown> | null | undefined): number | null {
  if (!order) {
    return null
  }
  const explicit = numberOf(order.addon_amount ?? order.bottle_addon_amount)
  if (explicit != null) {
    return explicit
  }
  const lines = bottleAddonsOf(order)
  if (!lines.length) {
    return null
  }
  let sum = 0
  let any = false
  for (const line of lines) {
    if (line.amount != null) {
      sum += line.amount
      any = true
    }
  }
  return any ? sum : null
}

export function packageAmountOf(order: Record<string, unknown> | null | undefined): number | null {
  if (!order) {
    return null
  }
  const explicit = numberOf(order.package_amount ?? order.package_plan_amount)
  if (explicit != null) {
    return explicit
  }
  const pkg = isRecord(order.package) ? order.package : null
  const fromPkg = numberOf(pkg?.package_plan_price)
  if (fromPkg != null) {
    return fromPkg
  }
  const total = numberOf(order.amount_total)
  const addon = bottleAddonAmountOf(order)
  if (total != null && addon != null) {
    return total - addon
  }
  return total
}

/** SKU/qty rows for picking — whole bottles, separate from daily-dose components. */
export function bottleAddonPickItemsOf(
  order: Record<string, unknown> | null | undefined
): { sku: string, qty: number, name: string }[] {
  return bottleAddonsOf(order).flatMap((line) => {
    const sku = line.sellable_item_sku || line.sellable_item_name
    if (!sku) {
      return []
    }
    return [{ sku, qty: line.qty, name: line.sellable_item_name || sku }]
  })
}
