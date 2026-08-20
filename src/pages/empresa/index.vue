<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import type { EmpresaDto } from '@/types/api'
import { $api, apiErrorMessage } from '@/utils/api'
import { DEFAULT_LOGO_HEIGHT } from '@/utils/empresaBranding'

definePage({ meta: { title: 'Mi Empresa', requiresAdmin: true } })

const authStore = useAuthStore()
const router = useRouter()

watchEffect(() => {
  if (authStore.rol && !authStore.isAdmin && !authStore.isSuperAdmin)
    router.replace('/')
})

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const sinEmpresa = ref(false)
const empresaId = ref<number | null>(null)
const codigoInterno = ref('')

const form = ref({
  nombre: '',
  cif: '',
  emailContacto: '',
  logoUrl: '',
  colorPrimario: '',
  logoAlto: DEFAULT_LOGO_HEIGHT,
})

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function cargar() {
  loading.value = true
  error.value = ''
  sinEmpresa.value = false
  try {
    const empresa = await $api<EmpresaDto>('/mi-empresa')

    empresaId.value = empresa.id
    codigoInterno.value = empresa.codigoInterno
    form.value = {
      nombre: empresa.nombre ?? '',
      cif: empresa.cif ?? '',
      emailContacto: empresa.emailContacto ?? '',
      logoUrl: empresa.logoUrl ?? '',
      colorPrimario: empresa.colorPrimario ?? '',
      logoAlto: empresa.logoAlto ?? DEFAULT_LOGO_HEIGHT,
    }
    authStore.actualizarBranding(empresa.logoUrl ?? null, empresa.colorPrimario ?? null, empresa.logoAlto ?? null)
  }
  catch (e: any) {
    if (e?.status === 404)
      sinEmpresa.value = true
    else
      error.value = apiErrorMessage(e, 'No se pudieron cargar los datos de la empresa')
  }
  finally {
    loading.value = false
  }
}

async function guardar() {
  saving.value = true
  try {
    const empresa = await $api<EmpresaDto>('/mi-empresa', { method: 'PUT', body: form.value })

    form.value.logoUrl = empresa.logoUrl ?? ''
    authStore.actualizarBranding(empresa.logoUrl ?? null, empresa.colorPrimario ?? null, empresa.logoAlto ?? null)
    showMsg('Datos de la empresa actualizados correctamente')
  }
  catch (e: any) {
    showMsg(apiErrorMessage(e, 'No se pudieron guardar los cambios'), 'error')
  }
  finally {
    saving.value = false
  }
}

// El logo (o su altura) puede cambiarse antes de guardar el resto de campos: se refleja al
// momento en el store (sidebar) igual que si se hubiera guardado el formulario completo,
// para que el usuario vea de inmediato cómo queda antes de confirmar.
watch(
  () => [form.value.logoUrl, form.value.logoAlto] as const,
  ([url, alto]) => authStore.actualizarBranding(url || null, form.value.colorPrimario || null, alto ?? null),
)

onMounted(cargar)
</script>

<template>
  <div>
    <VAlert
      v-if="!authStore.isAdmin && !authStore.isSuperAdmin"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      Solo el administrador de la empresa puede editar estos datos.
    </VAlert>

    <VAlert
      v-if="sinEmpresa"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Tu usuario no tiene ninguna empresa asociada.
    </VAlert>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <VCard v-if="!sinEmpresa">
      <VCardItem>
        <VCardTitle>Mi Empresa</VCardTitle>
        <VCardSubtitle>
          Edita el nombre, el logo y el color de marca de tu empresa. Los cambios se aplican de inmediato.
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VSkeletonLoader
          v-if="loading"
          type="article"
        />
        <VForm
          v-else
          @submit.prevent="guardar"
        >
          <EmpresaBrandingForm
            v-model:form="form"
            :logo-upload-endpoint="empresaId ? '/mi-empresa/logo' : null"
          >
            <template #extra-fields>
              <AppTextField
                :model-value="codigoInterno"
                label="Codigo interno"
                disabled
                hint="Identificador unico de tu empresa, no editable"
                persistent-hint
              />
            </template>
          </EmpresaBrandingForm>
        </VForm>
      </VCardText>

      <VCardActions
        v-if="!loading"
        class="justify-end pt-0 pb-4 px-6"
      >
        <VBtn
          :loading="saving"
          @click="guardar"
        >
          Guardar cambios
        </VBtn>
      </VCardActions>
    </VCard>

    <EmpresaEmailCuentasCard
      v-if="!sinEmpresa && !loading"
      class="mt-6"
      endpoint="/mi-empresa/email-cuentas"
    />

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="bottom end"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
