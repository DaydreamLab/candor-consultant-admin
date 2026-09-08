import type { ProgressRow } from '~/types/admin'

export function progressMissing(row: Pick<ProgressRow, 'labScheduled' | 'reportBack' | 'consultDone' | 'keyedIn' | 'labeled' | 'shipped'>): Pick<ProgressRow, 'missing' | 'missingEn'> {
  if (row.labScheduled === false) {
    return { missing: '尚未安排採檢', missingEn: 'Lab not scheduled' }
  }
  if (row.reportBack === false) {
    return { missing: '等報告回來', missingEn: 'Waiting for lab report' }
  }
  if (!row.consultDone) {
    return { missing: '諮詢完成尚未勾選', missingEn: 'Consult done tick still open' }
  }
  if (row.keyedIn === false) {
    return { missing: '待選品', missingEn: 'Product selection still due' }
  }
  if (row.labeled === false) {
    return { missing: '待貼標', missingEn: 'Label still due' }
  }
  if (row.shipped === false) {
    return { missing: '待出貨', missingEn: 'Ready to ship' }
  }
  return { missing: '可向坦見請款', missingEn: 'Ready to invoice Candor' }
}
