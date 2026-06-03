<script setup lang="ts">
import type { ClienteDto, FacturaEmitidaDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Facturas Emitidas' } })

const facturas = ref<FacturaEmitidaDto[]>([])
const clientes = ref<ClienteDto[]>([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const editingItem = ref<FacturaEmitidaDto | null>(null)
const deletingId = ref<number | null>(null)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

const form = ref({
  numeroFactura: '',
  fechaFactura: '',
  referencia: '',
  formaPago: '',
  importe: 0,
  baseImponible: 0,
  iva: 0,
  clienteId: null as number | null,
})

async function fetchAll() {
  loading.value = true
  try {
    [facturas.value, clientes.value] = await Promise.all([
      $api<FacturaEmitidaDto[]>('/facturas-emitidas'),
      $api<ClienteDto[]>('/clientes'),
    ])
  }
  finally {
    loading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  form.value = { numeroFactura: '', fechaFactura: '', referencia: '', formaPago: '', importe: 0, baseImponible: 0, iva: 0, clienteId: null }
  dialog.value = true
}

function openEdit(item: FacturaEmitidaDto) {
  editingItem.value = { ...item }
  form.value = {
    numeroFactura: item.numeroFactura ?? '',
    fechaFactura: item.fechaFactura ?? '',
    referencia: item.referencia ?? '',
    formaPago: item.formaPago ?? '',
    importe: item.importe ?? 0,
    baseImponible: item.baseImponible ?? 0,
    iva: item.iva ?? 0,
    clienteId: item.clienteId ?? null,
  }
  dialog.value = true
}

async function saveFactura() {
  saving.value = true
  try {
    if (editingItem.value?.id)
      await $api(`/facturas-emitidas/${editingItem.value.id}`, { method: 'PUT', body: form.value })
    else
      await $api('/facturas-emitidas', { method: 'POST', body: form.value })
    showMsg('Factura guardada correctamente')
    dialog.value = false
    await fetchAll()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'Error al guardar', 'error')
  }
  finally {
    saving.value = false
  }
}

function openDelete(id: number) {
  deletingId.value = id
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingId.value) return
  saving.value = true
  try {
    await $api(`/facturas-emitidas/${deletingId.value}`, { method: 'DELETE' })
    showMsg('Factura eliminada')
    deleteDialog.value = false
    await fetchAll()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'Error al eliminar', 'error')
  }
  finally {
    saving.value = false
    deletingId.value = null
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${n.toFixed(2)} €`

const clientesItems = computed(() =>
  clientes.value.map(c => {
    const label = c.cif ? `${c.nombre} (${c.cif})` : c.nombre
    return { title: label, value: c.id }
  })
)

const search = ref('')

const headers = [
  { title: 'Nº Factura', key: 'numeroFactura', width: 140 },
  { title: 'Fecha', key: 'fechaFactura', width: 110 },
  { title: 'Cliente', key: 'clienteNombre' },
  { title: 'Referencia', key: 'referencia' },
  { title: 'Importe', key: 'importe', width: 120 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]

onMounted(fetchAll)
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Facturas Emitidas</VCardTitle>
        <template #append>
          <VBtn prepend-icon="tabler-plus" @click="openCreate">Nueva</VBtn>
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
        :items="facturas"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.fechaFactura="{ item }">{{ formatDate(item.fechaFactura) }}</template>
        <template #item.importe="{ item }">{{ formatMoney(item.importe) }}</template>
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <IconBtn size="small" @click="openEdit(item)">
              <VIcon icon="tabler-edit" />
            </IconBtn>
            <IconBtn size="small" color="error" @click="openDelete(item.id)">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </div>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="600" persistent>
      <VCard :title="editingItem ? 'Editar factura emitida' : 'Nueva factura emitida'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="saveFactura">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.numeroFactura" label="Nº Factura" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.fechaFactura" label="Fecha" type="date" />
              </VCol>
              <VCol cols="12">
                <AppSelect
                  v-model="form.clienteId"
                  label="Cliente"
                  :items="clientesItems"
                  clearable
                />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.referencia" label="Referencia" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.formaPago" label="Forma de pago" />
              </VCol>
              <VCol cols="12" sm="4">
                <AppTextField v-model.number="form.baseImponible" label="Base imponible" type="number" />
              </VCol>
              <VCol cols="12" sm="4">
                <AppTextField v-model.number="form.iva" label="IVA" type="number" />
              </VCol>
              <VCol cols="12" sm="4">
                <AppTextField v-model.number="form.importe" label="Importe total" type="number" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-end pt-0 pb-4 px-6">
          <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
          <VBtn :loading="saving" @click="saveFactura">Guardar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar factura emitida">
        <VCardText>¿Estás seguro de que quieres eliminar esta factura?</VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn>
          <VBtn color="error" :loading="saving" @click="confirmDelete">Eliminar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
      {{ snackbarMsg }}
    </VSnackbar>
  </div>
</template>
