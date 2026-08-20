<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import type { EmpresaDto } from '@/types/api'
import { $api, apiErrorMessage } from '@/utils/api'

definePage({ meta: { title: 'Cuentas de correo', requiresSuperAdmin: true } })

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

watchEffect(() => {
  if (authStore.rol && !authStore.isSuperAdmin)
    router.replace('/')
})

const empresaId = computed(() => Number((route.params as { id: string }).id))
const endpoint = computed(() => `/admin/empresas/${empresaId.value}/email-cuentas`)

const empresa = ref<EmpresaDto | null>(null)
const loading = ref(true)
const error = ref('')

async function cargarEmpresa() {
  loading.value = true
  error.value = ''
  try {
    empresa.value = await $api<EmpresaDto>(`/admin/empresas/${empresaId.value}`)
  }
  catch (e: any) {
    error.value = apiErrorMessage(e, 'No se pudo cargar la empresa')
  }
  finally {
    loading.value = false
  }
}

onMounted(cargarEmpresa)
</script>

<template>
  <div>
    <VBtn variant="text" prepend-icon="tabler-arrow-left" class="mb-4" :to="{ name: 'admin-empresas' }">
      Volver a empresas
    </VBtn>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </VAlert>

    <VSkeletonLoader v-if="loading" type="article" />

    <template v-else-if="empresa">
      <h4 class="text-h4 mb-1">
        Cuentas de correo — {{ empresa.nombre }}
      </h4>
      <p class="text-body-2 text-disabled mb-6">
        Código interno: {{ empresa.codigoInterno }}
      </p>

      <EmpresaEmailCuentasCard :endpoint="endpoint" />
    </template>
  </div>
</template>
