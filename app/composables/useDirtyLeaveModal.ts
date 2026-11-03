/**
 * Custom leave-confirm modal for dirty forms (B-06).
 * Do not use window.confirm — DESIGN requires a custom dialog.
 */
export function useDirtyLeaveModal(dirty: Ref<boolean>) {
  const leaveOpen = ref(false)
  const skipNextLeaveConfirm = ref(false)
  let resolveLeave: ((allow: boolean) => void) | null = null

  function settle(allow: boolean) {
    const resolve = resolveLeave
    resolveLeave = null
    leaveOpen.value = false
    // Ignore late @update:open(false) after an explicit stay／discard.
    resolve?.(allow)
  }

  function requestLeave(): Promise<boolean> {
    if (!import.meta.client || !dirty.value) {
      return Promise.resolve(true)
    }
    leaveOpen.value = true
    return new Promise((resolve) => {
      resolveLeave = resolve
    })
  }

  function stay() {
    settle(false)
  }

  function discardAndLeave() {
    settle(true)
  }

  function allowNavigationWithoutConfirm() {
    skipNextLeaveConfirm.value = true
  }

  onBeforeRouteLeave(() => {
    if (skipNextLeaveConfirm.value) {
      skipNextLeaveConfirm.value = false
      return true
    }
    if (!dirty.value) {
      return true
    }
    return requestLeave()
  })

  if (import.meta.client) {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.value) {
        return
      }
      event.preventDefault()
    }
    onMounted(() => {
      window.addEventListener('beforeunload', onBeforeUnload)
    })
    onUnmounted(() => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    })
  }

  return {
    leaveOpen,
    requestLeave,
    stay,
    discardAndLeave,
    allowNavigationWithoutConfirm
  }
}
