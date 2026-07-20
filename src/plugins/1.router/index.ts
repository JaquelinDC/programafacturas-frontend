import { setupLayouts } from 'virtual:meta-layouts'
import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router/auto'
import { createRouter, createWebHistory } from 'vue-router/auto'

function recursiveLayouts(route: RouteRecordRaw): RouteRecordRaw {
  if (route.children) {
    for (let i = 0; i < route.children.length; i++)
      route.children[i] = recursiveLayouts(route.children[i])

    return route
  }

  return setupLayouts([route])[0]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash)
      return { el: to.hash, behavior: 'smooth', top: 60 }

    return { top: 0 }
  },
  extendRoutes: pages => [
    ...[...pages].map(route => recursiveLayouts(route)),
  ],
})

function getRoleFromToken(token: unknown): string | null {
  if (typeof token !== 'string')
    return null

  const payload = token.split('.')[1]
  if (!payload)
    return null

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalizedPayload))

    return decoded.rol ?? decoded.role ?? null
  }
  catch {
    return null
  }
}

router.beforeEach(to => {
  const isPublic = to.meta?.public === true
  const accessToken = useCookie('accessToken').value
  const tokenRole = getRoleFromToken(accessToken)

  if (!isPublic && !accessToken)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (isPublic && accessToken && to.path === '/login')
    return { path: '/' }

  if (to.meta?.requiresSuperAdmin && tokenRole && tokenRole !== 'SUPERADMIN')
    return { path: '/' }

  if (to.meta?.requiresAdmin && tokenRole && tokenRole !== 'ADMINISTRADOR' && tokenRole !== 'SUPERADMIN')
    return { path: '/' }
})

export { router }

export default function install(app: App) {
  app.use(router)
}
