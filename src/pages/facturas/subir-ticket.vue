<script setup lang="ts">
import type { EntidadDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Subir Ticket' } })

const router = useRouter()
const entidades = ref<EntidadDto[]>([])
const entidadId = ref<number | null>(null)
const fichero = ref<File | null>(null)
const subiendo = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const entidadesItems = computed(() => entidades.value.map(e => ({ title: e.nombre, value: e.id })))

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  fichero.value = target.files?.[0] ?? null
}

async function subir() {
  if (!entidadId.value) {
    showMsg('Selecciona una entidad', 'error')
    return
  }
  if (!fichero.value) {
    showMsg('Selecciona un archivo', 'error')
    return
  }

  subiendo.value = true
  try {
    const form = new FormData()
    form.append('entidadId', String(entidadId.value))
    form.append('fichero', fichero.value)
    const result = await $api<{ ok: boolean; mensaje: string; id?: number }>('/facturas/subir-ticket', {
      method: 'POST',
      body: form,
    })
    showMsg(result.mensaje, 'success')
    if (result.id) {
      router.push(`/facturas/${result.id}`)
    } else {
      router.push('/facturas')
    }
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo subir el ticket', 'error')
  }
  finally {
    subiendo.value = false
  }
}

onMounted(async () => {
  entidades.value = await $api<EntidadDto[]>('/entidades?todas=true')
})
</script>

<template>
  <VCard>
    <VCardTitle class="pa-4">Subir ticket / factura</VCardTitle>
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <AppSelect v-model="entidadId" :items="entidadesItems" label="Entidad" clearable />
        </VCol>
        <VCol cols="12" md="6">
          <div class="d-flex flex-column gap-2">
            <label class="text-body-2">Archivo PDF o imagen</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
              :disabled="subiendo"
              @change="onFileChange"
            >
          </div>
        </VCol>
      </VRow>

      <!-- Indicador de procesado con IA -->
      <div v-if="subiendo" class="mt-4">
        <VProgressLinear indeterminate color="primary" rounded />
        <p class="text-center text-body-2 mt-2 text-medium-emphasis">
          Estamos leyendo tu factura con IA...
        </p>
      </div>
    </VCardText>
    <VCardActions class="pa-4">
      <VBtn variant="tonal" :disabled="subiendo" @click="router.push('/facturas')">Cancelar</VBtn>
      <VSpacer />
      <VBtn color="primary" :loading="subiendo" :disabled="subiendo" @click="subir">Subir</VBtn>
    </VCardActions>
  </VCard>

  <VSnackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
    {{ snackbarMsg }}
  </VSnackbar>
</template>
