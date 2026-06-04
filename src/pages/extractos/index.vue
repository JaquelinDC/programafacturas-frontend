<script setup lang="ts">
import type { ExtractoBancarioDto, ImportacionExtractoResponse } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Extractos Bancarios' } })

const router = useRouter()
const extractos = ref<ExtractoBancarioDto[]>([])
const loading = ref(false)
const uploadLoading = ref(false)
const uploadMsg = ref('')
const uploadError = ref('')
const uploadForm = ref({
  banco: '',
  fechaInicioMovimientos: '',
  fechaFinMovimientos: '',
  tipoExcelExtracto: 'BBVA_HISTORICO',
  excelExtracto: null as File | null,
})

const tipoExcelOptions = [
  { title: 'BBVA histórico', value: 'BBVA_HISTORICO' },
  { title: 'Cuenta operativa XLS', value: 'CUENTA_OPERATIVA_XLS' },
  { title: 'American Express actividad', value: 'AMERICAN_EXPRESS_ACTIVIDAD' },
  { title: 'Sabadell tarjeta crédito XLS', value: 'SABADELL_TARJETA_CREDITO_XLS' },
  { title: 'CSV movimientos', value: 'MOVIMIENTOS_CSV' },
]

async function cargar() {
  loading.value = true
  try {
    extractos.value = await $api<ExtractoBancarioDto[]>('/extractos')
  }
  finally {
    loading.value = false
  }
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  uploadForm.value.excelExtracto = target.files?.[0] ?? null
}

async function subirExtracto() {
  uploadError.value = ''
  uploadMsg.value = ''
  if (!uploadForm.value.banco.trim()) {
    uploadError.value = 'Indica el banco.'
    return
  }
  if (!uploadForm.value.fechaInicioMovimientos || !uploadForm.value.fechaFinMovimientos) {
    uploadError.value = 'Indica las fechas del extracto.'
    return
  }
  if (!uploadForm.value.excelExtracto) {
    uploadError.value = 'Selecciona un archivo.'
    return
  }

  uploadLoading.value = true
  try {
    const form = new FormData()
    form.append('banco', uploadForm.value.banco)
    form.append('fechaInicioMovimientos', uploadForm.value.fechaInicioMovimientos)
    form.append('fechaFinMovimientos', uploadForm.value.fechaFinMovimientos)
    form.append('tipoExcelExtracto', uploadForm.value.tipoExcelExtracto)
    form.append('excelExtracto', uploadForm.value.excelExtracto)
    const res = await $api<ImportacionExtractoResponse>('/extractos/subir', {
      method: 'POST',
      body: form,
    })
    uploadMsg.value = `${res.mensaje} Movimientos: ${res.movimientosGuardados}. Ignoradas: ${res.filasIgnoradas}.`
    await cargar()
    router.push(`/extractos/${res.extractoId}`)
  }
  catch (e: any) {
    uploadError.value = e?.data?.message || 'No se pudo importar el extracto'
  }
  finally {
    uploadLoading.value = false
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatDateTime = (d?: string) => d ? d.substring(0, 16).replace('T', ' ') : '—'

const search = ref('')

const headers = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'Banco', key: 'banco', width: 160 },
  { title: 'Fichero', key: 'nombreFichero' },
  { title: 'Desde', key: 'fechaInicioMovimientos', width: 110 },
  { title: 'Hasta', key: 'fechaFinMovimientos', width: 110 },
  { title: 'Subido', key: 'fechaSubida', width: 150 },
  { title: '', key: 'actions', sortable: false, width: 60 },
]

onMounted(cargar)
</script>

<template>
  <div>
    <VCard class="mb-4">
      <VCardItem>
        <VCardTitle>Subir extracto</VCardTitle>
      </VCardItem>
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <AppTextField v-model="uploadForm.banco" label="Banco" />
          </VCol>
          <VCol cols="12" md="4">
            <AppTextField v-model="uploadForm.fechaInicioMovimientos" label="Fecha inicio" type="date" />
          </VCol>
          <VCol cols="12" md="4">
            <AppTextField v-model="uploadForm.fechaFinMovimientos" label="Fecha fin" type="date" />
          </VCol>
          <VCol cols="12" md="6">
            <AppSelect v-model="uploadForm.tipoExcelExtracto" :items="tipoExcelOptions" label="Formato" />
          </VCol>
          <VCol cols="12" md="6">
            <div class="d-flex flex-column gap-2">
              <label class="text-body-2">Archivo Excel o CSV</label>
              <input type="file" @change="onFileChange">
            </div>
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="px-4 pb-4">
        <VBtn :loading="uploadLoading" @click="subirExtracto">Importar</VBtn>
        <span v-if="uploadMsg" class="text-success text-body-2">{{ uploadMsg }}</span>
        <span v-if="uploadError" class="text-error text-body-2">{{ uploadError }}</span>
      </VCardActions>
    </VCard>

    <VCard>
      <VCardItem>
        <VCardTitle>Extractos Bancarios</VCardTitle>
        <template #append>
          <VBtn variant="tonal" :loading="loading" @click="cargar">Actualizar</VBtn>
        </template>
      </VCardItem>

      <VCardText>
        <VRow>
          <VCol cols="12" offset-md="8" md="4">
            <AppTextField
              v-model="search"
              placeholder="Buscar..."
              append-inner-icon="tabler-search"
              single-line
              hide-details
              dense
              outlined
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDataTable
        :headers="headers"
        :items="extractos"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
        @click:row="(_: any, { item }: any) => router.push(`/extractos/${item.id}`)"
      >
        <template #item.fechaInicioMovimientos="{ item }">{{ formatDate(item.fechaInicioMovimientos) }}</template>
        <template #item.fechaFinMovimientos="{ item }">{{ formatDate(item.fechaFinMovimientos) }}</template>
        <template #item.fechaSubida="{ item }">{{ formatDateTime(item.fechaSubida) }}</template>
        <template #item.nombreFichero="{ item }">
          <div class="d-flex flex-column">
            <span>{{ item.nombreFichero }}</span>
            <small class="text-disabled">
              Conciliados {{ item.movimientosConciliados }}/{{ item.movimientosTotales }} movimientos
            </small>
          </div>
        </template>
        <template #item.actions="{ item }">
          <IconBtn size="small" @click.stop="router.push(`/extractos/${item.id}`)">
            <VIcon icon="tabler-eye" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
