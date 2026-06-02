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

// ─── Guardia de autenticación ─────────────────────────────────────────────────
router.beforeEach(to => {
  const isPublic = to.meta?.public === true
  const accessToken = useCookie('accessToken').value

  // Redirigir a login si la ruta no es pública y no hay token
  if (!isPublic && !accessToken)
    return { path: '/login', query: { redirect: to.fullPath } }

  // Redirigir al inicio si ya está autenticado y va al login
  if (isPublic && accessToken && to.path === '/login')
    return { path: '/' }
})

export { router }

export default function install(app: App) {
  app.use(router)
}
