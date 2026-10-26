/** Demo case id `C-24076` → preferred list key `ORD-24076` (order number). */
export function orderNoFromCaseId(caseId: string): string {
  const match = /^C-(.+)$/i.exec(caseId.trim())
  if (!match?.[1]) {
    return caseId
  }
  return `ORD-${match[1]}`
}

export function shipmentUpdatedAt(events: { at: string }[], shippedAt: string | null): string {
  if (events.length) {
    return events[events.length - 1]!.at
  }
  return shippedAt ?? ''
}

export function itemsSummary(
  items: { sku: string, qty: number }[],
  labelOf: (sku: string) => string,
  moreLabel: (n: number) => string
): string {
  if (!items.length) {
    return '—'
  }
  const first = items[0]!
  const head = `${labelOf(first.sku)} ×${first.qty}`
  if (items.length === 1) {
    return head
  }
  return `${head} ${moreLabel(items.length)}`
}
