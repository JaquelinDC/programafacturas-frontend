<script lang="ts" setup>
import { filterNavItemsByAccess } from '@/navigation/filterByRole'
import navItems from '@/navigation/horizontal'
import { useAuthStore } from '@/stores/auth'
import { DEFAULT_LOGO_HEIGHT, resolveLogoUrl } from '@/utils/empresaBranding'

import { themeConfig } from '@themeConfig'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'
import { HorizontalNavLayout } from '@layouts'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import type { HorizontalNavItems } from '@layouts/types'

const authStore = useAuthStore()
const router = useRouter()

const visibleNavItems = computed(() => filterNavItemsByAccess(navItems, router, authStore.rol) as HorizontalNavItems)
const empresaLogoUrl = computed(() => resolveLogoUrl(authStore.logoUrl))

// La navbar horizontal es más baja que la cabecera del sidebar: se limita la altura configurada
// para que el logo no desborde la barra, aunque en el sidebar se muestre más grande.
const empresaLogoMaxHeight = computed(() => Math.min(authStore.logoAlto ?? DEFAULT_LOGO_HEIGHT, 32))
</script>

<template>
  <HorizontalNavLayout :nav-items="visibleNavItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink
        to="/"
        class="app-logo d-flex align-center gap-x-3"
      >
        <img v-if="empresaLogoUrl" :src="empresaLogoUrl" alt="Logo de la empresa" :style="{ maxHeight: `${empresaLogoMaxHeight}px`, maxWidth: '160px' }">
        <VNodeRenderer v-else :nodes="themeConfig.app.logo" />

        <h1 v-if="!empresaLogoUrl" class="app-title font-weight-bold leading-normal text-xl text-capitalize">
          {{ themeConfig.app.title }}
        </h1>
      </RouterLink>
      <VSpacer />

      <NavBarI18n
        v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
        :languages="themeConfig.app.i18n.langConfig"
      />

      <NavbarThemeSwitcher class="me-2" />
      <UserProfile />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </HorizontalNavLayout>
</template>
