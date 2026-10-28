import { describe, expect, it } from 'vitest'
import { readLlmUsage } from '~/utils/admin-api'

describe('readLlmUsage', () => {
  it('returns null for missing usage', () => {
    expect(readLlmUsage(null)).toBeNull()
    expect(readLlmUsage(undefined)).toBeNull()
    expect(readLlmUsage('x')).toBeNull()
    expect(readLlmUsage([])).toBeNull()
  })

  it('normalizes totals and empty by_model when field is absent', () => {
    expect(readLlmUsage({
      input_tokens: 10,
      output_tokens: 4,
      estimated_cost_ntd: '1.25',
      estimated_cost_usd: '0.0400'
    })).toEqual({
      input_tokens: 10,
      output_tokens: 4,
      estimated_cost_ntd: '1.25',
      estimated_cost_usd: '0.0400',
      by_model: []
    })
  })

  it('treats non-array by_model as empty without throwing', () => {
    expect(readLlmUsage({
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_ntd: '0.00',
      estimated_cost_usd: '0.0000',
      by_model: { model: 'bad' }
    })?.by_model).toEqual([])
  })

  it('parses by_model rows and skips non-objects', () => {
    const parsed = readLlmUsage({
      input_tokens: '100',
      output_tokens: 20.9,
      estimated_cost_ntd: 3,
      estimated_cost_usd: '0.1',
      by_model: [
        null,
        'skip',
        {
          model: '  claude-sonnet-4-5  ',
          input_tokens: 80,
          output_tokens: 15,
          estimated_cost_ntd: '2.50',
          estimated_cost_usd: '0.0800'
        },
        {
          model: '',
          input_tokens: -3,
          output_tokens: 'x',
          estimated_cost_ntd: '',
          estimated_cost_usd: null
        }
      ]
    })

    expect(parsed).toEqual({
      input_tokens: 100,
      output_tokens: 20,
      estimated_cost_ntd: '3.00',
      estimated_cost_usd: '0.1000',
      by_model: [
        {
          model: 'claude-sonnet-4-5',
          input_tokens: 80,
          output_tokens: 15,
          estimated_cost_ntd: '2.50',
          estimated_cost_usd: '0.0800'
        },
        {
          model: '',
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost_ntd: '0.00',
          estimated_cost_usd: '0.0000'
        }
      ]
    })
  })
})
