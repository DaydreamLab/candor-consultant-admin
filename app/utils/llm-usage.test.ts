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
      cost_twd: null,
      cost_complete: true,
      fx: null,
      by_model: [],
      by_category_model: [],
      decision_by_purpose_model: []
    })
  })

  it('treats non-array by_model / by_category_model as empty without throwing', () => {
    const parsed = readLlmUsage({
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_ntd: '0.00',
      estimated_cost_usd: '0.0000',
      by_model: { model: 'bad' },
      by_category_model: { category: 'chat' },
      decision_by_purpose_model: { purpose: 'x' }
    })
    expect(parsed?.by_model).toEqual([])
    expect(parsed?.by_category_model).toEqual([])
    expect(parsed?.decision_by_purpose_model).toEqual([])
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
          estimated_cost_usd: '0.0800',
          cost_twd: '2.56'
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
      cost_twd: null,
      cost_complete: true,
      fx: null,
      by_model: [
        {
          model: 'claude-sonnet-4-5',
          input_tokens: 80,
          output_tokens: 15,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '2.50',
          estimated_cost_usd: '0.0800',
          cost_twd: '2.56',
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
          cost_twd: null,
          cost_known: true
        }
      ],
      by_category_model: [],
      decision_by_purpose_model: []
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
      cost_twd: null,
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
          cost_twd: null,
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
          cost_twd: '3.78',
          cost_known: true
        },
        { category: '', model: 'skip-empty-category' },
        null
      ]
    })

    expect(parsed?.cost_complete).toBe(false)
    expect(parsed?.estimated_cost_usd).toBeNull()
    expect(parsed?.cost_twd).toBeNull()
    expect(parsed?.fx).toBeNull()
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
        cost_twd: null,
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
        cost_twd: '3.78',
        cost_known: true
      }
    ])
  })

  it('parses fx with rate_date / fetched_at and effective_from fallback', () => {
    const withRateDate = readLlmUsage({
      input_tokens: 1,
      output_tokens: 0,
      estimated_cost_usd: '0.0100',
      cost_twd: '0.32',
      fx: {
        base: 'USD',
        quote: 'TWD',
        rate: '32.155',
        rate_date: '2026-10-27',
        fetched_at: '2026-10-28T01:00:00Z',
        source: 'BOT'
      }
    })
    expect(withRateDate?.fx).toEqual({
      base: 'USD',
      quote: 'TWD',
      rate: '32.155',
      rate_date: '2026-10-27',
      fetched_at: '2026-10-28T01:00:00Z',
      source: 'BOT'
    })
    expect(withRateDate?.cost_twd).toBe('0.32')

    const legacyEffectiveFrom = readLlmUsage({
      input_tokens: 1,
      output_tokens: 0,
      estimated_cost_usd: '0.0100',
      fx: {
        base: 'USD',
        quote: 'TWD',
        rate: 32.1,
        effective_from: '2026-10-20',
        fetched_at: '2026-10-21T02:00:00Z',
        source: 'BOT'
      }
    })
    expect(legacyEffectiveFrom?.fx?.rate_date).toBe('2026-10-20')
    expect(legacyEffectiveFrom?.fx?.rate).toBe('32.1')

    const nullRate = readLlmUsage({
      input_tokens: 1,
      output_tokens: 0,
      estimated_cost_usd: '0.0100',
      cost_twd: null,
      fx: {
        base: 'USD',
        quote: 'TWD',
        rate: null,
        rate_date: null,
        fetched_at: '2026-10-28T01:00:00Z',
        source: 'BOT'
      }
    })
    expect(nullRate?.fx?.rate).toBeNull()
    expect(nullRate?.cost_twd).toBeNull()
  })

  it('parses decision_by_purpose_model and skips empty purpose', () => {
    const parsed = readLlmUsage({
      input_tokens: 10,
      output_tokens: 2,
      estimated_cost_usd: '0.0100',
      cost_twd: '0.32',
      decision_by_purpose_model: [
        null,
        { purpose: '', model: 'x' },
        {
          purpose: 'decision.cta.open_chat',
          model: 'claude-haiku-4-5',
          input_tokens: 7,
          output_tokens: 1,
          estimated_cost_usd: '0.0080',
          cost_twd: '0.26',
          cost_known: true
        },
        {
          purpose: 'reply_is_asking',
          model: 'gpt-6-luna',
          input_tokens: 3,
          output_tokens: 1,
          estimated_cost_usd: null,
          cost_twd: null,
          cost_known: false
        }
      ]
    })
    expect(parsed?.decision_by_purpose_model).toEqual([
      {
        purpose: 'decision.cta.open_chat',
        model: 'claude-haiku-4-5',
        input_tokens: 7,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: '0.00',
        estimated_cost_usd: '0.0080',
        cost_twd: '0.26',
        cost_known: true
      },
      {
        purpose: 'reply_is_asking',
        model: 'gpt-6-luna',
        input_tokens: 3,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: null,
        cost_twd: null,
        cost_known: false
      }
    ])
  })
})
