import { describe, expect, it } from 'vitest'
import { readLlmUsage } from '~/utils/admin-api'

describe('readLlmUsage', () => {
  it('returns null for missing usage', () => {
    expect(readLlmUsage(null)).toBeNull()
    expect(readLlmUsage(undefined)).toBeNull()
    expect(readLlmUsage('x')).toBeNull()
    expect(readLlmUsage([])).toBeNull()
  })

  it('normalizes totals and empty breakdowns when fields are absent (legacy)', () => {
    expect(readLlmUsage({
      input_tokens: 10,
      output_tokens: 4,
      estimated_cost_ntd: '1.25',
      estimated_cost_usd: '0.0400'
    })).toEqual({
      input_tokens: 10,
      output_tokens: 4,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: '1.25',
      estimated_cost_usd: '0.0400',
      cost_complete: true,
      by_model: [],
      by_category_model: []
    })
  })

  it('treats non-array by_model / by_category_model as empty without throwing', () => {
    const parsed = readLlmUsage({
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_ntd: '0.00',
      estimated_cost_usd: '0.0000',
      by_model: { model: 'bad' },
      by_category_model: { category: 'chat' }
    })
    expect(parsed?.by_model).toEqual([])
    expect(parsed?.by_category_model).toEqual([])
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
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: '3.00',
      estimated_cost_usd: '0.1000',
      cost_complete: true,
      by_model: [
        {
          model: 'claude-sonnet-4-5',
          input_tokens: 80,
          output_tokens: 15,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '2.50',
          estimated_cost_usd: '0.0800',
          cost_known: true
        },
        {
          model: '',
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '0.00',
          estimated_cost_usd: '0.0000',
          cost_known: true
        }
      ],
      by_category_model: []
    })
  })

  it('parses by_category_model, cache tokens, and unknown costs', () => {
    const parsed = readLlmUsage({
      input_tokens: 46700,
      output_tokens: 5780,
      cache_read_tokens: 6400,
      cache_write_tokens: 12,
      estimated_cost_ntd: null,
      estimated_cost_usd: null,
      cost_complete: false,
      by_category_model: [
        {
          category: 'decision',
          model: 'gpt-6-luna',
          input_tokens: 10900,
          output_tokens: 280,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: null,
          cost_known: false
        },
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 31200,
          output_tokens: 4850,
          cache_read_tokens: 6400,
          cache_write_tokens: 12,
          estimated_cost_ntd: '3.78',
          estimated_cost_usd: '0.1180',
          cost_known: true
        },
        { category: '', model: 'skip-empty-category' },
        null
      ]
    })

    expect(parsed?.cost_complete).toBe(false)
    expect(parsed?.estimated_cost_usd).toBeNull()
    expect(parsed?.cache_read_tokens).toBe(6400)
    expect(parsed?.cache_write_tokens).toBe(12)
    expect(parsed?.by_category_model).toEqual([
      {
        category: 'decision',
        model: 'gpt-6-luna',
        input_tokens: 10900,
        output_tokens: 280,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: null,
        cost_known: false
      },
      {
        category: 'chat',
        model: 'claude-haiku-4-5',
        input_tokens: 31200,
        output_tokens: 4850,
        cache_read_tokens: 6400,
        cache_write_tokens: 12,
        estimated_cost_ntd: '3.78',
        estimated_cost_usd: '0.1180',
        cost_known: true
      }
    ])
  })
})
