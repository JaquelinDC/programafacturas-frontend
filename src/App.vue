<script setup lang="ts">
import { useTheme } from 'vuetify'
import ScrollToTop from '@core/components/ScrollToTop.vue'
import initCore from '@core/initCore'
import { initConfigStore, useConfigStore } from '@core/stores/config'
import { hexToRgb } from '@core/utils/colorConverter'
import { useAuthStore } from '@/stores/auth'
import { applyEmpresaPrimaryColor } from '@/utils/empresaBranding'

const vuetifyTheme = useTheme()
const { global } = vuetifyTheme

// ℹ️ Sync current theme with initial loader theme
initCore()
initConfigStore()

const configStore = useConfigStore()

// Rehidratar estado de usuario si hay token (p.ej. tras recargar página)
const authStore = useAuthStore()
if (authStore.accessToken)
  authStore.fetchMe()

// Aplica el color de marca de la empresa como color primario por defecto en cuanto se conoce
// (login o fetchMe tras recargar), y de nuevo si cambia (p.ej. tras guardarlo en "Mi Empresa").
watch(() => authStore.colorPrimario, color => applyEmpresaPrimaryColor(vuetifyTheme, color), { immediate: true })
</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <!-- ℹ️ This is required to set the background color of active nav link based on currently active global theme's primary -->
    <VApp :style="`--v-global-theme-primary: ${hexToRgb(global.current.value.colors.primary)}`">
      <RouterView />

      <ScrollToTop />
    </VApp>
  </VLocaleProvider>
</template>
