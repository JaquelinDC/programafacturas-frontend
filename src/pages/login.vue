<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = ref({
  username: '',
  password: '',
})

const isPasswordVisible = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

async function handleLogin() {
  if (!form.value.username || !form.value.password)
    return

  isLoading.value = true
  errorMessage.value = null

  try {
    await authStore.login(form.value.username, form.value.password)
    const redirect = route.query.redirect as string | undefined
    router.push(redirect || '/')
  }
  catch (err: any) {
    errorMessage.value = err?.data?.message || 'Usuario o contraseña incorrectos'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="ai-auth">
    <div class="ai-auth__card">

      <!-- Panel izquierdo: showcase IA -->
      <div class="ai-showcase d-none d-md-flex">
        <div class="ai-showcase__grid" />
        <div class="ai-showcase__glow ai-showcase__glow--1" />
        <div class="ai-showcase__glow ai-showcase__glow--2" />

        <div class="ai-showcase__head">
          <span class="ai-showcase__eyebrow">
            <span class="ai-showcase__dot" /> Facturación con IA
          </span>
          <h1 class="ai-showcase__title">
            Tus facturas, <br>
            <span class="ai-showcase__title-accent">leídas por IA.</span>
          </h1>
          <p class="ai-showcase__sub">
            Fotografía un ticket o una factura y deja que la IA extraiga
            importes, fechas e impuestos. Tú solo revisas y apruebas.
          </p>
        </div>

        <!-- Mock de documento escaneado (decorativo) -->
        <div class="ai-scan d-flex justify-center" aria-hidden="true">
          <div class="ai-scan__doc">
            <div class="ai-scan__doc-head">
              <span class="ai-scan__doc-logo" />
              <div class="ai-scan__doc-meta">
                <i class="ai-scan__bar" style="width: 64%" />
                <i class="ai-scan__bar ai-scan__bar--sm" style="width: 40%" />
              </div>
            </div>
            <i class="ai-scan__bar" style="width: 90%" />
            <i class="ai-scan__bar" style="width: 78%" />
            <i class="ai-scan__bar" style="width: 84%" />
            <i class="ai-scan__bar ai-scan__bar--total" style="width: 52%" />
            <div class="ai-scan__beam" />
          </div>

          <ul class="ai-scan__chips">
            <li style="--i: 0">
              <span class="ai-scan__chip-k">Total</span>
              <span class="ai-scan__chip-v">1.248,90 €</span>
            </li>
            <li style="--i: 1">
              <span class="ai-scan__chip-k">IVA 21%</span>
              <span class="ai-scan__chip-v">216,80 €</span>
            </li>
            <li style="--i: 2">
              <span class="ai-scan__chip-k">Fecha</span>
              <span class="ai-scan__chip-v">05/06/2026</span>
            </li>
            <li style="--i: 3">
              <span class="ai-scan__chip-k">NIF</span>
              <span class="ai-scan__chip-v">B-12345678</span>
            </li>
          </ul>
        </div>

        <div class="ai-showcase__stats">
          <div class="ai-showcase__stat">
            <span class="ai-showcase__stat-val">+1,386</span>
            <span class="ai-showcase__stat-label">facturas procesadas</span>
          </div>
          <div class="ai-showcase__stat-divider" />
          <div class="ai-showcase__stat">
            <span class="ai-showcase__stat-val">99,2%</span>
            <span class="ai-showcase__stat-label">precisión de lectura</span>
          </div>
        </div>
      </div>

      <!-- Panel derecho: formulario -->
      <div class="ai-form d-flex align-center justify-center">
        <div class="ai-form__inner">
          <a href="javascript:void(0)" class="ai-form__logo d-flex justify-center align-center gap-x-3 mb-8">
            <VNodeRenderer :nodes="themeConfig.app.logo" />
          </a>

          <h2 class="ai-form__title">
            Inicia sesión
          </h2>
          <p class="ai-form__lead">
            Bienvenido de nuevo. Accede a tu panel de facturación.
          </p>

          <VExpandTransition>
            <VAlert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-6"
              density="compact"
              role="alert"
              aria-live="assertive"
              closable
              @click:close="errorMessage = null"
            >
              {{ errorMessage }}
            </VAlert>
          </VExpandTransition>

          <VForm @submit.prevent="handleLogin">
            <AppTextField
              v-model="form.username"
              autofocus
              label="Usuario"
              placeholder="tu usuario"
              prepend-inner-icon="tabler-user"
              name="username"
              autocomplete="username"
              :disabled="isLoading"
              class="mb-5"
            />

            <div class="ai-form__password-header">
              <label class="ai-form__password-label">Contraseña</label>
              <a href="javascript:void(0)" class="ai-form__forgot">¿Olvidaste tu contraseña?</a>
            </div>

            <AppTextField
              v-model="form.password"
              placeholder="············"
              prepend-inner-icon="tabler-lock"
              name="password"
              autocomplete="current-password"
              :type="isPasswordVisible ? 'text' : 'password'"
              :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
              :disabled="isLoading"
              @click:append-inner="isPasswordVisible = !isPasswordVisible"
            />

            <VBtn
              block
              size="large"
              type="submit"
              class="ai-form__submit mt-6"
              :loading="isLoading"
            >
              Iniciar sesión
              <template #append>
                <VIcon icon="tabler-arrow-right" />
              </template>
            </VBtn>
          </VForm>

         
          <!--
          <p class="ai-form__footnote">
            <VIcon icon="tabler-shield-lock" size="16" />
            Acceso seguro · Conexión cifrada
          </p>
          -->
        </div>
      </div>

    </div>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
@use "@/assets/styles/pages/login";
</style>
