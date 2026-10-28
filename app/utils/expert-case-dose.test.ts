import { describe, expect, it } from 'vitest'
import {
  bumpCapsuleDose,
  canDecrementCapsuleDose,
  ceilCapsuleDose,
  defaultCapsuleDoseForItem,
  dosePanelMode,
  formatCapsuleDoseDisplay,
  hasFinalizeCopyContent,
  isCapsuleDoseEditable,
  isCapsuleDoseHidden,
  itemSpecText,
  normalizeExpertLineDecision,
  productNameWithoutGluedDose,
  resolveLineDecision,
  shouldShowSubmitFinalize,
  validateCapsuleDose
} from './expert-case-dose'

describe('expert-case-dose', () => {
  it('ceils legacy decimals for display (1.2 → 2)', () => {
    expect(ceilCapsuleDose(1.2)).toBe(2)
    expect(ceilCapsuleDose('1.2')).toBe(2)
    expect(ceilCapsuleDose(0.4)).toBe(1)
    expect(ceilCapsuleDose(2)).toBe(2)
    expect(ceilCapsuleDose(0)).toBeNull()
    expect(ceilCapsuleDose(null)).toBeNull()
    expect(formatCapsuleDoseDisplay(1.2)).toBe('2')
  })

  it('rejects non-integer / 0 / blank capsule doses', () => {
    expect(validateCapsuleDose('')).toMatchObject({ ok: false, code: 'required' })
    expect(validateCapsuleDose(null)).toMatchObject({ ok: false, code: 'required' })
    expect(validateCapsuleDose('0')).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateCapsuleDose(0)).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateCapsuleDose('1.2')).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateCapsuleDose(1.5)).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateCapsuleDose('-1')).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateCapsuleDose('1')).toEqual({ ok: true, dose: 1 })
    expect(validateCapsuleDose(3)).toEqual({ ok: true, dose: 3 })
  })

  it('defaults capsule dose with ceil ≥1', () => {
    expect(defaultCapsuleDoseForItem({
      daily_dose: 1.2,
      daily_servings_min: 0.5
    })).toBe('2')
    expect(defaultCapsuleDoseForItem({
      daily_dose: null,
      daily_servings_min: 0.5
    })).toBe('1')
    expect(defaultCapsuleDoseForItem(null)).toBe('1')
  })

  it('gates empty finalize copy', () => {
    expect(hasFinalizeCopyContent('', '')).toBe(false)
    expect(hasFinalizeCopyContent('  ', '\n')).toBe(false)
    expect(hasFinalizeCopyContent('重點', '')).toBe(true)
    expect(hasFinalizeCopyContent('', '意見')).toBe(true)
  })

  it('reads spec text and strips glued strength from product names', () => {
    expect(itemSpecText({ spec_text: '2000 IU' })).toBe('2000 IU')
    expect(itemSpecText({ name: 'x' }, { spec_text: '200 mg' })).toBe('200 mg')
    expect(productNameWithoutGluedDose('維生素 D3 2000IU')).toBe('維生素 D3')
    expect(productNameWithoutGluedDose('鎂甘胺酸 200mg')).toBe('鎂甘胺酸')
    expect(productNameWithoutGluedDose('魚油')).toBe('魚油')
  })

  it('stepper bump stays ≥1 and disables decrement at 1', () => {
    expect(bumpCapsuleDose('1', 1)).toBe('2')
    expect(bumpCapsuleDose('2', -1)).toBe('1')
    expect(bumpCapsuleDose('1', -1)).toBe('1')
    expect(canDecrementCapsuleDose('1')).toBe(false)
    expect(canDecrementCapsuleDose('2')).toBe(true)
    expect(canDecrementCapsuleDose('0')).toBe(false)
  })

  it('keep is not editable; remove hides dose; finalized hides submit', () => {
    expect(isCapsuleDoseEditable('approve')).toBe(false)
    expect(isCapsuleDoseEditable('')).toBe(false)
    expect(isCapsuleDoseEditable('adjust')).toBe(true)
    expect(isCapsuleDoseHidden('reject')).toBe(true)
    expect(isCapsuleDoseHidden('adjust')).toBe(false)
    expect(shouldShowSubmitFinalize('awaiting_review')).toBe(true)
    expect(shouldShowSubmitFinalize('reviewed')).toBe(false)
  })

  it('normalizes decision aliases and prefers local optimistic decision', () => {
    expect(normalizeExpertLineDecision('adjust')).toBe('adjust')
    expect(normalizeExpertLineDecision('adjust_dose')).toBe('adjust')
    expect(normalizeExpertLineDecision('調劑量')).toBe('adjust')
    expect(normalizeExpertLineDecision('保留')).toBe('approve')
    expect(normalizeExpertLineDecision('移除')).toBe('reject')
    expect(normalizeExpertLineDecision('mystery')).toBe('')

    expect(resolveLineDecision('adjust', 'approve')).toBe('adjust')
    expect(resolveLineDecision('', 'reject')).toBe('reject')
    expect(resolveLineDecision(undefined, 'adjust_dose')).toBe('adjust')
    expect(resolveLineDecision(undefined, undefined)).toBe('')

    expect(dosePanelMode('adjust')).toBe('editable')
    expect(dosePanelMode('approve')).toBe('readonly')
    expect(dosePanelMode('reject')).toBe('hidden')
    expect(dosePanelMode('')).toBe('readonly')
  })
})
