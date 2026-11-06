<!-- Present so vue-tsc (which still sees admin pages/*.vue) accepts layout: 'public'. -->
<template>
  <div
    class="min-h-dvh bg-default text-default"
    data-surface="expert"
  >
    <main class="mx-auto max-w-3xl px-4 py-10">
      <slot />
    </main>
  </div>
</template>
