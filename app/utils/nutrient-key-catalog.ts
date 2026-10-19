/**
 * Canonical nutrient_key values for admin i18n (knowledge.nutrients.*).
 *
 * Source of truth: candor-core `NutrientKeyCatalog` (see docs/ops/38-nutrient-key-minimal-design.md).
 * This repo cannot read the private core repo at build time; sync this list when core catalog changes.
 *
 * Last manual sync note: 2026-10-19 — added vitamin_b1/b2, vitamin_d2/d3, vitamin_k1/k2 per core catalog expansion.
 */
export const NUTRIENT_KEY_CATALOG_SOURCE = {
  repository: 'DaydreamLab/candor-core',
  catalog: 'NutrientKeyCatalog',
  docs: 'docs/ops/38-nutrient-key-minimal-design.md',
  syncedAt: '2026-10-19'
} as const

/** Sorted for stable diffs; must match every key exposed by core NutrientKeyCatalog. */
export const NUTRIENT_KEY_CATALOG_KEYS: readonly string[] = [
  'biotin',
  'calcium',
  'choline',
  'chromium',
  'copper',
  'folate',
  'iodine',
  'iron',
  'magnesium',
  'manganese',
  'molybdenum',
  'niacin',
  'pantothenic_acid',
  'phosphorus',
  'potassium',
  'riboflavin',
  'selenium',
  'sodium',
  'thiamin',
  'vitamin_b1',
  'vitamin_b2',
  'vitamin_b6',
  'vitamin_b12',
  'vitamin_c',
  'vitamin_d',
  'vitamin_d2',
  'vitamin_d3',
  'vitamin_e',
  'vitamin_k',
  'vitamin_k1',
  'vitamin_k2',
  'zinc'
] as const
