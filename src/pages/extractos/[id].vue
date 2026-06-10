<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto, RemesaDomiciliacionDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Detalle Extracto Bancario' } })

const route = useRoute()
const router = useRouter()
const id = computed(() => (route.params as { id: string }).id)

const extracto = ref<ExtractoBancarioDto | null>(null)
const movimientos = ref<ExtractoBancarioMovimientoDto[]>([])
const loading = ref(false)
const soloPendientes = ref(false)
const downloadLoading = ref(false)
const conceptLoadingIds = ref<number[]>([])
const remesaDialog = ref(false)
const remesaLoading = ref(false)
const remesaUploading = ref(false)
const currentRemesaMovimiento = ref<ExtractoBancarioMovimientoDto | null>(null)
const remesaLines = ref<RemesaDomiciliacionDto[]>([])
const remesaFile = ref<File | null>(null)

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function descargarExcel() {
  if (!extracto.value) return
  downloadLoading.value = true
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/extractos/${id.value}/excel`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!response.ok) {
      showMsg('No se pudo descargar el Excel', 'error')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = extracto.value.nombreFichero || `extracto-${id.value}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }
  catch {
    showMsg('No se pudo descargar el Excel', 'error')
  }
  finally {
    downloadLoading.value = false
  }
}

async function cargarMovimientos() {
  const endpoint = soloPendientes.value
    ? `/extractos/${id.value}/movimientos/pendientes`
    : `/extractos/${id.value}/movimientos`
  movimientos.value = await $api<ExtractoBancarioMovimientoDto[]>(endpoint)
}

watch(soloPendientes, cargarMovimientos)

async function toggleExcluido(mov: ExtractoBancarioMovimientoDto) {
  const nuevoValor = !mov.excluidoConciliacion
  try {
    const updated = await $api<ExtractoBancarioMovimientoDto>(
      `/extractos/${id.value}/movimientos/${mov.id}/excluir`,
      { method: 'PATCH', params: { excluido: nuevoValor } },
    )
    const idx = movimientos.value.findIndex(m => m.id === mov.id)
    if (idx >= 0) movimientos.value[idx] = updated
    showMsg(nuevoValor ? 'Movimiento excluido de conciliación' : 'Movimiento incluido en conciliación')
  }
  catch {
    showMsg('Error al actualizar el movimiento', 'error')
  }
}

async function marcarNoConciliable(mov: ExtractoBancarioMovimientoDto) {
  if (conceptLoadingIds.value.includes(mov.id)) return
  conceptLoadingIds.value.push(mov.id)
  try {
    const updated = await $api<ExtractoBancarioMovimientoDto>(
      `/extractos/${id.value}/movimientos/${mov.id}/concepto-no-conciliable`,
      { method: 'POST' },
    )
    const idx = movimientos.value.findIndex(m => m.id === mov.id)
    if (idx >= 0) movimientos.value[idx] = updated
    showMsg('Concepto añadido a la lista de no conciliables')
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo marcar como no conciliable', 'error')
  }
  finally {
    conceptLoadingIds.value = conceptLoadingIds.value.filter(id => id !== mov.id)
  }
}

function abrirRemesa(mov: ExtractoBancarioMovimientoDto) {
  currentRemesaMovimiento.value = mov
  remesaFile.value = null
  remesaLines.value = []
  remesaDialog.value = true
  cargarRemesa()
}

function onRemesaFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  remesaFile.value = target.files?.[0] ?? null
}

async function cargarRemesa() {
  if (!currentRemesaMovimiento.value) return
  remesaLoading.value = true
  try {
    remesaLines.value = await $api<RemesaDomiciliacionDto[]>(
      `/pagos/extractos/${id.value}/movimientos/${currentRemesaMovimiento.value.id}/remesa-q19`,
    )
  }
  finally {
    remesaLoading.value = false
  }
}

async function subirRemesa() {
  if (!currentRemesaMovimiento.value || !remesaFile.value) return
  remesaUploading.value = true
  try {
    const form = new FormData()
    form.append('ficheroQ19', remesaFile.value)
    await $api(`/pagos/extractos/${id.value}/movimientos/${currentRemesaMovimiento.value.id}/remesa-q19`, {
      method: 'POST',
      body: form,
    })
    await cargarRemesa()
    await cargarMovimientos()
    showMsg('Q19 importado correctamente')
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo importar el Q19', 'error')
  }
  finally {
    remesaUploading.value = false
  }
}

async function conciliarAutoRemesa() {
  if (!currentRemesaMovimiento.value) return
  remesaUploading.value = true
  try {
    const res = await $api<{ mensaje: string; conciliadas: number }>(
      `/pagos/extractos/${id.value}/movimientos/${currentRemesaMovimiento.value.id}/remesa-q19/conciliar-auto`,
      { method: 'POST' },
    )
    showMsg(res.mensaje)
    await cargarRemesa()
    await cargarMovimientos()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo conciliar automáticamente', 'error')
  }
  finally {
    remesaUploading.value = false
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatDateTime = (d?: string) => d ? `${d.substring(0, 10).split('-').reverse().join('-')} ${d.substring(11, 16)}` : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function estadoMovimiento(mov: ExtractoBancarioMovimientoDto) {
  if (mov.excluidoConciliacion) return { label: 'Excluido', color: 'default' }
  if (mov.conceptoNoConciliable) return { label: 'No conciliable', color: 'secondary' }
  if (mov.facturaProveedorId) return { label: 'Conciliado (factura)', color: 'success' }
  if (mov.pagoId) return { label: 'Conciliado (pago)', color: 'success' }
  return { label: 'Pendiente', color: 'warning' }
}

const importeColor = (n?: number) => {
  if (n == null) return ''
  return n >= 0 ? 'text-success' : 'text-error'
}

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(25)
watch(search, () => { page.value = 1 })

const headers = [
  { title: 'Fecha', key: 'fechaMovimiento', width: 150 },
  { title: 'Concepto', key: 'concepto', width: 500 },
  { title: 'Observaciones', key: 'observaciones', width: 400 },
  { title: 'Importe', key: 'importe', width: 120 },
  { title: 'Estado', key: 'estado', sortable: false, width: 170 },
  { title: 'Factura', key: 'facturaProveedorNumero', width: 110 },
  { title: 'Acciones', key: 'acciones', sortable: false, width: 150 },
  { title: 'Excluir', key: 'excluir', sortable: false, width: 50 },
]

onMounted(async () => {
  loading.value = true
  try {
    [extracto.value] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
    ])
    await cargarMovimientos()
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="d-flex justify-center pa-8">
    <VProgressCircular indeterminate />
  </div>

  <div v-else-if="extracto">
    <!-- Cabecera -->
    <div class="d-flex align-center gap-3 mb-4">
      <VBtn icon variant="text" @click="router.push('/extractos')">
        <VIcon icon="tabler-arrow-left" />
      </VBtn>
      <div class="flex-grow-1">
        <h5 class="text-h5">{{ extracto.banco ?? 'Extracto' }} — {{ extracto.nombreFichero }}</h5>
        <span class="text-body-2 text-disabled">
          Subido: {{ formatDateTime(extracto.fechaSubida) }}
          &nbsp;·&nbsp;
          Periodo: {{ formatDate(extracto.fechaInicioMovimientos) }} → {{ formatDate(extracto.fechaFinMovimientos) }}
        </span>
      </div>
      <VBtn
        v-if="extracto.nombreFichero"
        variant="tonal"
        :loading="downloadLoading"
        @click="descargarExcel"
      >
        Descargar Excel
      </VBtn>
    </div>

    <!-- Movimientos -->
    <VCard>
      <VCardItem>
        <VCardTitle>Movimientos</VCardTitle>
        <template #append>
          <div class="d-flex align-center gap-4">
            <span class="text-body-2 text-disabled">{{ movimientos.length }} movimientos</span>
            <VSwitch
              v-model="soloPendientes"
              label="Solo pendientes"
              color="warning"
              density="compact"
              hide-details
            />
          </div>
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
        :items="movimientos"
        :search="search"
        item-value="id"
        hover
        density="compact"
      >
        <template #item.fechaMovimiento="{ item }">{{ formatDate(item.fechaMovimiento) }}</template>

        <template #item.importe="{ item }">
          <span :class="importeColor(item.importe)">
            {{ formatMoney(item.importe) }}
          </span>
        </template>

        <template #item.estado="{ item }">
          <VChip
            :color="estadoMovimiento(item).color"
            size="small"
            label
          >
            {{ estadoMovimiento(item).label }}
          </VChip>
        </template>

        <template #item.facturaProveedorNumero="{ item }">
          <VBtn
            v-if="item.facturaProveedorId"
            variant="text"
            size="small"
            :to="`/facturas/${item.facturaProveedorId}`"
            @click.stop
          >
            {{ item.facturaProveedorNumero ?? `#${item.facturaProveedorId}` }}
          </VBtn>
          <span v-else class="text-disabled">—</span>
        </template>

        <template #item.acciones="{ item }">
          <div class="d-flex gap-2 flex-wrap">
            <VBtn
              variant="text"
              size="small"
              :loading="conceptLoadingIds.includes(item.id)"
              @click="marcarNoConciliable(item)"
            >
              No conciliable
            </VBtn>
            <VBtn
              v-if="item.concepto?.toUpperCase().includes('REMESA') || item.concepto?.toUpperCase().includes('RECIBO')"
              variant="text"
              size="small"
              @click="abrirRemesa(item)"
            >
              Remesa / Q19
            </VBtn>
          </div>
        </template>

        <template #item.excluir="{ item }">
          <VTooltip
            :text="item.excluidoConciliacion ? 'Incluir en conciliación' : 'Excluir de conciliación'"
            location="top"
          >
            <template #activator="{ props }">
              <VSwitch
                v-bind="props"
                :model-value="item.excluidoConciliacion"
                color="error"
                density="compact"
                hide-details
                @update:model-value="toggleExcluido(item)"
                @click.stop
              />
            </template>
          </VTooltip>
        </template>
        <template #bottom="{ pageCount }">
          <VDivider />
          <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 px-6 py-3">
            <div class="d-flex align-center gap-2">
              <span class="text-disabled text-body-2">Filas por página:</span>
              <AppSelect v-model="itemsPerPage" :items="[25, 50, 100, 250, { title: 'Todos', value: -1 }]" density="compact" style="width: 90px" />
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

  <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
    {{ snackbarMsg }}
  </VSnackbar>

  <VDialog v-model="remesaDialog" max-width="1100">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Remesa / Q19</span>
        <DialogCloseBtn @click="remesaDialog = false" />
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="4">
            <div class="d-flex flex-column gap-2">
              <label class="text-body-2">Fichero Q19</label>
              <input type="file" @change="onRemesaFileChange">
            </div>
          </VCol>
          <VCol cols="12" md="8" class="d-flex align-end gap-2 justify-end">
            <VBtn variant="tonal" :loading="remesaLoading" @click="cargarRemesa">Recargar</VBtn>
            <VBtn :loading="remesaUploading" @click="subirRemesa">Importar Q19</VBtn>
            <VBtn color="primary" :loading="remesaUploading" @click="conciliarAutoRemesa">Conciliar automático</VBtn>
          </VCol>
        </VRow>

        <VDataTable
          :headers="[
            { title: 'Orden', key: 'ordenLinea', width: 80 },
            { title: 'CIF', key: 'cifDeudor', width: 120 },
            { title: 'Deudor', key: 'nombreDeudor' },
            { title: 'Importe', key: 'importe', width: 110 },
            { title: 'Factura', key: 'numeroFacturaQ19', width: 120 },
            { title: 'Vinculada', key: 'facturaEmitidaId', width: 100 },
          ]"
          :items="remesaLines"
          :loading="remesaLoading"
          density="compact"
          class="mt-4"
        >
          <template #item.importe="{ item }">{{ formatMoney(item.importe) }}</template>
          <template #item.facturaEmitidaId="{ item }">
            <span v-if="item.facturaEmitidaId">#{{ item.facturaEmitidaId }}</span>
            <span v-else class="text-disabled">—</span>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>
  </VDialog>
</template>
