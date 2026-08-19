export const injectionKeyIsVerticalNavHovered: InjectionKey<Ref<boolean>> = Symbol('isVerticalNavHovered')

/** Permite a la app sustituir el logo por defecto del nav-header (p.ej. logo de empresa) sin acoplar @layouts a @/. */
export interface VerticalNavLogoOverride {
  src: string
  maxHeight: number
}
export const injectionKeyVerticalNavLogoOverride: InjectionKey<Ref<VerticalNavLogoOverride | null | undefined>> = Symbol('verticalNavLogoOverride')
