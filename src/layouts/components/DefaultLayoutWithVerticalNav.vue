<script lang="ts" setup>
import { filterNavItemsByAccess } from '@/navigation/filterByRole'
import navItems from '@/navigation/vertical'
import { useAuthStore } from '@/stores/auth'
import { DEFAULT_LOGO_HEIGHT, resolveLogoUrl } from '@/utils/empresaBranding'
import { themeConfig } from '@themeConfig'

// Components
//import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import GlobalPeriodoSelector from '@/layouts/components/GlobalPeriodoSelector.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'

// @layouts plugin
import { VerticalNavLayout } from '@layouts'
import { injectionKeyVerticalNavLogoOverride } from '@layouts/symbols'

const authStore = useAuthStore()
const router = useRouter()

const visibleNavItems = computed(() => filterNavItemsByAccess(navItems, router, authStore.rol))

const empresaLogoOverride = computed(() => {
  const src = resolveLogoUrl(authStore.logoUrl)

  return src ? { src, maxHeight: authStore.logoAlto ?? DEFAULT_LOGO_HEIGHT } : null
})

// El logo de empresa sustituye al de SoftIT en la cabecera del sidebar (VerticalNav, dentro de @layouts)
// sin acoplar ese componente genérico a los stores de la app.
provide(injectionKeyVerticalNavLogoOverride, empresaLogoOverride)
</script>

<template>
  <VerticalNavLayout :nav-items="visibleNavItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>

        <NavbarThemeSwitcher />

        <VSpacer />

        <NavBarI18n
          v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
          :languages="themeConfig.app.i18n.langConfig"
        />
        <GlobalPeriodoSelector />
        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>
</template>
