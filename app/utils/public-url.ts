/** Browser path for a `public/` file, including `app.baseURL` (GitHub Pages project sites). */
export function withAppBase(baseURL: string, path: string) {
  const base = String(baseURL || '/').replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}` || '/'
}
