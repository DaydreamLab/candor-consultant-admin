<script setup lang="ts">
/**
 * 本機／截圖用 fixture：三態並列（預設收合、展開含未知單價、舊格式退回）。
 * 不連真實後端；路徑對 auth middleware 為公開。
 */
definePageMeta({
  layout: false
})

const fixtureExpanded = {
  input_tokens: 46700,
  output_tokens: 5780,
  cache_read_tokens: 6400,
  cache_write_tokens: 0,
  estimated_cost_ntd: null,
  estimated_cost_usd: '0.1420',
  cost_complete: false,
  by_model: [
    {
      model: 'claude-haiku-4-5',
      input_tokens: 35800,
      output_tokens: 5500,
      cache_read_tokens: 6400,
      cache_write_tokens: 0,
      estimated_cost_ntd: '4.42',
      estimated_cost_usd: '0.1370',
      cost_known: true
    },
    {
      model: 'gpt-6-luna',
      input_tokens: 10900,
      output_tokens: 280,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: null,
      estimated_cost_usd: null,
      cost_known: false
    }
  ],
  by_category_model: [
    {
      category: 'chat',
      model: 'claude-haiku-4-5',
      input_tokens: 31200,
      output_tokens: 4850,
      cache_read_tokens: 6400,
      cache_write_tokens: 0,
      estimated_cost_ntd: '3.78',
      estimated_cost_usd: '0.1180',
      cost_known: true
    },
    {
      category: 'report',
      model: 'claude-haiku-4-5',
      input_tokens: 3900,
      output_tokens: 620,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: '0.61',
      estimated_cost_usd: '0.0190',
      cost_known: true
    },
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
      category: 'decision',
      model: 'claude-haiku-4-5',
      input_tokens: 700,
      output_tokens: 30,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: '0.16',
      estimated_cost_usd: '0.0050',
      cost_known: true
    }
  ]
}

const fixtureCollapsed = { ...fixtureExpanded }

const fixtureLegacy = {
  input_tokens: 100,
  output_tokens: 40,
  estimated_cost_ntd: '3.00',
  estimated_cost_usd: '0.1000',
  by_model: [
    {
      model: 'claude-sonnet-4-5',
      input_tokens: 70,
      output_tokens: 30,
      estimated_cost_ntd: '2.00',
      estimated_cost_usd: '0.0700'
    },
    {
      model: 'claude-haiku',
      input_tokens: 30,
      output_tokens: 10,
      estimated_cost_ntd: '1.00',
      estimated_cost_usd: '0.0300'
    }
  ]
}
</script>

<template>
  <div class="min-h-screen bg-muted p-6 text-default">
    <p class="mb-4 inline-block rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
      Fixture・數字皆為範例資料（不連後端）
    </p>
    <div class="flex flex-wrap gap-6">
      <section
        class="w-[480px] rounded-[10px] border border-default bg-default p-5"
        data-testid="fixture-collapsed"
      >
        <h1 class="mb-3 text-sm font-semibold text-muted">
          ① 預設狀態（只顯示總量）
        </h1>
        <LlmUsageSummary :usage="fixtureCollapsed" />
      </section>

      <section
        class="min-w-[640px] rounded-[10px] border border-default bg-default p-5"
        data-testid="fixture-expanded"
      >
        <h1 class="mb-3 text-sm font-semibold text-muted">
          ② 展開細節（含未知單價 *）
        </h1>
        <LlmUsageSummary
          :usage="fixtureExpanded"
          default-details-open
        />
      </section>

      <section
        class="w-[480px] rounded-[10px] border border-default bg-default p-5"
        data-testid="fixture-legacy"
      >
        <h1 class="mb-3 text-sm font-semibold text-muted">
          ③ 舊格式退回（無 by_category_model）
        </h1>
        <LlmUsageSummary
          :usage="fixtureLegacy"
          default-details-open
        />
      </section>
    </div>
  </div>
</template>
