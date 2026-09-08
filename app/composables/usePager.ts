export function usePager<T>(source: MaybeRefOrGetter<T[]>, pageSize = 10) {
  const page = ref(1)

  const all = computed(() => toValue(source))
  const total = computed(() => all.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  watch([total, pageCount], () => {
    if (page.value > pageCount.value) {
      page.value = pageCount.value
    }
  })

  const rows = computed(() => {
    const start = (page.value - 1) * pageSize
    return all.value.slice(start, start + pageSize)
  })

  const from = computed(() => (total.value ? (page.value - 1) * pageSize + 1 : 0))
  const to = computed(() => Math.min(page.value * pageSize, total.value))

  return { page, pageSize, rows, total, pageCount, from, to }
}
