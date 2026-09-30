/** Stand-in catalog rows for layout work while the test API is offline. */
export const DEMO_SELLABLE_ITEMS: Record<string, unknown>[] = [
  {
    id: 'si-mag-500',
    sku: 'YG-MAG-500',
    name: '鎂複方膠囊',
    name_zh: '鎂複方膠囊',
    name_en: 'Magnesium complex',
    category: { name_zh: '礦物質', name_en: 'Minerals' },
    audience: { name_zh: '成人日常補充', name_en: 'Daily adult use' },
    servings_per_container: 60,
    spec_text: '500mg',
    spec: '500mg',
    sale_status: 'on_sale'
  },
  {
    id: 'si-omg-1000',
    sku: 'YG-OMG-1000',
    name: '魚油軟膠囊',
    name_zh: '魚油軟膠囊',
    name_en: 'Fish oil softgel',
    category: { name_zh: '油脂', name_en: 'Oils' },
    audience: {
      name_zh: '適合飲食中油脂不足的成人，孕婦與抗凝血用藥者使用前請先諮詢醫師',
      name_en: 'For adults with low dietary fat intake. Ask a clinician before use in pregnancy or with anticoagulants.'
    },
    servings_per_container: 90,
    spec_text: '1000mg × 90',
    spec: '1000mg × 90',
    sale_status: 'on_sale'
  },
  {
    id: 'si-vtd-2000',
    sku: 'YG-VTD-2000',
    name: '維生素 D3',
    name_zh: '維生素 D3',
    name_en: 'Vitamin D3',
    category: { name_zh: '維生素', name_en: 'Vitamins' },
    audience: { name_zh: '日照不足者', name_en: 'Low sun exposure' },
    servings_per_container: 60,
    spec_text: '2000IU × 60',
    spec: '2000IU × 60',
    sale_status: 'on_sale'
  },
  {
    id: 'si-prb-30',
    sku: 'YG-PRB-30',
    name: '益生菌粉包',
    name_zh: '益生菌粉包',
    name_en: 'Probiotic sachets',
    category: { name_zh: '益生菌', name_en: 'Probiotics' },
    audience: { name_zh: '腸道保養', name_en: 'Digestive support' },
    servings_per_container: 30,
    spec_text: '30 包',
    spec: '30 包',
    sale_status: 'on_sale'
  },
  {
    id: 'si-znc-15',
    sku: 'YG-ZNC-15',
    name: '鋅錠',
    name_zh: '鋅錠',
    name_en: 'Zinc tablets',
    category: { name_zh: '礦物質', name_en: 'Minerals' },
    audience: { name_zh: '免疫日常', name_en: 'Everyday immune support' },
    servings_per_container: 60,
    spec_text: '15mg × 60',
    spec: '15mg × 60',
    sale_status: 'off_sale'
  },
  {
    id: 'si-col-5',
    sku: 'DS-COL-5',
    name: '小分子膠原蛋白胜肽粉（含玻尿酸與維生素 C）',
    name_zh: '小分子膠原蛋白胜肽粉（含玻尿酸與維生素 C）',
    name_en: 'Collagen peptides with hyaluronic acid and vitamin C',
    category: { name_zh: '膠原', name_en: 'Collagen' },
    audience: { name_zh: '肌膚與關節保養', name_en: 'Skin and joint support' },
    servings_per_container: 30,
    spec_text: '5g × 30',
    spec: '5g × 30',
    sale_status: 'on_sale'
  },
  {
    id: 'si-irm-25',
    sku: 'YG-IRM-25',
    name: '鐵劑',
    name_zh: '鐵劑',
    name_en: 'Iron supplement',
    category: { name_zh: '礦物質', name_en: 'Minerals' },
    servings_per_container: 30,
    spec_text: '25mg × 30',
    spec: '25mg × 30',
    sale_status: 'on_sale'
  },
  {
    id: 'si-mag-400',
    sku: 'DS-MAG-400',
    name: '甘胺酸鎂',
    name_zh: '甘胺酸鎂',
    name_en: 'Magnesium glycinate',
    category: { name_zh: '礦物質', name_en: 'Minerals' },
    audience: { name_zh: '睡前放鬆', name_en: 'Evening relaxation' },
    servings_per_container: 60,
    spec_text: '400mg',
    spec: '400mg',
    sale_status: 'on_sale'
  },
  {
    id: 'si-omg-800',
    sku: 'DS-OMG-800',
    name: '高單位 rTG 型魚油軟膠囊',
    name_zh: '高單位 rTG 型魚油軟膠囊',
    name_en: 'High-strength rTG fish oil softgels',
    category: { name_zh: '油脂', name_en: 'Oils' },
    audience: { name_zh: '心血管日常', name_en: 'Everyday cardiovascular support' },
    servings_per_container: 60,
    spec_text: '800mg × 60',
    spec: '800mg × 60',
    sale_status: 'on_sale'
  },
  {
    id: 'si-vtd-drops',
    sku: 'DS-VTD-1000',
    name: '維生素 D3 滴劑',
    name_zh: '維生素 D3 滴劑',
    name_en: 'Vitamin D3 drops',
    category: { name_zh: '維生素', name_en: 'Vitamins' },
    audience: { name_zh: '不方便吞膠囊者', name_en: 'For people who prefer not to swallow capsules' },
    spec_text: '10ml',
    spec: '10ml',
    sale_status: 'on_sale'
  },
  {
    id: 'si-prb-20',
    sku: 'DS-PRB-20',
    name: '孢子型益生菌',
    name_zh: '孢子型益生菌',
    name_en: 'Spore probiotic',
    category: { name_zh: '益生菌', name_en: 'Probiotics' },
    audience: { name_zh: '旅行與外食', name_en: 'Travel and eating out' },
    servings_per_container: 20,
    spec_text: '20 粒',
    spec: '20 粒',
    sale_status: 'on_sale'
  },
  {
    id: 'si-antiox',
    sku: 'LN-AOX-60',
    name: '綜合抗氧化配方',
    name_zh: '綜合抗氧化配方',
    name_en: 'Antioxidant blend',
    audience: { name_zh: '一般成人', name_en: 'General adult use' },
    servings_per_container: 60,
    spec_text: '60 粒',
    spec: '60 粒',
    sale_status: 'on_sale'
  }
]

export function demoSellableItemById(id: string) {
  const row = DEMO_SELLABLE_ITEMS.find(item => String(item.id) === id)
  if (!row) {
    return null
  }
  return { ...row }
}
