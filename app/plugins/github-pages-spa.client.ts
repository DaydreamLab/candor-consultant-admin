export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return
  }
  try {
    const stored = sessionStorage.getItem('candor-gh-pages-path')
    if (!stored) {
      return
    }
    sessionStorage.removeItem('candor-gh-pages-path')
    const base = useRuntimeConfig().app.baseURL || '/'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    const path = stored.startsWith('/') ? stored : `/${stored}`
    const url = `${normalizedBase.replace(/\/$/, '')}${path}`.replace(/\/{2,}/g, '/')
    history.replaceState(null, '', url)
  } catch {
    // ignore storage errors
  }
})
