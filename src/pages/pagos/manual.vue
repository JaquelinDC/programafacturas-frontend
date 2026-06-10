<script setup lang="ts">
import type { PagoDto, TipoPagoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Pagos Manuales' } })

const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const deletingId = ref<number | null>(null)
const editingItem = ref<PagoDto | null>(null)
const pagos = ref<PagoDto[]>([])
const tiposPago = ref<TipoPagoDto[]>([])
const page = ref(1)
const itemsPerPage = ref(10)

const form = ref({
  tipoPagoId: null as number | null,
  fechaPago: '',
  importePago: 0,
})

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const headers = [
  { title: 'Fecha', key: 'fechaPago', width: 150 },
  { title: 'Tipo', key: 'tipoPagoNombre', width: 200 },
  { title: 'Importe', key: 'importePago', width: 120 },
  { title: 'Facturas', key: 'facturas', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function resetForm() {
  form.value = { tipoPagoId: null, fechaPago: '', importePago: 0 }
}

function openCreate() {
  editingItem.value = null
  resetForm()
  dialog.value = true
}

function openEdit(item: PagoDto) {
  editingItem.value = item
  form.value = {
    tipoPagoId: item.tipoPagoId ?? null,
    fechaPago: item.fechaPago ? item.fechaPago.substring(0, 10) : '',
    importePago: item.importePago ?? 0,
  }
  dialog.value = true
}

function openDelete(id: number) {
  deletingId.value = id
  deleteDialog.value = true
}

async function cargar() {
  loading.value = true
  try {
    [pagos.value, tiposPago.value] = await Promise.all([
      $api<PagoDto[]>('/pagos'),
      $api<TipoPagoDto[]>('/tipos-pago?todos=true'),
    ])
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.tipoPagoId || !form.value.fechaPago) {
    showMsg('Completa tipo de pago y fecha', 'error')
    return
  }
  saving.value = true
  try {
    const payload = {
      tipoPagoId: form.value.tipoPagoId,
      fechaPago: form.value.fechaPago,
      importePago: form.value.importePago,
    }
    if (editingItem.value) {
      await $api(`/pagos/${editingItem.value.id}`, { method: 'PUT', body: payload })
    }
    else {
      await $api('/pagos', { method: 'POST', body: payload })
    }
    showMsg('Pago guardado correctamente')
    dialog.value = false
    await cargar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'Error al guardar', 'error')
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deletingId.value) return
  saving.value = true
  try {
    await $api(`/pagos/${deletingId.value}`, { method: 'DELETE' })
    showMsg('Pago eliminado correctamente')
    deleteDialog.value = false
    await cargar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'Error al eliminar', 'error')
  }
  finally {
    saving.value = false
    deletingId.value = null
  }
}

onMounted(cargar)
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Pagos manuales</VCardTitle>
      <VCardSubtitle>Alta, edición y borrado de pagos registrados.</VCardSubtitle>
      <template #append>
        <div class="d-flex gap-2">
          <VBtn variant="tonal" :loading="loading" @click="cargar">Actualizar</VBtn>
          <VBtn @click="openCreate">Nuevo</VBtn>
        </div>
      </template>
    </VCardItem>

    <VDataTable
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="pagos"
      :loading="loading"
      item-value="id"
      hover
    >
      <template #item.fechaPago="{ item }">{{ formatDate(item.fechaPago) }}</template>
      <template #item.importePago="{ item }">{{ formatMoney(item.importePago) }}</template>
      <template #item.facturas="{ item }">
        <div class="d-flex flex-wrap gap-1">
          <VChip v-for="(num, idx) in item.facturasProveedorNumeros" :key="idx" size="small" label>
            {{ num }}
          </VChip>
          <span v-if="!item.facturasProveedorNumeros.length" class="text-disabled">Sin facturas</span>
        </div>
      </template>
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn size="small" @click="openEdit(item)"><VIcon icon="tabler-edit" /></IconBtn>
          <IconBtn size="small" color="error" @click="openDelete(item.id)"><VIcon icon="tabler-trash" /></IconBtn>
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

  <VDialog v-model="dialog" max-width="560" persistent>
    <VCard :title="editingItem ? 'Editar pago' : 'Nuevo pago'">
      <DialogCloseBtn @click="dialog = false" />
      <VCardText>
        <VRow>
          <VCol cols="12" sm="6">
            <AppSelect v-model="form.tipoPagoId" :items="tiposPago.map(t => ({ title: t.nombre, value: t.id }))" label="Tipo de pago" />
          </VCol>
          <VCol cols="12" sm="6">
            <AppTextField v-model="form.fechaPago" label="Fecha pago" type="date" />
          </VCol>
          <VCol cols="12">
            <AppTextField v-model="form.importePago" label="Importe" type="number" step="0.01" />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end pt-0 pb-4 px-6">
        <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
        <VBtn :loading="saving" @click="save">Guardar</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="deleteDialog" max-width="420">
    <VCard title="Eliminar pago">
      <VCardText>¿Quieres eliminar este pago?</VCardText>
      <VCardActions class="justify-end">
        <VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn>
        <VBtn color="error" :loading="saving" @click="confirmDelete">Eliminar</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
    {{ snackbarMsg }}
  </VSnackbar>
</template>
