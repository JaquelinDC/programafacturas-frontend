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

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatDateTime = (d?: string) => d ? `${d.substring(0, 10).split('-').reverse().join('/')} ${d.substring(11, 16)}` : '—'

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
watch(search, () => { page.value = 1 })

const headers = [
  { title: 'ID', key: 'id', width: 60 },
  { title: 'Fecha subida', key: 'fechaSubida', width: 160 },
  { title: 'Banco', key: 'banco', width: 140 },
  { title: 'Período', key: 'periodo', sortable: false, width: 200 },
  { title: 'Movimientos', key: 'movimientosTotales', width: 120 },
  { title: 'Conciliación', key: 'conciliacion', sortable: false, width: 180 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 200 },
]

const downloadLoading = ref<number | null>(null)

async function descargarExtracto(item: ExtractoBancarioDto) {
  downloadLoading.value = item.id
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/extractos/${item.id}/excel`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.nombreFichero || `extracto_${item.id}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }
  finally {
    downloadLoading.value = null
  }
}

function abrirExtracto(id: number) {
  window.open(`/extractos/${id}`, `extracto_${id}`, 'width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no')
}

function conciliacionColor(item: ExtractoBancarioDto) {
  if (!item.movimientosTotales) return 'default'
  const pct = item.movimientosConciliados / item.movimientosTotales
  if (pct > 0.75) return 'success'
  if (pct >= 0.5) return 'warning'
  return 'error'
}

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
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="extractos"
        :search="search"
        :loading="loading"
        item-value="id"
      >
        <template #item.fechaSubida="{ item }">{{ formatDateTime(item.fechaSubida) }}</template>
        
        <template #item.periodo="{ item }">
          {{ formatDate(item.fechaInicioMovimientos) }} – {{ formatDate(item.fechaFinMovimientos) }}
        </template>
        <template #item.movimientosTotales="{ item }">
          <VChip size="small" variant="tonal" color="secondary">{{ item.movimientosTotales }}</VChip>
        </template>
        <template #item.conciliacion="{ item }">
          <VChip
            v-if="item.movimientosTotales > 0"
            size="small"
            variant="tonal"
            :color="conciliacionColor(item)"
          >
            {{ item.movimientosConciliados }} / {{ item.movimientosTotales }}
          </VChip>
          <span v-else class="text-disabled text-body-2">Sin conciliación</span>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex gap-1 align-center">
            <VBtn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="tabler-eye"
              @click="() => router.push(`/extractos/${item.id}`)"
            >
              Ver movimientos
            </VBtn>
            <VBtn
              size="small"
              variant="tonal"
              icon
              :loading="downloadLoading === item.id"
              @click.stop="descargarExtracto(item)"
            >
              <VIcon icon="tabler-download" />
              <VTooltip activator="parent">Descargar Excel</VTooltip>
            </VBtn>
          </div>
        </template>
        <template #bottom="{ pageCount }">
          <VDivider />
          <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 px-6 py-3">
            <div class="d-flex align-center gap-2">
              <span class="text-disabled text-body-2">Filas por página:</span>
              <AppSelect v-model="itemsPerPage" :items="[10, 25, 50, 100, { title: 'Todos', value: -1 }]" density="compact" style="width: 90px" />
            </div>
            <VPagination
              v-if="pageCount > 1"
              v-model="page"
              active-color="primary"
              :length="pageCount"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(pageCount, 5)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
