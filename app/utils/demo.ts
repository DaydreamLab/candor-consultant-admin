import type {
  CaseRow,
  ConsultantOrg,
  InventoryRow,
  InvoiceRow,
  KeyInLine,
  LabelVersion,
  LabRow,
  ProductRow,
  ProgressRow,
  ReviewRow,
  SessionUser,
  ShipmentRow,
  StaffRow
} from '~/types/admin'

export const ORG_YOUNGER = 'org-younger'
export const ORG_DASHU = 'org-dashu'
export const ORG_LION = 'org-lion'

export const DEMO_ORGS: ConsultantOrg[] = [
  {
    id: ORG_YOUNGER,
    name: 'Younger',
    nameEn: 'Younger',
    city: '台北市',
    cityEn: 'Taipei',
    contact: 'lin@younger.local',
    warehouse: '台北內湖倉',
    warehouseEn: 'Taipei Neihu warehouse',
    status: 'active',
    since: '2026-03-01'
  },
  {
    id: ORG_DASHU,
    name: '大樹藥局',
    nameEn: 'Dashu Pharmacy',
    city: '台中市',
    cityEn: 'Taichung',
    contact: 'chen@dashu.local',
    warehouse: '台中西屯倉',
    warehouseEn: 'Taichung Xitun warehouse',
    status: 'active',
    since: '2026-05-12'
  },
  {
    id: ORG_LION,
    name: '幼獅藥局',
    nameEn: 'Young Lion Pharmacy',
    city: '高雄市',
    cityEn: 'Kaohsiung',
    contact: 'huang@lion.local',
    warehouse: '高雄左營倉',
    warehouseEn: 'Kaohsiung Zuoying warehouse',
    status: 'active',
    since: '2026-07-20'
  }
]

export const DEMO_STAFF: StaffRow[] = [
  { id: 'user-owner', name: '陳業主', email: 'owner@candor.local', role: 'platform_viewer', orgId: null, status: 'active', lastLogin: '2026-09-08 15:40' },
  { id: 'user-assist', name: '林協助', email: 'ops@candor.local', role: 'platform_assist', orgId: null, status: 'active', lastLogin: '2026-09-08 11:02' },
  { id: 'user-younger-admin', name: '林雅文', email: 'admin@younger.local', role: 'consultant_admin', orgId: ORG_YOUNGER, status: 'active', lastLogin: '2026-09-08 09:18' },
  { id: 'user-younger-ops', name: '周營運', email: 'ops@younger.local', role: 'consultant_ops', orgId: ORG_YOUNGER, status: 'active', lastLogin: '2026-09-08 08:55' },
  { id: 'user-younger-wh', name: '陳倉儲', email: 'wh@younger.local', role: 'consultant_ops', orgId: ORG_YOUNGER, status: 'invited', lastLogin: '—' },
  { id: 'user-dashu-admin', name: '陳藥師', email: 'admin@dashu.local', role: 'consultant_admin', orgId: ORG_DASHU, status: 'active', lastLogin: '2026-09-07 17:21' },
  { id: 'user-dashu-ops', name: '吳營運', email: 'ops@dashu.local', role: 'consultant_ops', orgId: ORG_DASHU, status: 'active', lastLogin: '2026-09-08 10:44' },
  { id: 'user-lion-admin', name: '黃店長', email: 'admin@lion.local', role: 'consultant_admin', orgId: ORG_LION, status: 'active', lastLogin: '2026-09-08 12:06' },
  { id: 'user-lion-ops', name: '張藥師', email: 'ops@lion.local', role: 'consultant_ops', orgId: ORG_LION, status: 'active', lastLogin: '2026-09-08 07:30' }
]

export const DEMO_CASES: CaseRow[] = [
  { id: 'C-24091', customer: '林雅婷', customerEn: 'Ya-Ting Lin', email: 'ya.ting@example.com', aUserId: 'mock-user-091', planId: 'premium', hasReport: true, orgId: ORG_YOUNGER, paidAt: '2026-09-01 14:22', appointmentAt: '2026-09-09 10:00', status: 'keyin_due' },
  { id: 'C-24088', customer: '陳冠宇', customerEn: 'Kuan-Yu Chen', email: 'kuanyu@example.com', aUserId: 'mock-user-088', planId: 'premium', hasReport: false, orgId: ORG_YOUNGER, paidAt: '2026-09-02 09:11', appointmentAt: '2026-09-12 14:30', status: 'awaiting_report' },
  { id: 'C-24085', customer: '王美玲', customerEn: 'Mei-Ling Wang', email: 'meiling@example.com', aUserId: 'mock-user-085', planId: 'basic', hasReport: true, orgId: ORG_YOUNGER, paidAt: '2026-08-28 16:40', appointmentAt: '2026-09-03 11:00', status: 'invoice_due' },
  { id: 'C-24082', customer: '周柏翰', customerEn: 'Po-Han Chou', email: 'pohan@example.com', aUserId: 'mock-user-082', planId: 'mid', hasReport: false, orgId: ORG_YOUNGER, paidAt: '2026-09-03 11:05', appointmentAt: '2026-09-15 09:30', status: 'lab_scheduled' },
  { id: 'C-24061', customer: '劉子安', customerEn: 'Tzu-An Liu', email: 'tzuan@example.com', aUserId: 'mock-user-061', planId: 'mid', hasReport: false, orgId: ORG_YOUNGER, paidAt: '2026-09-06 08:20', appointmentAt: '2026-09-18 13:00', status: 'lab_pending' },
  { id: 'C-24058', customer: '許家豪', customerEn: 'Chia-Hao Hsu', email: 'chiahao@example.com', aUserId: 'mock-user-058', planId: 'premium', hasReport: true, orgId: ORG_YOUNGER, paidAt: '2026-09-04 19:33', appointmentAt: '2026-09-10 09:00', status: 'progress_due' },
  { id: 'C-24055', customer: '鄭怡君', customerEn: 'Yi-Chun Cheng', email: 'yichun@example.com', aUserId: 'mock-user-055', planId: 'basic', hasReport: true, orgId: ORG_YOUNGER, paidAt: '2026-09-08 07:55', appointmentAt: '2026-09-17 11:30', status: 'received' },
  { id: 'C-24076', customer: '黃詩涵', customerEn: 'Shih-Han Huang', email: 'shihan@example.com', aUserId: 'mock-user-076', planId: 'premium', hasReport: true, orgId: ORG_DASHU, paidAt: '2026-08-26 10:18', appointmentAt: '2026-09-02 16:00', status: 'ship_due' },
  { id: 'C-24070', customer: '張書豪', customerEn: 'Shu-Hao Chang', email: 'shuhao@example.com', aUserId: 'mock-user-070', planId: 'premium', hasReport: true, orgId: ORG_DASHU, paidAt: '2026-08-20 13:02', appointmentAt: '2026-08-27 10:30', status: 'invoice_due' },
  { id: 'C-24068', customer: '吳佳穎', customerEn: 'Chia-Ying Wu', email: 'chiaying@example.com', aUserId: 'mock-user-068', planId: 'basic', hasReport: true, orgId: ORG_DASHU, paidAt: '2026-09-07 18:44', appointmentAt: '2026-09-16 15:00', status: 'received' },
  { id: 'C-24052', customer: '蔡明軒', customerEn: 'Ming-Hsuan Tsai', email: 'minghsuan@example.com', aUserId: 'mock-user-052', planId: 'mid', hasReport: false, orgId: ORG_DASHU, paidAt: '2026-09-01 12:10', appointmentAt: '2026-09-14 10:00', status: 'awaiting_report' },
  { id: 'C-24049', customer: '楊子萱', customerEn: 'Tzu-Hsuan Yang', email: 'tzuhsuan@example.com', aUserId: 'mock-user-049', planId: 'premium', hasReport: false, orgId: ORG_DASHU, paidAt: '2026-08-30 15:27', appointmentAt: '2026-09-08 14:00', status: 'keyin_due' },
  { id: 'C-24095', customer: '何欣怡', customerEn: 'Hsin-Yi Ho', email: 'hsinyi@example.com', aUserId: 'mock-user-095', planId: 'premium', hasReport: true, orgId: ORG_LION, paidAt: '2026-09-05 11:40', appointmentAt: '2026-09-11 10:30', status: 'progress_due' },
  { id: 'C-24093', customer: '簡大為', customerEn: 'Ta-Wei Chien', email: 'tawei@example.com', aUserId: 'mock-user-093', planId: 'mid', hasReport: false, orgId: ORG_LION, paidAt: '2026-09-06 16:12', appointmentAt: '2026-09-19 09:00', status: 'lab_pending' },
  { id: 'C-24090', customer: '蘇庭語', customerEn: 'Ting-Yu Su', email: 'tingyu@example.com', aUserId: 'mock-user-090', planId: 'basic', hasReport: true, orgId: ORG_LION, paidAt: '2026-08-29 13:08', appointmentAt: '2026-09-04 15:00', status: 'invoice_due' },
  { id: 'C-24087', customer: '高子傑', customerEn: 'Tzu-Chieh Kao', email: 'tzuchieh@example.com', aUserId: 'mock-user-087', planId: 'premium', hasReport: true, orgId: ORG_LION, paidAt: '2026-08-27 09:55', appointmentAt: '2026-09-03 14:00', status: 'ship_due' },
  { id: 'C-24080', customer: '羅心怡', customerEn: 'Hsin-Yi Lo', email: 'hsinyilo@example.com', aUserId: 'mock-user-080', planId: 'premium', hasReport: true, orgId: ORG_LION, paidAt: '2026-09-04 18:20', appointmentAt: '2026-09-13 11:00', status: 'keyin_due' }
]

export const DEMO_LABS: LabRow[] = [
  { id: 'lab-088', caseId: 'C-24088', orgId: ORG_YOUNGER, customer: '陳冠宇', site: '內湖採檢站', siteEn: 'Neihu lab', scheduledAt: '2026-09-05 08:30', status: 'awaiting_report' },
  { id: 'lab-082', caseId: 'C-24082', orgId: ORG_YOUNGER, customer: '周柏翰', site: '信義採檢站', siteEn: 'Xinyi lab', scheduledAt: '2026-09-11 09:00', status: 'scheduled' },
  { id: 'lab-061', caseId: 'C-24061', orgId: ORG_YOUNGER, customer: '劉子安', site: '待安排', siteEn: 'Unassigned', scheduledAt: null, status: 'unscheduled' },
  { id: 'lab-052', caseId: 'C-24052', orgId: ORG_DASHU, customer: '蔡明軒', site: '台中西屯站', siteEn: 'Xitun lab', scheduledAt: '2026-09-04 07:50', status: 'awaiting_report' },
  { id: 'lab-049', caseId: 'C-24049', orgId: ORG_DASHU, customer: '楊子萱', site: '台中西屯站', siteEn: 'Xitun lab', scheduledAt: '2026-09-02 08:10', status: 'report_ready' },
  { id: 'lab-093', caseId: 'C-24093', orgId: ORG_LION, customer: '簡大為', site: '待安排', siteEn: 'Unassigned', scheduledAt: null, status: 'unscheduled' }
]

export const DEMO_PROGRESS: ProgressRow[] = [
  { caseId: 'C-24091', orgId: ORG_YOUNGER, planId: 'premium', customer: '林雅婷', labScheduled: null, reportBack: null, consultDone: true, keyedIn: false, labeled: false, shipped: false, missing: '待選品', missingEn: 'Product selection still due' },
  { caseId: 'C-24088', orgId: ORG_YOUNGER, planId: 'premium', customer: '陳冠宇', labScheduled: true, reportBack: false, consultDone: false, keyedIn: false, labeled: false, shipped: false, missing: '等報告回來', missingEn: 'Waiting for lab report' },
  { caseId: 'C-24085', orgId: ORG_YOUNGER, planId: 'basic', customer: '王美玲', labScheduled: null, reportBack: null, consultDone: true, keyedIn: null, labeled: null, shipped: null, missing: '可向坦見請款', missingEn: 'Ready to invoice Candor' },
  { caseId: 'C-24082', orgId: ORG_YOUNGER, planId: 'mid', customer: '周柏翰', labScheduled: true, reportBack: false, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '採檢已約、等報告', missingEn: 'Lab booked, awaiting report' },
  { caseId: 'C-24061', orgId: ORG_YOUNGER, planId: 'mid', customer: '劉子安', labScheduled: false, reportBack: false, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '尚未安排採檢', missingEn: 'Lab not scheduled' },
  { caseId: 'C-24058', orgId: ORG_YOUNGER, planId: 'premium', customer: '許家豪', labScheduled: null, reportBack: null, consultDone: false, keyedIn: false, labeled: false, shipped: false, missing: '諮詢完成尚未勾選', missingEn: 'Consult done tick still open' },
  { caseId: 'C-24055', orgId: ORG_YOUNGER, planId: 'basic', customer: '鄭怡君', labScheduled: null, reportBack: null, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '新進案件', missingEn: 'Newly received' },
  { caseId: 'C-24076', orgId: ORG_DASHU, planId: 'premium', customer: '黃詩涵', labScheduled: null, reportBack: null, consultDone: true, keyedIn: true, labeled: true, shipped: false, missing: '待出貨', missingEn: 'Ready to ship' },
  { caseId: 'C-24070', orgId: ORG_DASHU, planId: 'premium', customer: '張書豪', labScheduled: null, reportBack: null, consultDone: true, keyedIn: true, labeled: true, shipped: true, missing: '已出貨、待請款', missingEn: 'Shipped, invoice due' },
  { caseId: 'C-24068', orgId: ORG_DASHU, planId: 'basic', customer: '吳佳穎', labScheduled: null, reportBack: null, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '待接案／勾諮詢完成', missingEn: 'New case, consult not ticked' },
  { caseId: 'C-24052', orgId: ORG_DASHU, planId: 'mid', customer: '蔡明軒', labScheduled: true, reportBack: false, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '等報告回來', missingEn: 'Waiting for lab report' },
  { caseId: 'C-24049', orgId: ORG_DASHU, planId: 'premium', customer: '楊子萱', labScheduled: true, reportBack: true, consultDone: true, keyedIn: false, labeled: false, shipped: false, missing: '待選品', missingEn: 'Product selection still due' },
  { caseId: 'C-24095', orgId: ORG_LION, planId: 'premium', customer: '何欣怡', labScheduled: null, reportBack: null, consultDone: false, keyedIn: false, labeled: false, shipped: false, missing: '諮詢完成尚未勾選', missingEn: 'Consult done tick still open' },
  { caseId: 'C-24093', orgId: ORG_LION, planId: 'mid', customer: '簡大為', labScheduled: false, reportBack: false, consultDone: false, keyedIn: null, labeled: null, shipped: null, missing: '尚未安排採檢', missingEn: 'Lab not scheduled' },
  { caseId: 'C-24090', orgId: ORG_LION, planId: 'basic', customer: '蘇庭語', labScheduled: null, reportBack: null, consultDone: true, keyedIn: null, labeled: null, shipped: null, missing: '可向坦見請款', missingEn: 'Ready to invoice Candor' },
  { caseId: 'C-24087', orgId: ORG_LION, planId: 'premium', customer: '高子傑', labScheduled: null, reportBack: null, consultDone: true, keyedIn: true, labeled: true, shipped: false, missing: '待出貨', missingEn: 'Ready to ship' },
  { caseId: 'C-24080', orgId: ORG_LION, planId: 'premium', customer: '羅心怡', labScheduled: null, reportBack: null, consultDone: true, keyedIn: false, labeled: false, shipped: false, missing: '待選品', missingEn: 'Product selection still due' }
]

export const DEMO_PRODUCTS: ProductRow[] = [
  { sku: 'YG-MAG-500', orgId: ORG_YOUNGER, name: '鎂複方膠囊', nameEn: 'Magnesium complex', aLabel: '坦見 鎂複方', aLabelEn: 'Candor Magnesium', spec: '500mg × 60', cost: 186, priceToA: 260, labelVersion: 'A-LBL-2026-08' },
  { sku: 'YG-OMG-1000', orgId: ORG_YOUNGER, name: '魚油軟膠囊', nameEn: 'Fish oil softgel', aLabel: '坦見 Omega-3', aLabelEn: 'Candor Omega-3', spec: '1000mg × 90', cost: 320, priceToA: 450, labelVersion: 'A-LBL-2026-08' },
  { sku: 'YG-VTD-2000', orgId: ORG_YOUNGER, name: '維生素 D3', nameEn: 'Vitamin D3', aLabel: '坦見 維生素 D', aLabelEn: 'Candor Vitamin D', spec: '2000IU × 60', cost: 95, priceToA: 140, labelVersion: 'A-LBL-2026-08' },
  { sku: 'YG-PRB-30', orgId: ORG_YOUNGER, name: '益生菌粉包', nameEn: 'Probiotic sachets', aLabel: '坦見 益生菌', aLabelEn: 'Candor Probiotic', spec: '30 包', cost: 210, priceToA: 295, labelVersion: 'A-LBL-2026-08' },
  { sku: 'YG-ZNC-15', orgId: ORG_YOUNGER, name: '鋅錠', nameEn: 'Zinc tablets', aLabel: '坦見 鋅', aLabelEn: 'Candor Zinc', spec: '15mg × 60', cost: 72, priceToA: 110, labelVersion: 'A-LBL-2026-03' },
  { sku: 'YG-IRM-25', orgId: ORG_YOUNGER, name: '鐵劑', nameEn: 'Iron supplement', aLabel: '坦見 鐵', aLabelEn: 'Candor Iron', spec: '25mg × 30', cost: 128, priceToA: 180, labelVersion: 'A-LBL-2026-08' },
  { sku: 'DS-MAG-400', orgId: ORG_DASHU, name: '甘胺酸鎂', nameEn: 'Magnesium glycinate', aLabel: '坦見 鎂複方', aLabelEn: 'Candor Magnesium', spec: '400mg × 60', cost: 198, priceToA: 275, labelVersion: 'A-LBL-2026-08' },
  { sku: 'DS-OMG-800', orgId: ORG_DASHU, name: 'rTG 魚油', nameEn: 'rTG fish oil', aLabel: '坦見 Omega-3', aLabelEn: 'Candor Omega-3', spec: '800mg × 60', cost: 360, priceToA: 510, labelVersion: 'A-LBL-2026-08' },
  { sku: 'DS-VTD-1000', orgId: ORG_DASHU, name: '維生素 D3 滴劑', nameEn: 'Vitamin D3 drops', aLabel: '坦見 維生素 D', aLabelEn: 'Candor Vitamin D', spec: '10ml', cost: 140, priceToA: 198, labelVersion: 'A-LBL-2026-08' },
  { sku: 'DS-PRB-20', orgId: ORG_DASHU, name: '孢子型益生菌', nameEn: 'Spore probiotic', aLabel: '坦見 益生菌', aLabelEn: 'Candor Probiotic', spec: '20 粒', cost: 240, priceToA: 330, labelVersion: 'A-LBL-2026-08' },
  { sku: 'DS-COL-5', orgId: ORG_DASHU, name: '膠原蛋白肽', nameEn: 'Collagen peptides', aLabel: '坦見 膠原', aLabelEn: 'Candor Collagen', spec: '5g × 30', cost: 275, priceToA: 380, labelVersion: 'A-LBL-2026-08' },
  { sku: 'LN-MAG-500', orgId: ORG_LION, name: '鎂複方錠', nameEn: 'Magnesium tablets', aLabel: '坦見 鎂複方', aLabelEn: 'Candor Magnesium', spec: '500mg × 60', cost: 175, priceToA: 248, labelVersion: 'A-LBL-2026-08' },
  { sku: 'LN-OMG-900', orgId: ORG_LION, name: '魚油膠囊', nameEn: 'Fish oil capsules', aLabel: '坦見 Omega-3', aLabelEn: 'Candor Omega-3', spec: '900mg × 60', cost: 305, priceToA: 430, labelVersion: 'A-LBL-2026-08' },
  { sku: 'LN-VTD-2000', orgId: ORG_LION, name: '維生素 D3', nameEn: 'Vitamin D3', aLabel: '坦見 維生素 D', aLabelEn: 'Candor Vitamin D', spec: '2000IU × 60', cost: 88, priceToA: 132, labelVersion: 'A-LBL-2026-08' },
  { sku: 'LN-PRB-30', orgId: ORG_LION, name: '益生菌粉', nameEn: 'Probiotic powder', aLabel: '坦見 益生菌', aLabelEn: 'Candor Probiotic', spec: '30 包', cost: 198, priceToA: 280, labelVersion: 'A-LBL-2026-08' },
  { sku: 'LN-ZNC-15', orgId: ORG_LION, name: '鋅錠', nameEn: 'Zinc tablets', aLabel: '坦見 鋅', aLabelEn: 'Candor Zinc', spec: '15mg × 60', cost: 68, priceToA: 105, labelVersion: 'A-LBL-2026-03' }
]

export const DEMO_INVENTORY: InventoryRow[] = [
  { sku: 'YG-MAG-500', orgId: ORG_YOUNGER, onHand: 86, reserved: 4, reorderAt: 20 },
  { sku: 'YG-OMG-1000', orgId: ORG_YOUNGER, onHand: 42, reserved: 2, reorderAt: 24 },
  { sku: 'YG-VTD-2000', orgId: ORG_YOUNGER, onHand: 120, reserved: 0, reorderAt: 30 },
  { sku: 'YG-PRB-30', orgId: ORG_YOUNGER, onHand: 18, reserved: 6, reorderAt: 16 },
  { sku: 'YG-ZNC-15', orgId: ORG_YOUNGER, onHand: 8, reserved: 0, reorderAt: 12 },
  { sku: 'YG-IRM-25', orgId: ORG_YOUNGER, onHand: 33, reserved: 0, reorderAt: 10 },
  { sku: 'DS-MAG-400', orgId: ORG_DASHU, onHand: 54, reserved: 8, reorderAt: 20 },
  { sku: 'DS-OMG-800', orgId: ORG_DASHU, onHand: 21, reserved: 6, reorderAt: 18 },
  { sku: 'DS-VTD-1000', orgId: ORG_DASHU, onHand: 40, reserved: 0, reorderAt: 12 },
  { sku: 'DS-PRB-20', orgId: ORG_DASHU, onHand: 11, reserved: 4, reorderAt: 15 },
  { sku: 'DS-COL-5', orgId: ORG_DASHU, onHand: 27, reserved: 2, reorderAt: 10 },
  { sku: 'LN-MAG-500', orgId: ORG_LION, onHand: 64, reserved: 3, reorderAt: 16 },
  { sku: 'LN-OMG-900', orgId: ORG_LION, onHand: 28, reserved: 2, reorderAt: 12 },
  { sku: 'LN-VTD-2000', orgId: ORG_LION, onHand: 90, reserved: 0, reorderAt: 20 },
  { sku: 'LN-PRB-30', orgId: ORG_LION, onHand: 14, reserved: 5, reorderAt: 12 },
  { sku: 'LN-ZNC-15', orgId: ORG_LION, onHand: 6, reserved: 0, reorderAt: 10 }
]

export const DEMO_KEYIN: KeyInLine[] = [
  { id: 'ki-091-1', caseId: 'C-24091', orgId: ORG_YOUNGER, sku: 'YG-MAG-500', qty: 2, status: 'draft' },
  { id: 'ki-091-2', caseId: 'C-24091', orgId: ORG_YOUNGER, sku: 'YG-VTD-2000', qty: 1, status: 'draft' },
  { id: 'ki-076-1', caseId: 'C-24076', orgId: ORG_DASHU, sku: 'DS-OMG-800', qty: 2, status: 'confirmed' },
  { id: 'ki-076-2', caseId: 'C-24076', orgId: ORG_DASHU, sku: 'DS-MAG-400', qty: 1, status: 'confirmed' },
  { id: 'ki-076-3', caseId: 'C-24076', orgId: ORG_DASHU, sku: 'DS-PRB-20', qty: 1, status: 'confirmed' },
  { id: 'ki-070-1', caseId: 'C-24070', orgId: ORG_DASHU, sku: 'DS-COL-5', qty: 2, status: 'confirmed' },
  { id: 'ki-070-2', caseId: 'C-24070', orgId: ORG_DASHU, sku: 'DS-VTD-1000', qty: 1, status: 'confirmed' },
  { id: 'ki-049-1', caseId: 'C-24049', orgId: ORG_DASHU, sku: 'DS-MAG-400', qty: 1, status: 'draft' },
  { id: 'ki-087-1', caseId: 'C-24087', orgId: ORG_LION, sku: 'LN-OMG-900', qty: 2, status: 'confirmed' },
  { id: 'ki-087-2', caseId: 'C-24087', orgId: ORG_LION, sku: 'LN-MAG-500', qty: 1, status: 'confirmed' },
  { id: 'ki-080-1', caseId: 'C-24080', orgId: ORG_LION, sku: 'LN-PRB-30', qty: 2, status: 'draft' }
]

export const DEMO_SHIPMENTS: ShipmentRow[] = [
  {
    id: 'SH-24076',
    caseId: 'C-24076',
    orgId: ORG_DASHU,
    customer: '黃詩涵',
    status: 'labeling',
    tracking: null,
    shippedAt: null,
    items: [
      { sku: 'DS-OMG-800', qty: 2 },
      { sku: 'DS-MAG-400', qty: 1 },
      { sku: 'DS-PRB-20', qty: 1 }
    ]
  },
  {
    id: 'SH-24070',
    caseId: 'C-24070',
    orgId: ORG_DASHU,
    customer: '張書豪',
    status: 'delivered',
    tracking: 'SF123998442TW',
    shippedAt: '2026-09-01',
    items: [
      { sku: 'DS-COL-5', qty: 2 },
      { sku: 'DS-VTD-1000', qty: 1 }
    ]
  },
  {
    id: 'SH-24091',
    caseId: 'C-24091',
    orgId: ORG_YOUNGER,
    customer: '林雅婷',
    status: 'picking',
    tracking: null,
    shippedAt: null,
    items: [
      { sku: 'YG-MAG-500', qty: 2 },
      { sku: 'YG-VTD-2000', qty: 1 }
    ]
  },
  {
    id: 'SH-24087',
    caseId: 'C-24087',
    orgId: ORG_LION,
    customer: '高子傑',
    status: 'labeling',
    tracking: null,
    shippedAt: null,
    items: [
      { sku: 'LN-OMG-900', qty: 2 },
      { sku: 'LN-MAG-500', qty: 1 }
    ]
  }
]

export const DEMO_INVOICES: InvoiceRow[] = [
  { id: 'INV-2026-014', orgId: ORG_YOUNGER, caseIds: ['C-24085'], serviceFee: 1800, goodsAmount: 0, status: 'sent', issuedAt: '2026-09-06' },
  { id: 'INV-2026-011', orgId: ORG_DASHU, caseIds: ['C-24070'], serviceFee: 3200, goodsAmount: 958, status: 'sent', issuedAt: '2026-09-03' },
  { id: 'INV-2026-008', orgId: ORG_YOUNGER, caseIds: ['C-24040', 'C-24033'], serviceFee: 3600, goodsAmount: 0, status: 'paid', issuedAt: '2026-08-18' },
  { id: 'INV-2026-016', orgId: ORG_DASHU, caseIds: ['C-24076'], serviceFee: 3200, goodsAmount: 1570, status: 'draft', issuedAt: '2026-09-08' },
  { id: 'INV-2026-018', orgId: ORG_LION, caseIds: ['C-24090'], serviceFee: 1800, goodsAmount: 0, status: 'sent', issuedAt: '2026-09-07' }
]

export const DEMO_REVIEWS: ReviewRow[] = [
  { id: 'rv-1', caseId: 'C-24091', orgId: ORG_YOUNGER, orgName: 'Younger', kind: 'manual', status: 'pending', updatedAt: '2026-09-08' },
  { id: 'rv-2', caseId: 'C-24088', orgId: ORG_YOUNGER, orgName: 'Younger', kind: 'clinical', status: 'pending', updatedAt: '2026-09-07' },
  { id: 'rv-3', caseId: 'C-24076', orgId: ORG_DASHU, orgName: '大樹藥局', kind: 'manual', status: 'approved', updatedAt: '2026-09-06' },
  { id: 'rv-4', caseId: 'C-24070', orgId: ORG_DASHU, orgName: '大樹藥局', kind: 'clinical', status: 'rejected', updatedAt: '2026-09-05' },
  { id: 'rv-5', caseId: 'C-24058', orgId: ORG_YOUNGER, orgName: 'Younger', kind: 'manual', status: 'approved', updatedAt: '2026-09-08' },
  { id: 'rv-6', caseId: 'C-24049', orgId: ORG_DASHU, orgName: '大樹藥局', kind: 'clinical', status: 'pending', updatedAt: '2026-09-08' },
  { id: 'rv-7', caseId: 'C-24095', orgId: ORG_LION, orgName: '幼獅藥局', kind: 'manual', status: 'pending', updatedAt: '2026-09-08' },
  { id: 'rv-8', caseId: 'C-24087', orgId: ORG_LION, orgName: '幼獅藥局', kind: 'clinical', status: 'approved', updatedAt: '2026-09-06' }
]

export const DEMO_LABELS: LabelVersion[] = [
  { id: 'A-LBL-2026-08', name: '坦見保健 秋冬版', nameEn: 'Candor autumn/winter', effective: '2026-08-01', current: true },
  { id: 'A-LBL-2026-03', name: '坦見保健 春夏版', nameEn: 'Candor spring/summer', effective: '2026-03-01', current: false }
]

export function productBySku(sku: string, products: ProductRow[] = DEMO_PRODUCTS) {
  return products.find(item => item.sku === sku)
}

export function workbenchCounts(
  cases: CaseRow[],
  inventory: InventoryRow[],
  reviews: ReviewRow[]
) {
  return {
    pendingCases: cases.filter(row => row.status === 'received').length,
    pendingLabs: cases.filter(row => ['lab_pending', 'lab_scheduled', 'awaiting_report'].includes(row.status)).length,
    pendingProgress: cases.filter(row => row.status === 'progress_due').length,
    pendingSelection: cases.filter(row => row.status === 'keyin_due').length,
    pendingShip: cases.filter(row => row.status === 'ship_due').length,
    lowStock: inventory.filter(row => row.onHand - row.reserved <= row.reorderAt).length,
    pendingInvoice: cases.filter(row => row.status === 'invoice_due').length,
    pendingReview: reviews.filter(row => row.status === 'pending').length
  }
}

export function staffToSession(staff: StaffRow, locale: 'zh-TW' | 'en' | string = 'zh-TW'): SessionUser {
  const org = DEMO_ORGS.find(item => item.id === staff.orgId)
  const brand = locale === 'en' ? 'Candor' : '坦見'
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    orgId: staff.orgId,
    orgName: org
      ? (locale === 'en' ? org.nameEn : org.name)
      : brand
  }
}

export function serviceFeeForPlan(planId: CaseRow['planId']) {
  if (planId === 'premium') {
    return 3200
  }
  if (planId === 'mid') {
    return 2400
  }
  return 1800
}

export function nowStamp() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function todayStamp() {
  return nowStamp().slice(0, 10)
}
