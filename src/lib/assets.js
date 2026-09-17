// Public/static assets are copied to the build root by Vite. Always resolve
// them through Vite's configured base so the same code works at a Pages
// project-site path and from Capacitor's local web root.
export function assetUrl(path) {
  const normalizedPath = String(path).replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${normalizedPath}`
}