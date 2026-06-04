<script setup lang="ts">
import type { ClienteDto, FacturaEmitidaDraftDto, FacturaEmitidaDto, PageResponse } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Facturas Emitidas' } })

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
const exportMenu = ref(false)
const selectedFacturaIdsSet = computed(() => new Set(selectedIds.value))
const allVisibleSelected = computed(() => facturas.value.length > 0 && facturas.value.every(f => selectedFacturaIdsSet.value.has(f.id)))
const someVisibleSelected = computed(() => facturas.value.some(f => selectedFacturaIdsSet.value.has(f.id)) && !allVisibleSelected.value)

const filtros = ref({ numeroFactura: '', cliente: '', referencia: '', fechaDesde: '', fechaHasta: '' })
const form = ref({ numeroFactura: '', fechaFactura: '', referencia: '', formaPago: '', importe: 0, baseImponible: 0, iva: 0, clienteId: null as number | null })
const uploadFile = ref<File | File[] | null>(null)
const procesandoDocumento = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

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

function cambiarItemsPerPage(valor: number) {
  itemsPerPage.value = valor
  page.value = 1
  fetchAll()
}

function cambiarPagina(valor: number) {
  page.value = valor
  fetchAll()
}

const clientesItems = computed(() => clientes.value.map(c => ({ title: c.cif ? `${c.nombre} (${c.cif})` : c.nombre, value: c.id })))

function limpiarSeleccion() { selectedIds.value = [] }
function toggleFacturaSeleccionada(id: number, checked: boolean) { const next = new Set(selectedIds.value); checked ? next.add(id) : next.delete(id); selectedIds.value = [...next] }
function toggleSeleccionPagina(checked: boolean) { const next = new Set(selectedIds.value); facturas.value.forEach(f => checked ? next.add(f.id) : next.delete(f.id)); selectedIds.value = [...next] }

function openCreate() { editingItem.value = null; form.value = { numeroFactura: '', fechaFactura: '', referencia: '', formaPago: '', importe: 0, baseImponible: 0, iva: 0, clienteId: null }; uploadFile.value = null; dialog.value = true }
function openEdit(item: FacturaEmitidaDto) { editingItem.value = { ...item }; form.value = { numeroFactura: item.numeroFactura ?? '', fechaFactura: item.fechaFactura ?? '', referencia: item.referencia ?? '', formaPago: item.formaPago ?? '', importe: item.importe ?? 0, baseImponible: item.baseImponible ?? 0, iva: item.iva ?? 0, clienteId: item.clienteId ?? null }; dialog.value = true }
function openUpload(item: FacturaEmitidaDto) { editingItem.value = { ...item }; uploadFile.value = null; uploadDialog.value = true }

async function fetchAll() {
  loading.value = true
  try {
    const res = await $api<PageResponse<FacturaEmitidaDto>>('/facturas-emitidas', { query: { ...filtros.value, page: page.value - 1, size: itemsPerPage.value } })
    facturas.value = res.content
    totalItems.value = res.totalElements
    if (!clientes.value.length)
      clientes.value = await $api<ClienteDto[]>('/clientes')
  }
  finally { loading.value = false }
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

    if (!editingItem.value?.id && uploadFile.value) {
      const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await $api(`/facturas-emitidas/${saved.id}/documento`, { method: 'POST', body: fd })
      }
    }
    showMsg('Factura guardada correctamente')
    dialog.value = false
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
    await fetchAll()
  } catch (e: any) { showMsg(e?.data?.message || 'Error al guardar el documento', 'error') }
  finally { uploadLoading.value = false }
}

async function confirmDelete() {
  if (!deletingId.value) return
  deleting.value = true
  try { await $api(`/facturas-emitidas/${deletingId.value}`, { method: 'DELETE' }); showMsg('Factura eliminada'); deleteDialog.value = false; await fetchAll() }
  catch (e: any) { showMsg(e?.data?.message || 'Error al eliminar', 'error') }
  finally { deleting.value = false; deletingId.value = null }
}

async function deleteSelected() {
  deleting.value = true
  try {
    for (const id of selectedIds.value) await $api(`/facturas-emitidas/${id}`, { method: 'DELETE' })
    showMsg('Facturas eliminadas')
    bulkDeleteDialog.value = false
    limpiarSeleccion()
    await fetchAll()
  } catch (e: any) { showMsg(e?.data?.message || 'Error al eliminar seleccionadas', 'error') }
  finally { deleting.value = false }
}

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${n.toFixed(2)} €`
const totalImporte = computed(() => facturas.value.reduce((s, f) => s + (f.importe ?? 0), 0))

const headers = [
  { title: 'Nº Factura', key: 'numeroFactura', width: 140 },
  { title: 'Fecha', key: 'fechaFactura', width: 110 },
  { title: 'Cliente', key: 'clienteNombre' },
  { title: 'Referencia', key: 'referencia' },
  { title: 'Importe', key: 'importe', width: 120 },
  { title: '', key: 'actions', sortable: false, width: 160 },
]

onMounted(async () => { clientes.value = await $api<ClienteDto[]>('/clientes'); await fetchAll() })
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Facturas Emitidas</VCardTitle>
        <template #append>
          <VBtn variant="tonal" class="me-2" @click="openCreate">Nueva</VBtn>
          <VMenu v-model="exportMenu" location="bottom end">
            <template #activator="{ props }"><VBtn v-bind="props" variant="tonal" class="me-2">Acciones</VBtn></template>
            <VList density="compact" min-width="220">
              <VListItem title="Eliminar seleccionadas" :disabled="!selectedIds.length" @click="bulkDeleteDialog = true" />
            </VList>
          </VMenu>
        </template>
      </VCardItem>

      <VCardText>
        <VRow dense>
          <VCol cols="12" sm="6" md="2"><AppTextField v-model="filtros.numeroFactura" label="Nº Factura" density="compact" clearable @keyup.enter="fetchAll" /></VCol>
          <VCol cols="12" sm="6" md="3"><AppTextField v-model="filtros.cliente" label="Cliente" density="compact" clearable @keyup.enter="fetchAll" /></VCol>
          <VCol cols="12" sm="6" md="3"><AppTextField v-model="filtros.referencia" label="Referencia" density="compact" clearable @keyup.enter="fetchAll" /></VCol>
          <VCol cols="6" sm="3" md="2"><AppTextField v-model="filtros.fechaDesde" label="Desde" type="date" density="compact" clearable /></VCol>
          <VCol cols="6" sm="3" md="2"><AppTextField v-model="filtros.fechaHasta" label="Hasta" type="date" density="compact" clearable /></VCol>
          <VCol cols="12" class="d-flex gap-2"><VBtn @click="fetchAll">Buscar</VBtn><VBtn variant="tonal" @click="limpiarFiltros">Limpiar</VBtn></VCol>
        </VRow>
      </VCardText>

      <VDataTable :headers="headers" :items="facturas" :loading="loading" item-value="id" show-select hover>
        <template #header.data-table-select>
          <VCheckboxBtn :model-value="allVisibleSelected" :indeterminate="someVisibleSelected" @update:model-value="(v: boolean) => toggleSeleccionPagina(v)" />
        </template>
        <template #item.data-table-select="{ item }">
          <VCheckboxBtn :model-value="selectedFacturaIdsSet.has(item.id)" @click.stop @update:model-value="(v: boolean) => toggleFacturaSeleccionada(item.id, v)" />
        </template>
        <template #item.fechaFactura="{ item }">{{ formatDate(item.fechaFactura) }}</template>
        <template #item.importe="{ item }">{{ formatMoney(item.importe) }}</template>
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <IconBtn size="small" @click="openUpload(item)"><VIcon icon="tabler-upload" /></IconBtn>
            <IconBtn size="small" @click="openEdit(item)"><VIcon icon="tabler-edit" /></IconBtn>
            <IconBtn size="small" color="error" @click="deletingId = item.id; deleteDialog = true"><VIcon icon="tabler-trash" /></IconBtn>
          </div>
        </template>
        <template #bottom>
          <div class="pa-2 d-flex justify-end gap-6 text-body-2 font-weight-bold border-t">
            <span>{{ facturas.length }} facturas</span><span>Total: {{ formatMoney(totalImporte) }}</span>
          </div>
        </template>
      </VDataTable>

      <div class="d-flex justify-end align-center gap-4 px-4 pb-2 pt-4 flex-wrap">
        <span class="text-body-2 text-disabled">Filas por página</span>
        <AppSelect :model-value="itemsPerPage" :items="[10,25,50,100].map(v => ({ title: String(v), value: v }))" density="compact" style="max-width:110px" @update:model-value="(v: number | string | null) => cambiarItemsPerPage(Number(v))" />
      </div>

      <TablePagination :page="page" :items-per-page="itemsPerPage" :total-items="totalItems" @update:page="cambiarPagina" />
    </VCard>

    <VDialog v-model="dialog" max-width="640" persistent>
      <VCard :title="editingItem ? 'Editar factura emitida' : 'Nueva factura emitida'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VRow>
            <VCol v-if="!editingItem" cols="12">
              <VFileInput
                v-model="uploadFile"
                label="PDF o imagen"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                prepend-icon="tabler-file-upload"
                hint="Opcional: sube el documento y pulsa Procesar con IA para autocompletar"
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
          <VBtn :loading="uploadLoading" @click="subirDocumento">Guardar documento</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar factura emitida"><VCardText>¿Estás seguro?</VCardText><VCardActions class="justify-end"><VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn><VBtn color="error" :loading="deleting" @click="confirmDelete">Eliminar</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="bulkDeleteDialog" max-width="420">
      <VCard title="Eliminar seleccionadas"><VCardText>Se eliminarán {{ selectedIds.length }} facturas.</VCardText><VCardActions class="justify-end"><VBtn variant="tonal" @click="bulkDeleteDialog = false">Cancelar</VBtn><VBtn color="error" :loading="deleting" @click="deleteSelected">Eliminar</VBtn></VCardActions></VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">{{ snackbarMsg }}</VSnackbar>
  </div>
</template>
