<script setup lang="ts">
import type { ClienteDto, FacturaEmitidaDraftDto, FacturaEmitidaDto, PageResponse } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Facturas Emitidas' } })

async function descargarPlantilla() {
  const blob = await $api<Blob>('/facturas-emitidas/plantilla-importacion', { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-facturas-emitidas.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const uploadDialog = ref(false)
const uploadLoading = ref(false)
const bulkDeleteDialog = ref(false)
const editingItem = ref<FacturaEmitidaDto | null>(null)
const deletingId = ref<number | null>(null)
const selectedIds = ref<number[]>([])
const facturas = ref<FacturaEmitidaDto[]>([])
const clientes = ref<ClienteDto[]>([])
const page = ref(1)
const itemsPerPage = ref(25)
const totalItems = ref(0)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const tableReady = ref(false)
const exportMenu = ref(false)
const importDialog = ref(false)
const importLoading = ref(false)
const importFile = ref<File | File[] | null>(null)
const importResultado = ref<{ filasLeidas: number; insertadas: number; actualizadas: number; clientesNuevos: number; ignoradas: number; mensaje: string } | null>(null)

const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'Todos', value: -1 },
]

const selectedFacturaIdsSet = computed(() => new Set(selectedIds.value))
const allVisibleSelected = computed(() => facturas.value.length > 0 && facturas.value.every(f => selectedFacturaIdsSet.value.has(f.id)))
const someVisibleSelected = computed(() => facturas.value.some(f => selectedFacturaIdsSet.value.has(f.id)) && !allVisibleSelected.value)
const totalImporte = computed(() => facturas.value.reduce((s, f) => s + (f.importe ?? 0), 0))
const pageCount = computed(() => itemsPerPage.value > 0 ? Math.ceil(totalItems.value / itemsPerPage.value) : 1)

// ─── Previsualización documento ───────────────────────────────────────────────
const previewLoadingId = ref<number | null>(null)
const pdfDialogOpen = ref(false)
const pdfUrl = ref('')
const pdfMime = ref('')
const pdfFilename = ref('documento')

watch(pdfDialogOpen, open => {
  if (!open && pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
    pdfMime.value = ''
    pdfFilename.value = 'documento'
  }
})

function mimeFromPath(ruta: string): string {
  const ext = ruta.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'application/pdf'
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  return ''
}

async function abrirVistaPrevia(item: FacturaEmitidaDto) {
  previewLoadingId.value = item.id
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/facturas-emitidas/${item.id}/documento`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!response.ok) {
      showMsg('No se pudo cargar el documento', 'error')
      return
    }
    const rawContentType = (response.headers.get('Content-Type') ?? '').split(';')[0].trim()
    const serverMime = rawContentType !== 'application/octet-stream' ? rawContentType : ''
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const dispositionFilename = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '').trim() ?? ''
    const inferredMime = mimeFromPath(dispositionFilename || (item.rutaDocumento ?? ''))
    const mime = serverMime || inferredMime || 'application/pdf'
    const rawBlob = await response.blob()
    const blob = rawBlob.type === mime ? rawBlob : new Blob([rawBlob], { type: mime })
    pdfMime.value = mime
    pdfFilename.value = dispositionFilename || `factura-${item.numeroFactura ?? item.id}.${mime === 'application/pdf' ? 'pdf' : mime.split('/')[1] ?? 'pdf'}`
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

// ─── Caché de páginas ─────────────────────────────────────────────────────────
const CACHE_TTL_MS = 2 * 60 * 1000
const MAX_CACHE_ENTRIES = 20
interface CacheEntry { content: FacturaEmitidaDto[]; totalElements: number; ts: number }
const pageCache = new Map<string, CacheEntry>()

function buildCacheKey(pg: number, sz: number, sort?: { key: string; order: string }) {
  return JSON.stringify({ ...filtros.value, page: pg, size: sz, ...(sort ? { sortBy: sort.key, sortDir: sort.order } : {}) })
}

function limpiarCache() {
  pageCache.clear()
}

const filtros = ref({ numeroFactura: '', cliente: '', referencia: '', fechaDesde: '', fechaHasta: '' })
const form = ref({ numeroFactura: '', fechaFactura: '', referencia: '', formaPago: '', importe: 0, baseImponible: 0, iva: 0, clienteId: null as number | null })
const uploadFile = ref<File | File[] | null>(null)
const procesandoDocumento = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const headers = [
  { title: 'Nº Factura', key: 'numeroFactura', sortable: true, width: 110 },
  { title: 'Fecha', key: 'fechaFactura', sortable: true, width: 110 },
  { title: 'Cliente', key: 'clienteNombre', sortable: false, width: 200 },
  { title: 'Referencia', key: 'referencia', sortable: false },
  { title: 'Forma pago', key: 'formaPago', sortable: false, width: 200 },
  { title: 'Base', key: 'baseImponible', sortable: true, width: 110 },
  { title: 'IVA', key: 'iva', sortable: true, width: 90 },
  { title: 'Importe', key: 'importe', sortable: true, width: 120 },
  { title: '', key: 'actions', sortable: false, width: 120 },
]

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function limpiarFiltros() {
  filtros.value = { numeroFactura: '', cliente: '', referencia: '', fechaDesde: '', fechaHasta: '' }
  page.value = 1
  fetchAll()
}

const clientesItems = computed(() => clientes.value.map(c => ({ title: c.cif ? `${c.nombre} (${c.cif})` : c.nombre, value: c.id })))

function limpiarSeleccion() { selectedIds.value = [] }
function toggleFacturaSeleccionada(id: number, checked: boolean) { const next = new Set(selectedIds.value); checked ? next.add(id) : next.delete(id); selectedIds.value = [...next] }
function toggleSeleccionPagina(checked: boolean) { const next = new Set(selectedIds.value); facturas.value.forEach(f => checked ? next.add(f.id) : next.delete(f.id)); selectedIds.value = [...next] }

function openCreate() { editingItem.value = null; form.value = { numeroFactura: '', fechaFactura: '', referencia: '', formaPago: '', importe: 0, baseImponible: 0, iva: 0, clienteId: null }; uploadFile.value = null; dialog.value = true }
function openEdit(item: FacturaEmitidaDto) { editingItem.value = { ...item }; form.value = { numeroFactura: item.numeroFactura ?? '', fechaFactura: item.fechaFactura ?? '', referencia: item.referencia ?? '', formaPago: item.formaPago ?? '', importe: item.importe ?? 0, baseImponible: item.baseImponible ?? 0, iva: item.iva ?? 0, clienteId: item.clienteId ?? null }; uploadFile.value = null; dialog.value = true }
function openUpload(item: FacturaEmitidaDto) { editingItem.value = { ...item }; uploadFile.value = null; uploadDialog.value = true }

async function fetchAll() {
  const sort = sortBy.value[0]
  const pg = page.value - 1
  const sz = itemsPerPage.value === -1 ? 99999 : itemsPerPage.value
  const cacheKey = buildCacheKey(pg, sz, sort)

  const cached = pageCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    facturas.value = cached.content
    totalItems.value = cached.totalElements
    return
  }

  loading.value = true
  try {
    const res = await $api<PageResponse<FacturaEmitidaDto>>('/facturas-emitidas', {
      query: { ...filtros.value, page: pg, size: sz, ...(sort ? { sortBy: sort.key, sortDir: sort.order } : {}) },
    })
    facturas.value = res.content
    totalItems.value = res.totalElements

    if (pageCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = [...pageCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      pageCache.delete(oldest[0])
    }
    pageCache.set(cacheKey, { content: res.content, totalElements: res.totalElements, ts: Date.now() })

    if (!clientes.value.length)
      clientes.value = await $api<ClienteDto[]>('/clientes')
  }
  finally { loading.value = false }
}

// Solo gestiona cambios de ordenación; página e itemsPerPage tienen sus propios handlers.
async function handleTableOptions(options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] }) {
  if (!tableReady.value) return
  const newSortBy = options.sortBy ?? []
  const sortChanged = JSON.stringify(newSortBy) !== JSON.stringify(sortBy.value)
  if (!sortChanged) return
  sortBy.value = newSortBy
  await fetchAll()
}

async function saveFactura() {
  saving.value = true
  try {
    const payload = { ...form.value, clienteId: form.value.clienteId ?? null }
    let saved: FacturaEmitidaDto
    if (editingItem.value?.id)
      saved = await $api<FacturaEmitidaDto>(`/facturas-emitidas/${editingItem.value.id}`, { method: 'PUT', body: payload })
    else
      saved = await $api<FacturaEmitidaDto>('/facturas-emitidas', { method: 'POST', body: payload })

    if (uploadFile.value) {
      const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await $api(`/facturas-emitidas/${saved.id}/documento`, { method: 'POST', body: fd })
      }
    }
    showMsg('Factura guardada correctamente')
    dialog.value = false
    limpiarCache()
    await fetchAll()
  } catch (e: any) { showMsg(e?.data?.message || 'Error al guardar', 'error') }
  finally { saving.value = false }
}

async function procesarDocumento() {
  const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
  if (!file) {
    showMsg('Selecciona un archivo', 'error')
    return
  }
  procesandoDocumento.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const draft = await $api<FacturaEmitidaDraftDto>('/facturas-emitidas/procesar-documento', {
      method: 'POST',
      body: fd,
    })
    form.value = {
      numeroFactura: draft.numeroFactura ?? form.value.numeroFactura,
      fechaFactura: draft.fechaFactura ?? form.value.fechaFactura,
      referencia: draft.referencia ?? form.value.referencia,
      formaPago: draft.formaPago ?? form.value.formaPago,
      importe: draft.importe ?? form.value.importe,
      baseImponible: draft.baseImponible ?? form.value.baseImponible,
      iva: draft.iva ?? form.value.iva,
      clienteId: clientes.value.find(c => c.cif && draft.clienteCif && c.cif.replace(/\s+/g, '').toUpperCase() === draft.clienteCif.replace(/\s+/g, '').toUpperCase())?.id
        ?? clientes.value.find(c => draft.clienteNombre && c.nombre.toLowerCase().includes(draft.clienteNombre.toLowerCase()))?.id
        ?? form.value.clienteId,
    }
    showMsg('Documento procesado con IA')
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo procesar el documento', 'error')
  }
  finally {
    procesandoDocumento.value = false
  }
}

async function subirDocumento() {
  if (!editingItem.value?.id || !uploadFile.value) return
  uploadLoading.value = true
  try {
    const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    await $api(`/facturas-emitidas/${editingItem.value.id}/documento`, { method: 'POST', body: fd })
    showMsg('Documento guardado')
    uploadDialog.value = false
    limpiarCache()
    await fetchAll()
  } catch (e: any) { showMsg(e?.data?.message || 'Error al guardar el documento', 'error') }
  finally { uploadLoading.value = false }
}

async function confirmDelete() {
  if (!deletingId.value) return
  deleting.value = true
  try { await $api(`/facturas-emitidas/${deletingId.value}`, { method: 'DELETE' }); showMsg('Factura eliminada'); deleteDialog.value = false; limpiarCache(); await fetchAll() }
  catch (e: any) { showMsg(e?.data?.message || 'Error al eliminar', 'error') }
  finally { deleting.value = false; deletingId.value = null }
}

function abrirImportDialog() {
  importFile.value = null
  importResultado.value = null
  importDialog.value = true
}

async function importarDesdeExcel() {
  const file = Array.isArray(importFile.value) ? importFile.value[0] : importFile.value
  if (!file) { showMsg('Selecciona un archivo Excel', 'error'); return }
  importLoading.value = true
  importResultado.value = null
  try {
    const fd = new FormData()
    fd.append('fichero', file)
    const res = await $api<{ filasLeidas: number; insertadas: number; actualizadas: number; clientesNuevos: number; ignoradas: number; mensaje: string }>(
      '/facturas-emitidas/importar', { method: 'POST', body: fd }
    )
    importResultado.value = res
    limpiarCache()
    await fetchAll()
  }
  catch (e: any) { showMsg(e?.data?.message || 'Error al importar', 'error') }
  finally { importLoading.value = false }
}

async function deleteSelected() {
  deleting.value = true
  try {
    for (const id of selectedIds.value) await $api(`/facturas-emitidas/${id}`, { method: 'DELETE' })
    showMsg('Facturas eliminadas')
    bulkDeleteDialog.value = false
    limpiarSeleccion()
    limpiarCache()
    await fetchAll()
  } catch (e: any) { showMsg(e?.data?.message || 'Error al eliminar', 'error') }
  finally { deleting.value = false }
}

onMounted(async () => {
  clientes.value = await $api<ClienteDto[]>('/clientes')
  await fetchAll()
  tableReady.value = true
})
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Facturas Emitidas</VCardTitle>
        <template #append>
          <VBtn  class="me-2" @click="openCreate">Nueva</VBtn>
          <VMenu v-model="exportMenu" location="bottom end">
            <template #activator="{ props }"><VBtn v-bind="props" variant="tonal" class="me-2">Acciones</VBtn></template>
            <VList density="compact" min-width="220">
              <VListItem title="Importar desde Excel (.xlsx)" prepend-icon="tabler-table-import" @click="abrirImportDialog" />
              <VListItem title="Eliminar seleccionadas" :disabled="!selectedIds.length" @click="bulkDeleteDialog = true" />
            </VList>
          </VMenu>
        </template>
      </VCardItem>

      <VCardText>
        <VRow dense>
          <VCol cols="12" sm="6" md="2"><AppTextField v-model="filtros.numeroFactura" label="Nº Factura" density="compact" clearable @keyup.enter="() => { page = 1; fetchAll() }" /></VCol>
          <VCol cols="12" sm="6" md="3"><AppTextField v-model="filtros.cliente" label="Cliente" density="compact" clearable @keyup.enter="() => { page = 1; fetchAll() }" /></VCol>
          <VCol cols="12" sm="6" md="3"><AppTextField v-model="filtros.referencia" label="Referencia" density="compact" clearable @keyup.enter="() => { page = 1; fetchAll() }" /></VCol>
          <VCol cols="6" sm="3" md="2"><AppTextField v-model="filtros.fechaDesde" label="Desde" type="date" density="compact" clearable /></VCol>
          <VCol cols="6" sm="3" md="2"><AppTextField v-model="filtros.fechaHasta" label="Hasta" type="date" density="compact" clearable /></VCol>
          <VCol cols="12" class="d-flex gap-2">
            <VBtn @click="() => { page = 1; fetchAll() }">Buscar</VBtn>
            <VBtn variant="tonal" @click="limpiarFiltros">Limpiar</VBtn>
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
        item-value="id"
        show-select
        hover
        @update:options="handleTableOptions"
      >
        <template #header.data-table-select>
          <VCheckboxBtn :model-value="allVisibleSelected" :indeterminate="someVisibleSelected" @update:model-value="(v: boolean) => toggleSeleccionPagina(v)" />
        </template>
        <template #item.data-table-select="{ item }">
          <VCheckboxBtn :model-value="selectedFacturaIdsSet.has(item.id)" @click.stop @update:model-value="(v: boolean) => toggleFacturaSeleccionada(item.id, v)" />
        </template>
        <template #item.fechaFactura="{ item }">{{ formatDate(item.fechaFactura) }}</template>
        <template #item.baseImponible="{ item }">{{ formatMoney(item.baseImponible) }}</template>
        <template #item.iva="{ item }">{{ formatMoney(item.iva) }}</template>
        <template #item.importe="{ item }">{{ formatMoney(item.importe) }}</template>
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <VTooltip :text="item.rutaDocumento ? 'Ver documento' : 'Subir documento'" location="top">
              <template #activator="{ props }">
                <IconBtn
                  v-bind="props"
                  size="small"
                  :loading="previewLoadingId === item.id"
                  @click.stop="item.rutaDocumento ? abrirVistaPrevia(item) : openUpload(item)"
                >
                  <VIcon :icon="item.rutaDocumento ? 'tabler-file-search' : 'tabler-upload'" />
                </IconBtn>
              </template>
            </VTooltip>
            <IconBtn size="small" @click="openEdit(item)"><VIcon icon="tabler-edit" /></IconBtn>
            <IconBtn size="small" color="error" @click="deletingId = item.id; deleteDialog = true"><VIcon icon="tabler-trash" /></IconBtn>
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
                  @update:model-value="() => { page = 1; fetchAll() }"
                />
              </div>
            </div>
            <VPagination
              v-if="itemsPerPage !== -1 && pageCount > 1"
              v-model="page"
              active-color="primary"
              :length="pageCount"
              :total-visible="$vuetify.display.xs ? 1 : Math.min(pageCount, 7)"
              @update:model-value="fetchAll"
            />
          </div>
          <VDivider />
          <div class="d-flex justify-end align-center gap-6 text-body-2 font-weight-bold px-4 py-2 flex-wrap">
            <span class="text-medium-emphasis font-weight-regular">{{ facturas.length }} en página · {{ totalItems }} en total</span>
            <span class="text-primary">Total: {{ formatMoney(totalImporte) }}</span>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <VDialog v-model="dialog" max-width="640" persistent>
      <VCard :title="editingItem ? 'Editar factura emitida' : 'Nueva factura emitida'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VRow>
            <VCol cols="12">
              <VFileInput
                v-model="uploadFile"
                :label="editingItem ? 'Reemplazar documento (opcional)' : 'PDF o imagen'"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                prepend-icon="tabler-file-upload"
                :hint="editingItem
                  ? (editingItem.rutaDocumento ? 'Ya tiene documento adjunto. Sube uno nuevo para reemplazarlo.' : 'Sin documento adjunto. Sube uno para añadirlo.')
                  : 'Opcional: sube el documento y pulsa Procesar con IA para autocompletar'"
                persistent-hint
              />
              <div class="d-flex gap-2 mt-2">
                <VBtn
                  variant="tonal"
                  :loading="procesandoDocumento"
                  :disabled="!uploadFile"
                  @click="procesarDocumento"
                >Procesar con IA</VBtn>
              </div>
            </VCol>
            <VCol cols="12" sm="6"><AppTextField v-model="form.numeroFactura" label="Nº Factura" /></VCol>
            <VCol cols="12" sm="6"><AppTextField v-model="form.fechaFactura" label="Fecha" type="date" /></VCol>
            <VCol cols="12"><AppSelect v-model="form.clienteId" label="Cliente" :items="clientesItems" clearable /></VCol>
            <VCol cols="12" sm="6"><AppTextField v-model="form.referencia" label="Referencia" /></VCol>
            <VCol cols="12" sm="6"><AppTextField v-model="form.formaPago" label="Forma de pago" /></VCol>
            <VCol cols="12" sm="4"><AppTextField v-model.number="form.baseImponible" label="Base imponible" type="number" /></VCol>
            <VCol cols="12" sm="4"><AppTextField v-model.number="form.iva" label="IVA" type="number" /></VCol>
            <VCol cols="12" sm="4"><AppTextField v-model.number="form.importe" label="Importe total" type="number" /></VCol>
          </VRow>
        </VCardText>
        <VCardActions class="justify-end pb-4 px-6">
          <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
          <VBtn :loading="saving" @click="saveFactura">Guardar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="uploadDialog" max-width="520">
      <VCard title="Subir documento">
        <VCardText>
          <VFileInput v-model="uploadFile" label="Archivo" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" prepend-icon="tabler-file-upload" />
        </VCardText>
        <VCardActions class="justify-end pb-4 px-6">
          <VBtn variant="tonal" @click="uploadDialog = false">Cancelar</VBtn>
          <VBtn :loading="uploadLoading" :disabled="!uploadFile" @click="subirDocumento">Guardar documento</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar factura emitida"><VCardText>¿Estás seguro?</VCardText><VCardActions class="justify-end"><VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn><VBtn color="error" :loading="deleting" @click="confirmDelete">Eliminar</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="bulkDeleteDialog" max-width="420">
      <VCard title="Eliminar seleccionadas"><VCardText>Se eliminarán {{ selectedIds.length }} facturas.</VCardText><VCardActions class="justify-end"><VBtn variant="tonal" @click="bulkDeleteDialog = false">Cancelar</VBtn><VBtn color="error" :loading="deleting" @click="deleteSelected">Eliminar</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="importDialog" max-width="520" persistent>
      <VCard title="Importar facturas emitidas desde Excel">
        <DialogCloseBtn @click="importDialog = false" />
        <VCardText>
          <VFileInput
            v-model="importFile"
            label="Archivo Excel (.xlsx)"
            accept=".xlsx,.xls"
            prepend-icon="tabler-table-import"
            hint="Formato exportación contable (recomendado): SER. - NÚM. (A), FECHA (B), CLIENTE (C), NOMBRE (D), REFERENCIA (E), FORMA DE PAGO (F), ESTADO (G), TOTAL (H), Base imponible (I), IVA (J), N.I.F. (O). Si el cliente no existe se crea automáticamente."
            persistent-hint
          />
          <div class="mt-2">
            <VBtn variant="text" density="compact" size="small" prepend-icon="tabler-download" @click="descargarPlantilla">
              Descargar plantilla Excel de ejemplo
            </VBtn>
          </div>
          <VAlert v-if="importResultado" class="mt-4" type="success" variant="tonal" closable>
            <div><strong>{{ importResultado.mensaje }}</strong></div>
            <div class="mt-1 text-body-2">
              Filas leídas: {{ importResultado.filasLeidas }} ·
              Insertadas: {{ importResultado.insertadas }} ·
              Actualizadas: {{ importResultado.actualizadas }} ·
              Clientes nuevos: {{ importResultado.clientesNuevos }}
              <span v-if="importResultado.ignoradas > 0"> · Ignoradas: {{ importResultado.ignoradas }}</span>
            </div>
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end pb-4 px-6">
          <VBtn variant="tonal" @click="importDialog = false">Cerrar</VBtn>
          <VBtn :loading="importLoading" :disabled="!importFile" @click="importarDesdeExcel">Importar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Visor documento -->
    <VDialog v-model="pdfDialogOpen" max-width="960" max-height="90vh" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center pa-3">
          <VIcon icon="tabler-file-type-pdf" color="error" class="me-2" />
          Documento
          <VSpacer />
          <VBtn
            v-if="pdfUrl"
            variant="tonal"
            size="small"
            class="me-2"
            :href="pdfUrl"
            :download="pdfFilename"
          >
            <VIcon icon="tabler-download" class="me-1" size="16" />Descargar
          </VBtn>
          <IconBtn @click="pdfDialogOpen = false"><VIcon icon="tabler-x" /></IconBtn>
        </VCardTitle>
        <VCardText class="pa-0 d-flex align-center justify-center" style="height: 80vh; overflow: auto;">
          <img v-if="pdfUrl && pdfMime.startsWith('image/')" :src="pdfUrl" alt="Documento adjunto" style="max-width:100%;max-height:100%;object-fit:contain;" />
          <iframe v-else-if="pdfUrl" :key="pdfUrl" :src="pdfUrl" title="Documento adjunto" style="width:100%;height:100%;border:none;" />
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">{{ snackbarMsg }}</VSnackbar>
  </div>
</template>
