import type { useTheme } from 'vuetify'
import { darkenHex, getReadableOnColor } from '@core/utils/colorConverter'
import { cookieRef } from '@layouts/stores/config'

/** Altura por defecto (px) del logo cuando la empresa no ha elegido una propia. */
export const DEFAULT_LOGO_HEIGHT = 40
export const MIN_LOGO_HEIGHT = 20
export const MAX_LOGO_HEIGHT = 72

/**
 * Resuelve la URL final de un logo de empresa: si es una URL externa (http...) se usa tal cual;
 * si es la ruta relativa que devuelve el backend tras subir un fichero (p.ej. "empresas/ACME/logo?v=...")
 * se antepone el mismo baseURL que usa $api, para que funcione igual en dev (backend en otro origen) y prod.
 */
export function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl)
    return null
  if (/^https?:\/\//i.test(logoUrl))
    return logoUrl

  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

  return `${base}/${logoUrl.replace(/^\/+/, '')}`
}

/**
 * Aplica el color de marca de la empresa como color primario POR DEFECTO de Vuetify.
 * Si el usuario ya tiene un color personal guardado (cookie del Theme Customizer),
 * ese color personal manda: el de empresa es solo el valor por defecto, no lo pisa.
 */
export function applyEmpresaPrimaryColor(vuetifyTheme: ReturnType<typeof useTheme>, color?: string | null): void {
  if (!color)
    return

  const hasPersonalLight = !!cookieRef<string | null>('lightThemePrimaryColor', null).value
  const hasPersonalDark = !!cookieRef<string | null>('darkThemePrimaryColor', null).value
  const darken = darkenHex(color)
  const onColor = getReadableOnColor(color)

  if (!hasPersonalLight) {
    vuetifyTheme.themes.value.light.colors.primary = color
    vuetifyTheme.themes.value.light.colors['primary-darken-1'] = darken
    vuetifyTheme.themes.value.light.colors['on-primary'] = onColor
  }
  if (!hasPersonalDark) {
    vuetifyTheme.themes.value.dark.colors.primary = color
    vuetifyTheme.themes.value.dark.colors['primary-darken-1'] = darken
    vuetifyTheme.themes.value.dark.colors['on-primary'] = onColor
  }
}
