<script setup lang="ts">
import type { EntidadDto, FacturaFiltrosRequest, FacturaProveedorDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Facturas Proveedores' } })

const router = useRouter()
const facturas = ref<FacturaProveedorDto[]>([])
const entidades = ref<EntidadDto[]>([])
const loading = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')
const recalculandoIncidencias = ref(false)
const filtrosStorageKey = 'programafacturas.facturas.filtros'
const itemsPerPageStorageKey = 'programafacturas.facturas.itemsPerPage'
const page = ref(1)
const itemsPerPage = ref(25)
const totalItems = ref(0)
const itemsPerPageOptions = [10, 25, 50, 100, 250, 500, 1000]
const selectedFacturaIds = ref<number[]>([])

// ─── Filtros ──────────────────────────────────────────────────────────────────
const filtros = ref<FacturaFiltrosRequest>({})
const busquedaLista = ref('')

// Sección del buscador desplegada o no
const expandFiltros = ref(false)

const estadosOptions = [
  { title: 'Todos', value: '' },
  { title: 'Pendiente de revisión', value: 'PENDIENTE_REVISION' },
  { title: 'Solicitada factura', value: 'SOLICITADA_FACTURA' },
  { title: 'Validada', value: 'VALIDADA' },
  { title: 'Pagada', value: 'PAGADA' },
]

const tiposOptions = [
  { title: 'Todos', value: '' },
  { title: 'Ticket', value: 'TICKET' },
  { title: 'Factura', value: 'FACTURA' },
  { title: 'Proforma', value: 'PROFORMA' },
  { title: 'Indeterminada', value: 'INDETERMINADA' },
]

const tiposFiscalOptions = [
  { title: 'Todos', value: '' },
  { title: 'Ordinaria', value: 'ORDINARIA' },
  { title: 'Simplificada', value: 'SIMPLIFICADA' },
  { title: 'Intracomunitaria', value: 'INTRACOMUNITARIA' },
  { title: 'Importación', value: 'IMPORTACION' },
  { title: 'Servicios exterior', value: 'SERVICIOS_EXTERIOR' },
  { title: 'Permuta', value: 'PERMUTA' },
]

const estadoColor: Record<string, string> = {
  PENDIENTE_REVISION: 'warning',
  SOLICITADA_FACTURA: 'info',
  VALIDADA: 'success',
  PAGADA: 'primary',
}

const estadoLabel: Record<string, string> = {
  PENDIENTE_REVISION: 'Pendiente revisión',
  SOLICITADA_FACTURA: 'Solicitada',
  VALIDADA: 'Validada',
  PAGADA: 'Pagada',
}

const tipoColor: Record<string, string> = {
  TICKET: 'secondary',
  FACTURA: 'primary',
  PROFORMA: 'info',
  INDETERMINADA: 'warning',
}

function sanitizarFiltros(input: FacturaFiltrosRequest): FacturaFiltrosRequest {
  const out: FacturaFiltrosRequest = { ...input }
  Object.keys(out).forEach(k => {
    const key = k as keyof FacturaFiltrosRequest
    if (out[key] === '' || out[key] === null)
      delete out[key]
  })
  return out
}

function guardarFiltros() {
  localStorage.setItem(filtrosStorageKey, JSON.stringify(filtros.value))
}

function guardarItemsPerPage() {
  localStorage.setItem(itemsPerPageStorageKey, String(itemsPerPage.value))
}

function cargarFiltrosGuardados() {
  const raw = localStorage.getItem(filtrosStorageKey)
  if (!raw) return
  try {
    filtros.value = JSON.parse(raw) as FacturaFiltrosRequest
  }
  catch {
    localStorage.removeItem(filtrosStorageKey)
  }
}

function cargarItemsPerPageGuardado() {
  const raw = localStorage.getItem(itemsPerPageStorageKey)
  if (!raw) return
  const n = Number(raw)
  if (itemsPerPageOptions.includes(n)) {
    itemsPerPage.value = n
  }
}

// ─── Quick filters ────────────────────────────────────────────────────────────
function aplicarFiltroRapidoTipo(tipo: string) {
  filtros.value = { ...filtros.value, tipo: tipo || undefined }
  buscar()
}

function aplicarFiltroRapido(patch: Partial<FacturaFiltrosRequest>) {
  filtros.value = { ...filtros.value, ...patch }
  buscar()
}

// ─── Búsqueda ─────────────────────────────────────────────────────────────────
async function buscar() {
  loading.value = true
  try {
    const body = sanitizarFiltros(filtros.value)
    busquedaLista.value = JSON.stringify(body)
    guardarFiltros()
    guardarItemsPerPage()
    const response = await $api<{ content: FacturaProveedorDto[]; page: number; size: number; totalElements: number }>('/facturas', {
      query: {
        ...body,
        page: page.value - 1,
        size: itemsPerPage.value,
      },
    })
    facturas.value = response.content
    totalItems.value = response.totalElements
  }
  catch (e) {
    console.error(e)
    showMsg('No se pudo cargar el listado', 'error')
  }
  finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtros.value = {}
  localStorage.removeItem(filtrosStorageKey)
  page.value = 1
  buscar()
}

function cambiarItemsPerPage(nuevoValor: number) {
  itemsPerPage.value = nuevoValor
  page.value = 1
  buscar()
}

// ─── Totales ──────────────────────────────────────────────────────────────────
const totalImporte = computed(() => facturas.value.reduce((s, f) => s + (f.importeTotal ?? 0), 0))
const totalBase = computed(() => facturas.value.reduce((s, f) => s + (f.baseImponible ?? 0), 0))
const totalIva = computed(() => facturas.value.reduce((s, f) => s + (f.iva ?? 0), 0))

// ─── Formato ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toFixed(2)} €`

// ─── Entidades select ─────────────────────────────────────────────────────────
const entidadesItems = computed(() =>
  [{ title: 'Todas', value: '' }, ...entidades.value.map(e => ({ title: e.nombre, value: String(e.id) }))]
)

// ─── Tabla ────────────────────────────────────────────────────────────────────
const headers = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'Tipo', key: 'tipo', width: 110 },
  { title: 'Fecha', key: 'fechaFactura', width: 100 },
  { title: 'Proveedor', key: 'proveedorFacturaNombre' },
  { title: 'Entidad', key: 'entidadNombre', width: 130 },
  { title: 'Nº Factura', key: 'numeroFactura', width: 120 },
  { title: 'Base', key: 'baseImponible', width: 100 },
  { title: 'IVA', key: 'iva', width: 90 },
  { title: 'Total', key: 'importeTotal', width: 110 },
  { title: 'Estado', key: 'estado', width: 140 },
  { title: '', key: 'actions', sortable: false, width: 60 },
]

// ─── Export ───────────────────────────────────────────────────────────────────
const exportLoading = ref(false)
const showExportDialog = ref(false)
const exportFormat = ref('excel')
const marcarContabilidad = ref(false)
const procesandoCarpeta = ref(false)
const exportMenu = ref(false)
const accionesMenu = ref(false)

const selectedFacturaIdsSet = computed(() => new Set(selectedFacturaIds.value))
const selectedFacturasEnPagina = computed(() => facturas.value.filter(f => selectedFacturaIdsSet.value.has(f.id)))
const allVisibleSelected = computed(() => facturas.value.length > 0 && facturas.value.every(f => selectedFacturaIdsSet.value.has(f.id)))
const someVisibleSelected = computed(() => facturas.value.some(f => selectedFacturaIdsSet.value.has(f.id)) && !allVisibleSelected.value)

function toggleFacturaSeleccionada(id: number, checked: boolean) {
  const next = new Set(selectedFacturaIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedFacturaIds.value = [...next]
}

function toggleSeleccionPagina(checked: boolean) {
  const next = new Set(selectedFacturaIds.value)
  facturas.value.forEach(f => {
    if (checked) next.add(f.id)
    else next.delete(f.id)
  })
  selectedFacturaIds.value = [...next]
}

function limpiarSeleccion() {
  selectedFacturaIds.value = []
}

async function exportar(format: string, marcar = false) {
  exportLoading.value = true
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const body = {
      filtros: sanitizarFiltros(filtros.value),
      format,
      marcarExportacionContabilidad: marcar,
    }
    const response = await fetch(`${baseUrl}/facturas/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      showMsg('Error al exportar', 'error')
      return
    }
    const blob = await response.blob()
    const ext = format.startsWith('excel') ? 'xlsx' : 'csv'
    const filename = format === 'excel_fiscal' ? 'facturas-fiscal.xlsx'
      : format === 'excel_tickets' ? 'tickets-contable.xlsx'
      : format === 'csv' ? 'facturas.csv'
      : 'facturas.xlsx'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    if (marcar)
      showMsg('Exportación completada y marcada en contabilidad', 'success')
    else
      showMsg('Exportación completada', 'success')
  }
  catch {
    showMsg('Error al exportar', 'error')
  }
  finally {
    exportLoading.value = false
    showExportDialog.value = false
  }
}

// ─── Recalcular incidencias ───────────────────────────────────────────────────
async function recalcularIncidencias() {
  recalculandoIncidencias.value = true
  try {
    const result = await $api<{ procesadas: number; mensaje: string }>('/facturas/recalcular-incidencias', { method: 'POST' })
    showMsg(result.mensaje, 'success')
    await buscar()
  }
  catch {
    showMsg('Error al recalcular incidencias', 'error')
  }
  finally {
    recalculandoIncidencias.value = false
  }
}

async function procesarCarpeta() {
  procesandoCarpeta.value = true
  try {
    const result = await $api<{ ok: boolean; mensaje: string; facturasInsertadas?: number; documentosEncontrados?: number; errores?: number }>(
      '/facturas/procesar-carpeta-json',
      { method: 'POST' },
    )
    showMsg(result.mensaje, 'success')
    await buscar()
  }
  catch (e) {
    console.error(e)
    showMsg('No se pudo procesar la carpeta', 'error')
  }
  finally {
    procesandoCarpeta.value = false
  }
}

async function reprocesarIaSeleccion() {
  if (!selectedFacturaIds.value.length) return
  loading.value = true
  try {
    const result = await $api<{ ok: boolean; procesadas: number; errores: number; mensajesError?: string[]; mensaje: string }>('/facturas/reprocesar-ia', {
      method: 'POST',
      body: { ids: selectedFacturaIds.value },
    })
    showMsg(result.mensaje, 'success')
    if (result.mensajesError?.length)
      console.warn('Errores reproceso IA', result.mensajesError)
    limpiarSeleccion()
    await buscar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo reprocesar con IA', 'error')
  }
  finally {
    loading.value = false
  }
}

function showMsg(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(async () => {
  entidades.value = await $api<EntidadDto[]>('/entidades?todas=true')
  cargarItemsPerPageGuardado()
  cargarFiltrosGuardados()
  await buscar()
})

function cambiarPagina(nuevaPagina: number) {
  page.value = nuevaPagina
  buscar()
}
</script>

<template>
  <div>
    <!-- Quick filter chips -->
    <VCard class="mb-3">
      <VCardText class="py-3">
        <div class="d-flex flex-wrap gap-2 align-center">
          <span class="text-body-2 text-disabled me-1">Tipo rápido:</span>
          <VChip
            size="small"
            :variant="!filtros.tipo ? 'elevated' : 'tonal'"
            color="primary"
            @click="aplicarFiltroRapidoTipo('')"
          >Todos</VChip>
          <VChip
            size="small"
            :variant="filtros.tipo === 'TICKET' ? 'elevated' : 'tonal'"
            color="secondary"
            @click="aplicarFiltroRapidoTipo('TICKET')"
          >Tickets</VChip>
          <VChip
            size="small"
            :variant="filtros.tipo === 'FACTURA' ? 'elevated' : 'tonal'"
            color="primary"
            @click="aplicarFiltroRapidoTipo('FACTURA')"
          >Facturas</VChip>
          <VChip
            size="small"
            :variant="filtros.tipo === 'PROFORMA' ? 'elevated' : 'tonal'"
            color="info"
            @click="aplicarFiltroRapidoTipo('PROFORMA')"
          >Proformas</VChip>
          <VChip
            size="small"
            :variant="filtros.tipo === 'INDETERMINADA' ? 'elevated' : 'tonal'"
            color="warning"
            @click="aplicarFiltroRapidoTipo('INDETERMINADA')"
          >Indeterminadas</VChip>

          <VDivider vertical class="mx-1" />

          <VChip
            size="small"
            :variant="filtros.soloConIncidencias ? 'elevated' : 'tonal'"
            color="error"
            @click="aplicarFiltroRapido({ soloConIncidencias: !filtros.soloConIncidencias })"
          >
            <VIcon start icon="tabler-alert-triangle" size="14" />
            Con incidencias
          </VChip>
          <VChip
            size="small"
            :variant="filtros.contabilidadExportada === false ? 'elevated' : 'tonal'"
            color="warning"
            @click="aplicarFiltroRapido({ contabilidadExportada: filtros.contabilidadExportada === false ? undefined : false })"
          >
            <VIcon start icon="tabler-clock" size="14" />
            Pend. export. contab.
          </VChip>
          <VChip
            size="small"
            :variant="filtros.contabilidadExportada === true ? 'elevated' : 'tonal'"
            color="success"
            @click="aplicarFiltroRapido({ contabilidadExportada: filtros.contabilidadExportada === true ? undefined : true })"
          >
            <VIcon start icon="tabler-check" size="14" />
            Exportadas contab.
          </VChip>

          <VSpacer />

          <!-- Acciones admin 
          <VBtn
            size="small"
            variant="tonal"
            color="warning"
            :loading="recalculandoIncidencias"
            prepend-icon="tabler-refresh"
            @click="recalcularIncidencias"
          >Recalcular incidencias</VBtn>
          <VBtn
            size="small"
            variant="tonal"
            color="primary"
            class="ms-2"
            :loading="procesandoCarpeta"
            prepend-icon="tabler-folder"
            @click="procesarCarpeta"
          >Procesar carpeta</VBtn>
          <VBtn
            to="/facturas/conciliacion-extracto-importe"
            size="small"
            variant="tonal"
            color="success"
            class="ms-2"
            prepend-icon="tabler-arrows-exchange"
          >Conciliar por importe</VBtn>
          -->
        </div>
      </VCardText>
    </VCard>

    <!-- Filtros avanzados -->
    <VCard class="mb-4">
      <VCardItem
        class="cursor-pointer"
        @click="expandFiltros = !expandFiltros"
      >
        <VCardTitle>
          <VIcon :icon="expandFiltros ? 'tabler-chevron-up' : 'tabler-chevron-down'" class="me-2" />
          Filtros avanzados
        </VCardTitle>
        <template #append>
          <VBtn size="small" variant="tonal" @click.stop="limpiarFiltros">Limpiar</VBtn>
          <VBtn size="small" :loading="loading" class="ms-2" @click.stop="buscar">Buscar</VBtn>
        </template>
      </VCardItem>

      <VExpandTransition>
        <div v-show="expandFiltros">
          <VCardText>
            <VRow dense>
              <!-- Fecha factura -->
              <VCol cols="12" class="text-overline text-disabled pb-0">Fecha factura</VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaDesde" label="Fecha desde" type="date" clearable density="compact" />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaHasta" label="Fecha hasta" type="date" clearable density="compact" />
              </VCol>

              <!-- Fecha petición -->
              <VCol cols="12" class="text-overline text-disabled pb-0">Fecha petición</VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaPeticionDesde" label="Petición desde" type="date" clearable density="compact" />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaPeticionHasta" label="Petición hasta" type="date" clearable density="compact" />
              </VCol>

              <!-- Fecha creación -->
              <VCol cols="12" class="text-overline text-disabled pb-0">Fecha creación en sistema</VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaCreacionDesde" label="Creación desde" type="date" clearable density="compact" />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <AppTextField v-model="filtros.fechaCreacionHasta" label="Creación hasta" type="date" clearable density="compact" />
              </VCol>

              <VCol cols="12" sm="6" md="3">
                <AppSelect
                  v-model="filtros.preset"
                  label="Preset factura"
                  :items="[
                    { title: 'Todos', value: null },
                    { title: 'Mes', value: 'mes' },
                    { title: 'Trimestre', value: 'trimestre' },
                  ]"
                  clearable
                  density="compact"
                />
              </VCol>

              <VCol cols="12" sm="6" md="3">
                <AppSelect
                  v-model="filtros.presetCreacion"
                  label="Preset creación"
                  :items="[
                    { title: 'Todos', value: null },
                    { title: 'Hoy', value: 'hoy' },
                    { title: 'Ayer', value: 'ayer' },
                    { title: 'Semana', value: 'semana' },
                  ]"
                  clearable
                  density="compact"
                />
              </VCol>

              <VCol cols="12" class="text-overline text-disabled pb-0">Datos de la factura</VCol>

              <!-- Proveedor -->
              <VCol cols="12" sm="6" md="4">
                <AppTextField v-model="filtros.proveedorNombre" label="Proveedor (contiene)" clearable density="compact" />
              </VCol>

              <!-- Entidad -->
              <VCol cols="12" sm="6" md="4">
                <AppSelect
                  v-model="filtros.entidadId"
                  label="Entidad"
                  :items="entidadesItems"
                  clearable
                  density="compact"
                />
              </VCol>

              <!-- Tipo -->
              <VCol cols="12" sm="6" md="4">
                <AppSelect v-model="filtros.tipo" label="Tipo" :items="tiposOptions" clearable density="compact" />
              </VCol>

              <!-- Tipo fiscal -->
              <VCol cols="12" sm="6" md="4">
                <AppSelect v-model="filtros.tipoFiscal" label="Tipo fiscal" :items="tiposFiscalOptions" clearable density="compact" />
              </VCol>

              <!-- Estado -->
              <VCol cols="12" sm="6" md="4">
                <AppSelect v-model="filtros.estado" label="Estado" :items="estadosOptions" clearable density="compact" />
              </VCol>

              <!-- Importe min/max -->
              <VCol cols="6" md="2">
                <AppTextField v-model.number="filtros.importeMin" label="Importe mín." type="number" clearable density="compact" />
              </VCol>
              <VCol cols="6" md="2">
                <AppTextField v-model.number="filtros.importeMax" label="Importe máx." type="number" clearable density="compact" />
              </VCol>

              <!-- Otros filtros -->
              <VCol cols="12" class="text-overline text-disabled pb-0">Otros filtros</VCol>
              <VCol cols="12" sm="6" md="3" class="d-flex align-center">
                <VSwitch v-model="filtros.soloConIncidencias" label="Solo con incidencias" color="warning" density="compact" hide-details />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <AppSelect
                  v-model="filtros.contabilidadExportada"
                  label="Export. contabilidad"
                  :items="[
                    { title: 'Todas', value: null },
                    { title: 'Sí exportadas', value: true },
                    { title: 'Pendientes', value: false },
                  ]"
                  clearable
                  density="compact"
                />
              </VCol>

              <VCol cols="12" sm="6" md="3">
                <AppSelect
                  v-model="filtros.conciliadaConExtracto"
                  label="Extracto bancario"
                  :items="[
                    { title: 'Todos', value: null },
                    { title: 'Con extracto', value: true },
                    { title: 'Sin extracto', value: false },
                  ]"
                  clearable
                  density="compact"
                />
              </VCol>

              <VCol cols="12" class="d-flex gap-2 mt-1">
                <VBtn :loading="loading" prepend-icon="tabler-search" @click="buscar">Buscar</VBtn>
                <VBtn variant="tonal" prepend-icon="tabler-x" @click="limpiarFiltros">Limpiar</VBtn>
              </VCol>
            </VRow>
          </VCardText>
        </div>
      </VExpandTransition>
    </VCard>

    <!-- Resultados -->
    <VCard>
      <VCardItem>
        <VCardTitle>Facturas Proveedores</VCardTitle>
        <template #append>
          <span class="text-body-2 text-disabled me-3">{{ facturas.length }} resultados</span>
          <VBtn
            size="small"
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-sparkles"
            class="me-1"
            :disabled="!selectedFacturaIds.length"
            @click="reprocesarIaSeleccion"
          >Reanalizar con IA</VBtn>
          <VMenu v-model="accionesMenu" location="bottom end">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="tabler-dots-vertical"
                class="me-1"
              >Acciones</VBtn>
            </template>
            <VList density="compact" min-width="220">
              <VListItem
                prepend-icon="tabler-upload"
                title="Subir ticket"
                @click="router.push('/facturas/subir-ticket')"
              />
              <VListItem
                prepend-icon="tabler-sparkles"
                title="Reanalizar con IA"
                :disabled="!selectedFacturaIds.length"
                @click="reprocesarIaSeleccion"
              />
              <VListItem
                prepend-icon="tabler-refresh"
                title="Recalcular incidencias"
                :disabled="recalculandoIncidencias"
                @click="recalcularIncidencias"
              />
              <VListItem
                prepend-icon="tabler-folder"
                title="Procesar carpeta"
                :disabled="procesandoCarpeta"
                @click="procesarCarpeta"
              />
              <VListItem
                prepend-icon="tabler-arrows-exchange"
                title="Conciliar por importe"
                to="/facturas/conciliacion-extracto-importe"
              />
            </VList>
          </VMenu>

          <VMenu v-model="exportMenu" location="bottom end">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                size="small"
                variant="tonal"
                color="success"
                prepend-icon="tabler-table-export"
                :loading="exportLoading"
              >Exportar</VBtn>
            </template>
            <VList density="compact" min-width="240">
              <VListItem prepend-icon="tabler-table-export" title="Excel" @click="exportar('excel')" />
              <VListItem prepend-icon="tabler-receipt-tax" title="Excel fiscal" @click="exportar('excel_fiscal')" />
              <VListItem prepend-icon="tabler-receipt" title="Tickets contable" @click="exportar('excel_tickets')" />
              <VListItem prepend-icon="tabler-file-check" title="Export. contabilidad" @click="showExportDialog = true" />
            </VList>
          </VMenu>
        </template>
      </VCardItem>

      <VDataTable
        :headers="headers"
        :items="facturas"
        :loading="loading"
        item-value="id"
        show-select
        hover
        @click:row="(_: any, { item }: any) => router.push({ path: `/facturas/${item.id}`, query: { q: busquedaLista } })"
      >
        <template #header.data-table-select>
          <VCheckboxBtn
            :model-value="allVisibleSelected"
            :indeterminate="someVisibleSelected"
            @update:model-value="(value: boolean) => toggleSeleccionPagina(value)"
          />
        </template>
        <template #item.data-table-select="{ item }">
          <VCheckboxBtn
            :model-value="selectedFacturaIdsSet.has(item.id)"
            @click.stop
            @update:model-value="(value: boolean) => toggleFacturaSeleccionada(item.id, value)"
          />
        </template>
        <template #item.tipo="{ item }">
          <VChip
            v-if="item.tipo"
            :color="tipoColor[item.tipo] ?? 'default'"
            size="x-small"
            label
          >{{ item.tipo }}</VChip>
        </template>
        <template #item.fechaFactura="{ item }">{{ formatDate(item.fechaFactura) }}</template>
        <template #item.baseImponible="{ item }">{{ formatMoney(item.baseImponible) }}</template>
        <template #item.iva="{ item }">{{ formatMoney(item.iva) }}</template>
        <template #item.importeTotal="{ item }">{{ formatMoney(item.importeTotal) }}</template>
        <template #item.estado="{ item }">
          <VChip
            v-if="item.estado"
            :color="estadoColor[item.estado] ?? 'default'"
            size="small"
            label
          >
            {{ estadoLabel[item.estado] ?? item.estado }}
          </VChip>
        </template>
        <template #item.proveedorFacturaNombre="{ item }">
          <span>{{ item.proveedorFacturaNombre ?? '—' }}</span>
          <VTooltip v-if="item.incidencias" location="top">
            <template #activator="{ props }">
              <VIcon v-bind="props" icon="tabler-alert-triangle" size="14" color="warning" class="ms-1" />
            </template>
            <span>{{ item.incidencias }}</span>
          </VTooltip>
          <VIcon v-if="item.rutaPdf" icon="tabler-file-type-pdf" size="14" color="error" class="ms-1" />
        </template>
        <template #item.actions="{ item }">
          <IconBtn size="small" @click.stop="router.push({ path: `/facturas/${item.id}`, query: { q: busquedaLista } })">
            <VIcon icon="tabler-eye" />
          </IconBtn>
        </template>

        <!-- Totals footer -->
        <template #bottom>
          <div class="v-data-table__tr v-data-table__tr--body pa-2 d-flex justify-end gap-6 text-body-2 font-weight-bold border-t">
            <span>{{ facturas.length }} facturas</span>
            <span>Base: {{ formatMoney(totalBase) }}</span>
            <span>IVA: {{ formatMoney(totalIva) }}</span>
            <span class="text-primary">Total: {{ formatMoney(totalImporte) }}</span>
          </div>
        </template>
      </VDataTable>

      <div class="d-flex justify-end align-center gap-4 px-4 pb-2 pt-4 flex-wrap">
        <span class="text-body-2 text-disabled">Filas por página</span>
        <AppSelect
          :model-value="itemsPerPage"
          :items="itemsPerPageOptions.map(value => ({ title: String(value), value }))"
          density="compact"
          style="max-width: 110px"
          @update:model-value="(value: number | string | null) => cambiarItemsPerPage(Number(value))"
        />
      </div>

      <TablePagination
        :page="page"
        :items-per-page="itemsPerPage"
        :total-items="totalItems"
        @update:page="cambiarPagina"
      />
    </VCard>

    <!-- Leyenda de estados -->
    <VCard class="mt-3">
      <VCardText class="py-2">
        <span class="text-overline text-disabled me-3">Leyenda:</span>
        <VChip size="small" color="warning" label class="me-2">Pendiente revisión</VChip>
        <VChip size="small" color="info" label class="me-2">Solicitada factura</VChip>
        <VChip size="small" color="success" label class="me-2">Validada</VChip>
        <VChip size="small" color="primary" label class="me-2">Pagada</VChip>
        <VIcon icon="tabler-alert-triangle" size="16" color="warning" class="ms-2 me-1" />
        <span class="text-body-2 me-3">Con incidencias</span>
        <VIcon icon="tabler-file-type-pdf" size="16" color="error" class="me-1" />
        <span class="text-body-2">Con PDF</span>
      </VCardText>
    </VCard>

    <!-- Dialog exportar con marcar contabilidad -->
    <VDialog v-model="showExportDialog" max-width="420">
      <VCard>
        <VCardTitle class="pa-4">Exportar a contabilidad</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-4">
            Descarga el Excel con los filtros actuales y opcionalmente marca las facturas como exportadas a contabilidad.
          </p>
          <AppSelect
            v-model="exportFormat"
            label="Formato"
            :items="[
              { title: 'Excel lista general', value: 'excel' },
              { title: 'Excel fiscal', value: 'excel_fiscal' },
              { title: 'Excel tickets contable', value: 'excel_tickets' },
            ]"
          />
          <VSwitch
            v-model="marcarContabilidad"
            label="Marcar como exportadas a contabilidad"
            color="warning"
            class="mt-3"
          />
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="tonal" @click="showExportDialog = false">Cancelar</VBtn>
          <VBtn color="success" :loading="exportLoading" @click="exportar(exportFormat, marcarContabilidad)">
            Descargar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMsg }}
    </VSnackbar>
  </div>
</template>

