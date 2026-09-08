export function usePageCopy() {
  const { t } = useI18n()
  const { platform } = useOrgScope()

  function moduleDesc(key: string) {
    return t(platform.value ? `module.platform.${key}` : `module.firm.${key}`)
  }

  const hint = computed(() => t(platform.value ? 'module.hintPlatform' : 'module.hintFirm'))

  return { moduleDesc, hint, platform }
}
