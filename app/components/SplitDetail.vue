<template>
  <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
    <div class="min-w-0">
      <slot />
    </div>
    <aside class="min-w-0 overflow-hidden rounded-xl border border-default bg-elevated lg:sticky lg:top-4">
      <slot name="detail" />
    </aside>
  </div>
</template>
