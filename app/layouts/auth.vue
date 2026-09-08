<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="flex h-16 items-center gap-3 border-b border-default bg-elevated px-4 sm:px-6">
      <BrandMark />
      <div class="ms-auto flex items-center gap-2">
        <LocaleSwitch />
        <ColorModeSwitch />
      </div>
    </header>
    <main class="mx-auto max-w-2xl px-4 py-12">
      <slot />
    </main>
  </div>
</template>
