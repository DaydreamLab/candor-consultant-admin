/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NUTRIENT_KEY_CATALOG_KEYS } from './nutrient-key-catalog'

function knowledgeNutrients(localeFile: string): Record<string, string> {
  const json = JSON.parse(readFileSync(new URL(`../../i18n/locales/${localeFile}`, import.meta.url), 'utf8')) as {
    knowledge: { nutrients: Record<string, string> }
  }
  return json.knowledge.nutrients
}

describe('NUTRIENT_KEY_CATALOG_KEYS i18n coverage', () => {
  it('has zh-TW and en labels for every catalog key', () => {
    const zh = knowledgeNutrients('zh-TW.json')
    const en = knowledgeNutrients('en.json')
    for (const key of NUTRIENT_KEY_CATALOG_KEYS) {
      expect(zh[key]?.trim(), `zh-TW missing knowledge.nutrients.${key}`).toBeTruthy()
      expect(en[key]?.trim(), `en missing knowledge.nutrients.${key}`).toBeTruthy()
    }
  })
})
