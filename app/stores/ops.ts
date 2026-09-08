import { canManageUsers, canWrite, isPlatformRole } from '~/types/admin'
import type {
  AuditLogRow,
  CaseRow,
  InventoryRow,
  InvoiceRow,
  KeyInLine,
  LabRow,
  ProductRow,
  ProgressRow,
  ReviewRow,
  ReviewStatus,
  ShipmentRow,
  StaffRow
} from '~/types/admin'
import {
  DEMO_CASES,
  DEMO_INVENTORY,
  DEMO_INVOICES,
  DEMO_KEYIN,
  DEMO_LABS,
  DEMO_ORGS,
  DEMO_PRODUCTS,
  DEMO_PROGRESS,
  DEMO_REVIEWS,
  DEMO_SHIPMENTS,
  DEMO_STAFF,
  nowStamp,
  todayStamp
} from '~/utils/demo'
import { progressMissing } from '~/utils/progress'

function cloneList<T>(rows: T[]): T[] {
  return structuredClone(rows)
}

export const useOpsStore = defineStore('ops', () => {
  const session = useSessionStore()

  const cases = ref<CaseRow[]>(cloneList(DEMO_CASES))
  const labs = ref<LabRow[]>(cloneList(DEMO_LABS))
  const progress = ref<ProgressRow[]>(cloneList(DEMO_PROGRESS))
  const products = ref<ProductRow[]>(cloneList(DEMO_PRODUCTS))
  const inventory = ref<InventoryRow[]>(cloneList(DEMO_INVENTORY))
  const keyIn = ref<KeyInLine[]>(cloneList(DEMO_KEYIN))
  const shipments = ref<ShipmentRow[]>(cloneList(DEMO_SHIPMENTS))
  const invoices = ref<InvoiceRow[]>(cloneList(DEMO_INVOICES))
  const reviews = ref<ReviewRow[]>(cloneList(DEMO_REVIEWS))
  const staff = ref<StaffRow[]>(cloneList(DEMO_STAFF))
  const auditLog = ref<AuditLogRow[]>([])

  const orgs = DEMO_ORGS

  function writable() {
    return canWrite(session.role ?? 'platform_viewer')
  }

  function usersWritable() {
    return canManageUsers(session.role ?? 'platform_viewer')
  }

  function log(action: string, target: string) {
    const user = session.session
    if (!user || user.role !== 'platform_assist') {
      return
    }
    auditLog.value.unshift({
      id: `log-${Date.now()}`,
      at: nowStamp(),
      actor: user.name,
      action,
      target
    })
  }

  function defaultOrgId() {
    return session.session?.orgId ?? orgs[0]?.id ?? ''
  }

  function nextId(prefix: string, existing: string[]) {
    const nums = existing
      .map((id) => {
        const match = id.match(/(\d+)$/)
        return match ? Number(match[1]) : 0
      })
    return `${prefix}${Math.max(0, ...nums) + 1}`
  }

  function refreshProgress(row: ProgressRow) {
    Object.assign(row, progressMissing(row))
  }

  function progressFor(caseId: string) {
    return progress.value.find(row => row.caseId === caseId)
  }

  function upsertProgressFromCase(row: CaseRow) {
    const existing = progressFor(row.id)
    const needsLab = (row.planId === 'mid' || row.planId === 'premium') && !row.hasReport
    const premium = row.planId === 'premium'
    const next: ProgressRow = existing ?? {
      caseId: row.id,
      orgId: row.orgId,
      planId: row.planId,
      customer: row.customer,
      labScheduled: needsLab ? false : null,
      reportBack: needsLab ? false : null,
      consultDone: false,
      keyedIn: premium ? false : null,
      labeled: premium ? false : null,
      shipped: premium ? false : null,
      missing: '',
      missingEn: ''
    }
    next.orgId = row.orgId
    next.planId = row.planId
    next.customer = row.customer
    if (!needsLab) {
      next.labScheduled = null
      next.reportBack = null
    } else if (next.labScheduled === null) {
      next.labScheduled = false
      next.reportBack = false
    }
    if (!premium) {
      next.keyedIn = null
      next.labeled = null
      next.shipped = null
    } else if (next.keyedIn === null) {
      next.keyedIn = false
      next.labeled = false
      next.shipped = false
    }
    refreshProgress(next)
    if (!existing) {
      progress.value.unshift(next)
    }
  }

  function addCase(input: Omit<CaseRow, 'id' | 'aUserId'> & { id?: string, aUserId?: string }) {
    if (!writable()) {
      return null
    }
    const id = input.id ?? nextId('C-', cases.value.map(row => row.id))
    const row: CaseRow = {
      ...input,
      id,
      aUserId: input.aUserId ?? `mock-user-${id.slice(-3)}`
    }
    cases.value.unshift(row)
    upsertProgressFromCase(row)
    log('新增案件', id)
    return row
  }

  function updateCase(id: string, patch: Partial<CaseRow>) {
    if (!writable()) {
      return
    }
    const row = cases.value.find(item => item.id === id)
    if (!row) {
      return
    }
    Object.assign(row, patch)
    upsertProgressFromCase(row)
    log('更新案件', id)
  }

  function removeCase(id: string) {
    if (!writable()) {
      return
    }
    cases.value = cases.value.filter(row => row.id !== id)
    labs.value = labs.value.filter(row => row.caseId !== id)
    progress.value = progress.value.filter(row => row.caseId !== id)
    keyIn.value = keyIn.value.filter(row => row.caseId !== id)
    shipments.value = shipments.value.filter(row => row.caseId !== id)
    invoices.value = invoices.value.map(row => ({
      ...row,
      caseIds: row.caseIds.filter(caseId => caseId !== id)
    })).filter(row => row.caseIds.length > 0)
    reviews.value = reviews.value.filter(row => row.caseId !== id)
    log('刪除案件', id)
  }

  function upsertLab(input: Omit<LabRow, 'id'> & { id?: string }) {
    if (!writable()) {
      return null
    }
    const existing = input.id
      ? labs.value.find(row => row.id === input.id)
      : labs.value.find(row => row.caseId === input.caseId)
    if (existing) {
      Object.assign(existing, input, { id: existing.id })
      log('更新採檢', existing.caseId)
      return existing
    }
    const row: LabRow = {
      ...input,
      id: input.id ?? nextId('lab-', labs.value.map(item => item.id))
    }
    labs.value.unshift(row)
    log('新增採檢', row.caseId)
    return row
  }

  function removeLab(id: string) {
    if (!writable()) {
      return
    }
    const row = labs.value.find(item => item.id === id)
    labs.value = labs.value.filter(item => item.id !== id)
    if (row) {
      log('刪除採檢', row.caseId)
    }
  }

  function setProgressFlag(caseId: string, key: 'labScheduled' | 'reportBack' | 'consultDone' | 'keyedIn' | 'labeled' | 'shipped', value: boolean) {
    applyProgressFlags([{ caseId, patch: { [key]: value } }])
  }

  function applyProgressFlags(updates: Array<{
    caseId: string
    patch: Partial<Pick<ProgressRow, 'labScheduled' | 'reportBack' | 'consultDone' | 'keyedIn' | 'labeled' | 'shipped'>>
  }>) {
    if (!writable() || !updates.length) {
      return 0
    }
    let changed = 0
    const targets: string[] = []
    for (const update of updates) {
      const row = progressFor(update.caseId)
      if (!row) {
        continue
      }
      let dirty = false
      for (const [key, value] of Object.entries(update.patch) as Array<[keyof typeof update.patch, boolean | null | undefined]>) {
        if (value === undefined || row[key] === null || row[key] === value) {
          continue
        }
        row[key] = value as never
        dirty = true
      }
      if (dirty) {
        refreshProgress(row)
        changed += 1
        targets.push(update.caseId)
      }
    }
    if (changed) {
      log('更新進度', targets.join(', '))
    }
    return changed
  }

  function saveProduct(input: ProductRow & InventoryRow, previousSku?: string) {
    if (!writable()) {
      return null
    }
    const sku = previousSku ?? input.sku
    const product = products.value.find(row => row.sku === sku)
    const stock = inventory.value.find(row => row.sku === sku)
    const productFields: ProductRow = {
      sku: input.sku,
      orgId: input.orgId,
      name: input.name,
      nameEn: input.nameEn,
      aLabel: input.aLabel,
      aLabelEn: input.aLabelEn,
      spec: input.spec,
      cost: input.cost,
      priceToA: input.priceToA,
      labelVersion: input.labelVersion
    }
    const stockFields: InventoryRow = {
      sku: input.sku,
      orgId: input.orgId,
      onHand: input.onHand,
      reserved: input.reserved,
      reorderAt: input.reorderAt
    }
    if (product && stock) {
      if (previousSku && previousSku !== input.sku) {
        keyIn.value.forEach((line) => {
          if (line.sku === previousSku) {
            line.sku = input.sku
          }
        })
        shipments.value.forEach((row) => {
          row.items.forEach((item) => {
            if (item.sku === previousSku) {
              item.sku = input.sku
            }
          })
        })
      }
      Object.assign(product, productFields)
      Object.assign(stock, stockFields)
      log('更新商品庫存', input.sku)
      return product
    }
    if (products.value.some(row => row.sku === input.sku)) {
      return null
    }
    products.value.unshift(productFields)
    inventory.value.unshift(stockFields)
    log('新增商品庫存', input.sku)
    return productFields
  }

  function removeProduct(sku: string) {
    if (!writable()) {
      return false
    }
    const used = keyIn.value.some(row => row.sku === sku) || shipments.value.some(row => row.items.some(item => item.sku === sku))
    if (used) {
      return false
    }
    products.value = products.value.filter(row => row.sku !== sku)
    inventory.value = inventory.value.filter(row => row.sku !== sku)
    log('刪除商品庫存', sku)
    return true
  }

  function addKeyInLine(input: Omit<KeyInLine, 'id' | 'status' | 'confirmedAt'> & { status?: KeyInLine['status'], confirmedAt?: string | null }) {
    if (!writable()) {
      return null
    }
    const row: KeyInLine = {
      ...input,
      status: input.status ?? 'draft',
      confirmedAt: input.confirmedAt ?? null,
      id: nextId('ki-', keyIn.value.map(item => item.id))
    }
    keyIn.value.push(row)
    log('新增選品', `${row.caseId} ${row.sku}`)
    return row
  }

  function updateKeyInLine(id: string, patch: Partial<KeyInLine>) {
    if (!writable()) {
      return
    }
    const row = keyIn.value.find(item => item.id === id)
    if (!row) {
      return
    }
    Object.assign(row, patch)
    log('更新選品', `${row.caseId} ${row.sku}`)
  }

  function removeKeyInLine(id: string) {
    if (!writable()) {
      return
    }
    const row = keyIn.value.find(item => item.id === id)
    keyIn.value = keyIn.value.filter(item => item.id !== id)
    if (row) {
      log('刪除選品', `${row.caseId} ${row.sku}`)
    }
  }

  function confirmSelection(caseId: string) {
    if (!writable()) {
      return
    }
    const lines = keyIn.value.filter(row => row.caseId === caseId)
    if (!lines.length) {
      return
    }
    const at = nowStamp()
    lines.forEach((row) => {
      row.status = 'confirmed'
      row.confirmedAt = at
    })
    const flag = progressFor(caseId)
    if (flag && flag.keyedIn !== null) {
      flag.keyedIn = true
      refreshProgress(flag)
    }
    const row = cases.value.find(item => item.id === caseId)
    if (row && row.status === 'keyin_due') {
      row.status = 'ship_due'
    }
    log('確認選品', caseId)
  }

  function unconfirmSelection(caseId: string) {
    if (!writable()) {
      return false
    }
    const locked = shipments.value.some(row =>
      row.caseId === caseId && ['in_transit', 'delivered'].includes(row.status)
    )
    if (locked) {
      return false
    }
    const lines = keyIn.value.filter(row => row.caseId === caseId)
    if (!lines.length) {
      return false
    }
    lines.forEach((row) => {
      row.status = 'draft'
      row.confirmedAt = null
    })
    const flag = progressFor(caseId)
    if (flag && flag.keyedIn !== null) {
      flag.keyedIn = false
      refreshProgress(flag)
    }
    const row = cases.value.find(item => item.id === caseId)
    if (row && row.status === 'ship_due') {
      row.status = 'keyin_due'
    }
    log('退回選品', caseId)
    return true
  }

  function saveShipment(input: Omit<ShipmentRow, 'id' | 'items' | 'customer' | 'orgId' | 'events'> & { id?: string, items?: ShipmentRow['items'], events?: ShipmentRow['events'] }) {
    if (!writable()) {
      return null
    }
    const caseRow = cases.value.find(row => row.id === input.caseId)
    if (!caseRow) {
      return null
    }
    const items = input.items
      ?? keyIn.value.filter(row => row.caseId === input.caseId).map(row => ({ sku: row.sku, qty: row.qty }))
    const shippedAt = ['in_transit', 'delivered'].includes(input.status)
      ? (input.shippedAt ?? todayStamp())
      : null
    const existing = input.id ? shipments.value.find(row => row.id === input.id) : undefined
    const stamp = nowStamp()
    const events = existing
      ? [...(existing.events ?? [])]
      : [{ status: input.status, at: stamp }]
    if (existing && existing.status !== input.status) {
      events.push({ status: input.status, at: stamp })
    }
    const row: ShipmentRow = existing ?? {
      id: nextId('SH-', shipments.value.map(item => item.id)),
      caseId: input.caseId,
      orgId: caseRow.orgId,
      customer: caseRow.customer,
      status: input.status,
      tracking: input.tracking ?? null,
      shippedAt,
      items,
      events
    }
    if (existing) {
      Object.assign(existing, {
        status: input.status,
        tracking: input.tracking || null,
        shippedAt,
        items: existing.items,
        events
      })
    } else {
      shipments.value.unshift(row)
    }
    const saved = existing ?? row
    const flag = progressFor(saved.caseId)
    if (flag) {
      if (saved.status === 'labeling' || saved.status === 'in_transit' || saved.status === 'delivered') {
        if (flag.labeled !== null) {
          flag.labeled = true
        }
      }
      if (saved.status === 'delivered' && flag.shipped !== null) {
        flag.shipped = true
      }
      refreshProgress(flag)
    }
    if (saved.status === 'delivered') {
      const current = cases.value.find(item => item.id === saved.caseId)
      if (current && ['ship_due', 'shipped', 'keyin_due'].includes(current.status)) {
        current.status = 'invoice_due'
      }
    }
    log(existing ? '更新出貨' : '新增出貨', saved.id)
    return saved
  }

  function removeShipment(id: string) {
    if (!writable()) {
      return
    }
    shipments.value = shipments.value.filter(row => row.id !== id)
    log('刪除出貨', id)
  }

  function saveInvoice(input: Omit<InvoiceRow, 'id' | 'issuedAt'> & { id?: string, issuedAt?: string }) {
    if (!writable()) {
      return null
    }
    const existing = input.id ? invoices.value.find(row => row.id === input.id) : undefined
    const caseIds = input.caseIds.map(id => id.trim()).filter(Boolean)
    if (existing) {
      Object.assign(existing, {
        orgId: input.orgId,
        caseIds,
        serviceFee: input.serviceFee,
        goodsAmount: input.goodsAmount,
        status: input.status
      })
      if (input.status === 'sent' || input.status === 'paid') {
        caseIds.forEach((caseId) => {
          const row = cases.value.find(item => item.id === caseId)
          if (row && row.status === 'invoice_due') {
            row.status = 'invoiced'
          }
        })
      }
      log('更新請款', existing.id)
      return existing
    }
    const row: InvoiceRow = {
      id: nextId('INV-2026-', invoices.value.map(item => item.id)),
      orgId: input.orgId,
      caseIds,
      serviceFee: input.serviceFee,
      goodsAmount: input.goodsAmount,
      status: input.status,
      issuedAt: input.issuedAt ?? todayStamp()
    }
    invoices.value.unshift(row)
    if (row.status === 'sent' || row.status === 'paid') {
      caseIds.forEach((caseId) => {
        const current = cases.value.find(item => item.id === caseId)
        if (current && current.status === 'invoice_due') {
          current.status = 'invoiced'
        }
      })
    }
    log('新增請款', row.id)
    return row
  }

  function removeInvoice(id: string) {
    if (!writable()) {
      return
    }
    invoices.value = invoices.value.filter(row => row.id !== id)
    log('刪除請款', id)
  }

  function setReviewStatus(id: string, status: ReviewStatus) {
    if (!writable()) {
      return
    }
    const row = reviews.value.find(item => item.id === id)
    if (!row) {
      return
    }
    row.status = status
    row.updatedAt = todayStamp()
    log(status === 'approved' ? '簽核通過' : '簽核退回', row.caseId)
  }

  function saveStaff(input: Omit<StaffRow, 'id' | 'lastLogin'> & { id?: string, lastLogin?: string }) {
    if (!usersWritable()) {
      return null
    }
    const existing = input.id ? staff.value.find(row => row.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, {
        name: input.name,
        email: input.email,
        role: input.role,
        orgId: isPlatformRole(input.role) ? null : input.orgId,
        status: input.status
      })
      log('更新帳號', existing.email)
      return existing
    }
    const row: StaffRow = {
      id: input.id ?? nextId('user-', staff.value.map(item => item.id)),
      name: input.name,
      email: input.email,
      role: input.role,
      orgId: isPlatformRole(input.role) ? null : input.orgId,
      status: input.status,
      lastLogin: input.lastLogin ?? '—'
    }
    staff.value.unshift(row)
    log('新增帳號', row.email)
    return row
  }

  function removeStaff(id: string) {
    if (!usersWritable() || id === session.session?.id) {
      return false
    }
    staff.value = staff.value.filter(row => row.id !== id)
    log('刪除帳號', id)
    return true
  }

  function productOf(sku: string) {
    return products.value.find(row => row.sku === sku)
  }

  return {
    orgs,
    cases,
    labs,
    progress,
    products,
    inventory,
    keyIn,
    shipments,
    invoices,
    reviews,
    staff,
    auditLog,
    writable,
    usersWritable,
    defaultOrgId,
    addCase,
    updateCase,
    removeCase,
    upsertLab,
    removeLab,
    setProgressFlag,
    applyProgressFlags,
    saveProduct,
    removeProduct,
    addKeyInLine,
    updateKeyInLine,
    removeKeyInLine,
    confirmSelection,
    unconfirmSelection,
    saveShipment,
    removeShipment,
    saveInvoice,
    removeInvoice,
    setReviewStatus,
    saveStaff,
    removeStaff,
    productOf
  }
})
