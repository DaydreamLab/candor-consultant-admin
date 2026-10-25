<script setup lang="ts">
import { renderMarkdownToHtml } from '~/utils/markdown-render'

const props = defineProps<{
  /** Markdown body */
  source: string
  /** Optional title shown above the rendered body */
  title?: string
}>()

const bodyHtml = computed(() => renderMarkdownToHtml(props.source || ''))
</script>

<template>
  <div
    class="markdown-preview min-w-0"
    data-testid="markdown-preview"
  >
    <h1
      v-if="title?.trim()"
      class="text-xl font-semibold text-highlighted sm:text-2xl"
      data-testid="markdown-preview-title"
    >
      {{ title.trim() }}
    </h1>
    <!-- source is escaped then Markdown-transformed (see markdown-render.ts) -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="privacy-md space-y-3 text-sm leading-relaxed text-default sm:text-base"
      :class="title?.trim() ? 'mt-4' : ''"
      data-testid="markdown-preview-body"
      v-html="bodyHtml"
    />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<style scoped>
.privacy-md :deep(h1),
.privacy-md :deep(h2),
.privacy-md :deep(h3),
.privacy-md :deep(h4) {
  font-weight: 600;
  color: var(--ui-text-highlighted);
  margin-top: 1.25rem;
}
.privacy-md :deep(h1:first-child),
.privacy-md :deep(h2:first-child),
.privacy-md :deep(h3:first-child),
.privacy-md :deep(h4:first-child) {
  margin-top: 0;
}
.privacy-md :deep(h1) { font-size: 1.35rem; }
.privacy-md :deep(h2) { font-size: 1.15rem; }
.privacy-md :deep(h3) { font-size: 1.05rem; }
.privacy-md :deep(ul),
.privacy-md :deep(ol) {
  padding-inline-start: 1.25rem;
}
.privacy-md :deep(ul) { list-style: disc; }
.privacy-md :deep(ol) { list-style: decimal; }
.privacy-md :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.privacy-md :deep(code) {
  font-size: 0.875em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: color-mix(in oklab, var(--ui-bg-elevated) 80%, transparent);
}
.privacy-md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--ui-border);
  margin: 1.25rem 0;
}
.privacy-md :deep(p) {
  margin: 0;
}
</style>
