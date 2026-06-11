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
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const tableReady = ref(false)
const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: '250', value: 250 },
  { title: '500', value: 500 },
  { title: '1000', value: 1000 },
  { title: 'Todos', value: -1 },
]
const selectedFacturaIds = ref<number[]>([])

// ─── Caché de páginas ─────────────────────────────────────────────────────────
const CACHE_TTL_MS = 2 * 60 * 1000
const MAX_CACHE_ENTRIES = 20
interface CacheEntry { content: FacturaProveedorDto[]; totalElements: number; ts: number }
const pageCache = new Map<string, CacheEntry>()

function buildCacheKey(body: FacturaFiltrosRequest, pg: number, sz: number, sort?: { key: string; order: string }) {
  return JSON.stringify({ ...body, page: pg, size: sz, ...(sort ? { sortBy: sort.key, sortDir: sort.order } : {}) })
}

function limpiarCache() {
  pageCache.clear()
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
const filtros = ref<FacturaFiltrosRequest>({})
const busquedaLista = ref('')
const search = ref('')

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
  if (itemsPerPageOptions.some(o => o.value === n))
    itemsPerPage.value = n
}

// ─── Quick filters ────────────────────────────────────────────────────────────
function aplicarFiltroRapidoTipo(tipo: string) {
  filtros.value = { ...filtros.value, tipo: tipo || undefined }
  page.value = 1
  buscar()
}

function aplicarFiltroRapido(patch: Partial<FacturaFiltrosRequest>) {
  filtros.value = { ...filtros.value, ...patch }
  page.value = 1
  buscar()
}

// ─── Búsqueda ─────────────────────────────────────────────────────────────────
async function buscar() {
  const body = sanitizarFiltros(filtros.value)
  busquedaLista.value = JSON.stringify(body)
  guardarFiltros()
  guardarItemsPerPage()
  const sort = sortBy.value[0]
  const pg = page.value - 1
  const sz = itemsPerPage.value === -1 ? 99999 : itemsPerPage.value
  const cacheKey = buildCacheKey(body, pg, sz, sort)

  const cached = pageCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    facturas.value = cached.content
    totalItems.value = cached.totalElements
    return
  }

  loading.value = true
  try {
    const response = await $api<{ content: FacturaProveedorDto[]; page: number; size: number; totalElements: number }>('/facturas', {
      query: { ...body, page: pg, size: sz, ...(sort ? { sortBy: sort.key, sortDir: sort.order } : {}) },
    })
    facturas.value = response.content
    totalItems.value = response.totalElements

    if (pageCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = [...pageCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      pageCache.delete(oldest[0])
    }
    pageCache.set(cacheKey, { content: response.content, totalElements: response.totalElements, ts: Date.now() })
  }
  catch (e) {
    console.error(e)
    showMsg('No se pudo cargar el listado', 'error')
  }
  finally {
    loading.value = false
  }
}

function buscarFiltros() {
  page.value = 1
  buscar()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    filtros.value = { ...filtros.value, search: val.trim() || undefined }
    page.value = 1
    buscar()
  }, 400)
})

function limpiarFiltros() {
  filtros.value = {}
  search.value = ''
  localStorage.removeItem(filtrosStorageKey)
  page.value = 1
  buscar()
}

// Llamado por VDataTableServer — solo gestiona cambios de ordenación;
// página e itemsPerPage tienen sus propios handlers para evitar llamadas dobles.
async function handleTableOptions(options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] }) {
  if (!tableReady.value) return
  const newSortBy = options.sortBy ?? []
  const sortChanged = JSON.stringify(newSortBy) !== JSON.stringify(sortBy.value)
  if (!sortChanged) return
  sortBy.value = newSortBy
  await buscar()
}

// ─── Paginación ───────────────────────────────────────────────────────────────
const pageCount = computed(() => itemsPerPage.value > 0 ? Math.ceil(totalItems.value / itemsPerPage.value) : 1)

// ─── Totales (de la página actual) ───────────────────────────────────────────
const totalImporte = computed(() => facturas.value.reduce((s, f) => s + (f.importeTotal ?? 0), 0))
const totalBase = computed(() => facturas.value.reduce((s, f) => s + (f.baseImponible ?? 0), 0))
const totalIva = computed(() => facturas.value.reduce((s, f) => s + (f.iva ?? 0), 0))

// ─── Formato ──────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

// ─── Entidades select ─────────────────────────────────────────────────────────
const entidadesItems = computed(() =>
  [{ title: 'Todas', value: '' }, ...entidades.value.map(e => ({ title: e.nombre, value: String(e.id) }))]
)

// ─── Tabla ────────────────────────────────────────────────────────────────────
const headers = [
  { title: 'ID', key: 'id', width: 50, sortable: true },
  { title: 'Tipo', key: 'tipo', width: 110, sortable: true },
  { title: 'Fecha', key: 'fechaFactura', width: 150, sortable: true },
  { title: 'Proveedor', key: 'proveedorFacturaNombre', width: 200, sortable: true },
  { title: 'Cuenta Aplicada', key: 'entidadNombre', width: 160, sortable: false },
  { title: 'Nº Factura', key: 'numeroFactura', width: 120, sortable: true },
  { title: 'Base', key: 'baseImponible', width: 80, sortable: true },
  { title: 'IVA', key: 'iva', width: 80, sortable: true },
  { title: 'IRPF', key: 'irpf', width: 80, sortable: true },
  { title: 'Export. Contab.', key: 'fechaExportacionContabilidad', width: 100, sortable: true },
  { title: 'Importe', key: 'importeTotal', width: 110, sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, width: 400 },
]

// ─── Row color by estado ──────────────────────────────────────────────────────
function rowProps({ item }: { item: FacturaProveedorDto }) {
  const color = estadoColor[item.estado ?? '']
  return color ? { class: `row-estado-${color}` } : {}
}

// ─── Export ───────────────────────────────────────────────────────────────────
const previewLoadingId = ref<number | null>(null)
const pdfDialogOpen = ref(false)
const pdfUrl = ref('')

watch(pdfDialogOpen, open => {
  if (!open && pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
  }
})

async function abrirVistaPrevia(item: FacturaProveedorDto) {
  if (!item.rutaPdf) {
    router.push({ path: `/facturas/${item.id}`, query: { q: busquedaLista.value } })
    return
  }
  previewLoadingId.value = item.id
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/facturas/${item.id}/pdf`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!response.ok) {
      showMsg('No se pudo cargar el documento', 'error')
      return
    }
    const blob = await response.blob()
    pdfUrl.value = URL.createObjectURL(blob)
    pdfDialogOpen.value = true
  }
  catch {
    showMsg('No se pudo cargar el documento', 'error')
  }
  finally {
    previewLoadingId.value = null
  }
}

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
    showMsg(marcar ? 'Exportación completada y marcada en contabilidad' : 'Exportación completada', 'success')
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
    limpiarCache()
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
    limpiarCache()
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
    limpiarCache()
    await buscar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo reprocesar con IA', 'error')
  }
  finally {
    loading.value = false
  }
}

// ─── Validar factura ─────────────────────────────────────────────────────────
const validandoId = ref<number | null>(null)

async function validarFactura(item: FacturaProveedorDto) {
  validandoId.value = item.id
  try {
    const result = await $api<{ ok: boolean; error?: string }>(`/facturas/${item.id}/validar/ajax`, { method: 'POST' })
    if (!result.ok) {
      showMsg(result.error || 'No se pudo validar la factura', 'error')
      return
    }
    const found = facturas.value.find(f => f.id === item.id)
    if (found) found.estado = 'VALIDADA'
    limpiarCache()
    showMsg('Factura validada correctamente', 'success')
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo validar la factura', 'error')
  }
  finally {
    validandoId.value = null
  }
}

// ─── Gestionar IA por fila ────────────────────────────────────────────────────
const procesandoIaId = ref<number | null>(null)

async function gestionarIa(item: FacturaProveedorDto) {
  procesandoIaId.value = item.id
  try {
    await $api(`/facturas/${item.id}/procesar-ia`, { method: 'POST' })
    showMsg('Procesado con IA correctamente', 'success')
    limpiarCache()
    await buscar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo procesar con IA', 'error')
  }
  finally {
    procesandoIaId.value = null
  }
}

// ─── Eliminar factura ─────────────────────────────────────────────────────────
const deleteDialogOpen = ref(false)
const facturaToDelete = ref<FacturaProveedorDto | null>(null)
const deleteLoading = ref(false)

function confirmarEliminar(item: FacturaProveedorDto) {
  facturaToDelete.value = item
  deleteDialogOpen.value = true
}

async function eliminarFactura() {
  if (!facturaToDelete.value) return
  deleteLoading.value = true
  try {
    await $api(`/facturas/${facturaToDelete.value.id}`, { method: 'DELETE' })
    showMsg('Factura eliminada correctamente', 'success')
    deleteDialogOpen.value = false
    facturaToDelete.value = null
    limpiarCache()
    await buscar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo eliminar la factura', 'error')
  }
  finally {
    deleteLoading.value = false
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
  tableReady.value = true
})
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
          <VBtn size="small" :loading="loading" class="ms-2" @click.stop="buscarFiltros">Buscar</VBtn>
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
                <VBtn :loading="loading" prepend-icon="tabler-search" @click="buscarFiltros">Buscar</VBtn>
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
          <span class="text-body-2 text-disabled me-3">{{ totalItems }} resultados</span>
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

      <VCardText class="pb-0">
        <VRow>
          <VCol cols="12" offset-md="8" md="4">
            <AppTextField
              v-model="search"
              placeholder="Buscar..."
              append-inner-icon="tabler-search"
              single-line
              hide-details
              density="compact"
              outlined
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDataTableServer
        :headers="headers"
        :items="facturas"
        :items-length="totalItems"
        :loading="loading"
        :page="page"
        :items-per-page="itemsPerPage"
        :sort-by="sortBy"
        :items-per-page-options="itemsPerPageOptions"
        :row-props="rowProps"
        item-value="id"
        show-select
        hover
        @update:options="handleTableOptions"
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
        <template #item.irpf="{ item }">{{ formatMoney(item.irpf) }}</template>
        <template #item.fechaExportacionContabilidad="{ item }">{{ formatDate(item.fechaExportacionContabilidad) }}</template>
        <template #item.importeTotal="{ item }">{{ formatMoney(item.importeTotal) }}</template>
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
          <div class="d-flex align-center flex-wrap gap-1">
            <!--Btn Validar (solo PENDIENTE_REVISION)-->
            <VBtn
              v-if="item.estado === 'PENDIENTE_REVISION'"
              size="x-small"
              color="secondary"
              variant="tonal"
              :loading="validandoId === item.id"
              @click.stop="validarFactura(item)"
            >Validar</VBtn>
           
            <!--Btn Gestionar IA (pendiente revisión, con PDF, no procesada aún)-->
            <VBtn
              v-if="item.rutaPdf && !item.procesadaIa && item.estado === 'PENDIENTE_REVISION'"
              size="x-small"
              color="secondary"
              variant="tonal"
              prepend-icon="tabler-sparkles"
              :loading="procesandoIaId === item.id"
              @click.stop="gestionarIa(item)"
            >Gestionar IA</VBtn>
            <!--Badge Procesada IA-->
            <VChip
              v-if="item.procesadaIa"
              size="x-small"
              color="info"
              label
              prepend-icon="tabler-robot"
            >Procesada IA</VChip>
             <!--Btn Ver Documento-->
            <VTooltip :text="item.rutaPdf ? 'Ver documento' : 'Ver detalle'" location="top">
              <template #activator="{ props }">
                <IconBtn v-bind="props" size="small" :loading="previewLoadingId === item.id" @click.stop="abrirVistaPrevia(item)">
                  <VIcon :icon="item.rutaPdf ? 'tabler-file-search' : 'tabler-eye'" />
                </IconBtn>
              </template>
            </VTooltip>
            <!--Btn Eliminar-->
            <VTooltip text="Eliminar factura" location="top">
              <template #activator="{ props }">
                <IconBtn v-bind="props" size="small" color="error" @click.stop="confirmarEliminar(item)">
                  <VIcon icon="tabler-trash" />
                </IconBtn>
              </template>
            </VTooltip>
          </div>
        </template>
        <template #bottom>
          <VDivider />
          <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 px-6 py-3">
            <div class="d-flex align-center gap-4 flex-wrap gap-y-1">
              <p class="text-disabled mb-0 text-body-2">
                {{ paginationMeta({ page, itemsPerPage }, totalItems) }}
              </p>
              <div class="d-flex align-center gap-2">
                <span class="text-disabled text-body-2">Filas por página:</span>
                <AppSelect
                  v-model="itemsPerPage"
                  :items="itemsPerPageOptions"
                  density="compact"
                  style="width: 100px"
                  @update:model-value="() => { page = 1; buscar() }"
                />
              </div>
            </div>
            <VPagination
              v-if="itemsPerPage !== -1 && pageCount > 1"
              v-model="page"
              active-color="primary"
              :length="pageCount"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(pageCount, 7)"
              @update:model-value="buscar"
            />
          </div>
          <!-- Totales de la página actual -->
          <VDivider />
          <div class="d-flex justify-end align-center gap-6 text-body-2 font-weight-bold px-4 py-2 flex-wrap">
            <span class="text-medium-emphasis font-weight-regular">{{ facturas.length }} en página · {{ totalItems }} en total</span>
            <span>Base: {{ formatMoney(totalBase) }}</span>
            <span>IVA: {{ formatMoney(totalIva) }}</span>
            <span class="text-primary">Total: {{ formatMoney(totalImporte) }}</span>
          </div>
        </template>
      </VDataTableServer>
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

    <!-- Visor PDF -->
    <VDialog v-model="pdfDialogOpen" max-width="960" max-height="90vh" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center pa-3">
          <VIcon icon="tabler-file-type-pdf" color="error" class="me-2" />
          Documento
          <VSpacer />
          <IconBtn @click="pdfDialogOpen = false"><VIcon icon="tabler-x" /></IconBtn>
        </VCardTitle>
        <VCardText class="pa-0" style="height: 80vh;">
          <iframe v-if="pdfUrl" :src="pdfUrl" style="width:100%;height:100%;border:none;" />
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Diálogo confirmar eliminación -->
    <VDialog v-model="deleteDialogOpen" max-width="420">
      <VCard>
        <VCardTitle class="pa-4">Eliminar factura</VCardTitle>
        <VCardText>
          <p class="text-body-2">
            ¿Estás seguro de que deseas eliminar la factura
            <strong>#{{ facturaToDelete?.id }}</strong>
            <template v-if="facturaToDelete?.proveedorFacturaNombre"> de <strong>{{ facturaToDelete.proveedorFacturaNombre }}</strong></template>?
            Esta acción no se puede deshacer.
          </p>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="tonal" @click="deleteDialogOpen = false">Cancelar</VBtn>
          <VBtn color="error" :loading="deleteLoading" @click="eliminarFactura">Eliminar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMsg }}
    </VSnackbar>
  </div>
</template>

<style scoped>
:deep(.row-estado-warning td) { background-color: rgba(var(--v-theme-warning), 0.10) !important; }
:deep(.row-estado-info td)    { background-color: rgba(var(--v-theme-info), 0.10) !important; }
:deep(.row-estado-success td) { background-color: rgba(var(--v-theme-success), 0.10) !important; }
:deep(.row-estado-primary td) { background-color: rgba(var(--v-theme-primary), 0.10) !important; }

:deep(.row-estado-warning:hover td) { background-color: rgba(var(--v-theme-warning), 0.18) !important; }
:deep(.row-estado-info:hover td)    { background-color: rgba(var(--v-theme-info), 0.18) !important; }
:deep(.row-estado-success:hover td) { background-color: rgba(var(--v-theme-success), 0.18) !important; }
:deep(.row-estado-primary:hover td) { background-color: rgba(var(--v-theme-primary), 0.18) !important; }
</style>
