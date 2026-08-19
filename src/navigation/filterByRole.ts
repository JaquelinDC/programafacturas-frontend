import type { Router } from 'vue-router'
import type { NavGroup, NavLink, NavSectionTitle } from '@layouts/types'

type NavItem = NavLink | NavGroup | NavSectionTitle

function isHeading(item: NavItem): item is NavSectionTitle {
  return 'heading' in item
}

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

function isLink(item: NavItem): item is NavLink {
  return 'to' in item && item.to != null
}

/**
 * Un item de menú es visible si su ruta destino no exige más rol del que tiene el usuario.
 * Usa la MISMA condición que el guard real en src/plugins/1.router/index.ts (requiresSuperAdmin /
 * requiresAdmin), resolviendo el meta de la ruta vía router.resolve — así el menú nunca puede
 * desincronizarse de lo que el guard realmente deja navegar.
 */
function isAllowed(to: NavLink['to'], router: Router, rol: string | null): boolean {
  if (!to)
    return true
  if (!rol)
    return false

  const meta = router.resolve(to).meta
  if (meta?.requiresSuperAdmin)
    return rol === 'SUPERADMIN'
  if (meta?.requiresAdmin)
    return rol === 'ADMINISTRADOR' || rol === 'SUPERADMIN'

  return true
}

/**
 * Filtra el árbol de navegación (lista plana con headings, o grupos anidados) dejando solo
 * lo que el rol actual puede navegar de verdad. Elimina grupos que se quedan sin hijos, y
 * headings de la lista vertical que se quedan sin ningún item detrás.
 */
export function filterNavItemsByAccess(items: NavItem[], router: Router, rol: string | null): NavItem[] {
  const filtered = items
    .map((item): NavItem | null => {
      if (isGroup(item)) {
        const children = filterNavItemsByAccess(item.children, router, rol) as (NavLink | NavGroup)[]

        return children.length ? { ...item, children } : null
      }
      if (isLink(item))
        return isAllowed(item.to, router, rol) ? item : null

      return item
    })
    .filter((item): item is NavItem => item !== null)

  return filtered.filter((item, index) => {
    if (!isHeading(item))
      return true

    const next = filtered[index + 1]

    return !!next && !isHeading(next)
  })
}
