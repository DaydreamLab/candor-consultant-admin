<template>
  <div
    class="min-w-0 space-y-1 font-mono text-sm leading-relaxed text-dimmed"
    data-testid="build-version"
    :aria-label="`Admin: dev (${feLabel}). Core Engine: beta (${coreLabel})`"
  >
    <p>Admin: dev ({{ feLabel }})</p>
    <p>Core Engine: beta ({{ coreLabel }})</p>
  </div>
</template>

<script setup lang="ts">
function shortSha(raw: string): string {
  const match = raw.match(/[0-9a-f]{7,40}/i)
  return (match?.[0] ?? raw).slice(0, 7)
}

const config = useRuntimeConfig()
const feRaw = String(config.public.feSha || '')
const feLabel = feRaw ? shortSha(feRaw) : 'dev'
const coreLabel = ref('—')

onMounted(async () => {
  try {
    const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
    const origin = apiBase.replace(/\/api\/v1$/, '')
    if (!origin) {
      return
    }
    const res = await $fetch<{ data?: { revision?: string | null } }>(`${origin}/health`)
    const revision = res?.data?.revision
    if (typeof revision === 'string' && revision.length > 0) {
      coreLabel.value = shortSha(revision)
    }
  } catch {
    // keep em-dash when core is unreachable
  }
})
</script>
