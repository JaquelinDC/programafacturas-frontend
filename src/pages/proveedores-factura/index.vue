<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { ProveedorFacturaDto } from '@/types/api'

definePage({ meta: { title: 'Proveedores de Factura' } })

const {
  items: proveedores, loading, saving,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openDelete, confirmDelete, fetchAll,
} = useCrud<ProveedorFacturaDto>('/proveedores-factura')

const formDialog = ref(false)
const editingItem = ref<ProveedorFacturaDto | null>(null)

function openCreate() {
  editingItem.value = null
  formDialog.value = true
}

function openEdit(item: ProveedorFacturaDto) {
  editingItem.value = { ...item }
  formDialog.value = true
}

async function onSaved() {
  snackbarMessage.value = editingItem.value ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente'
  snackbarColor.value = 'success'
  snackbar.value = true
  await fetchAll()
}

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
watch(search, () => { page.value = 1 })

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'CIF', key: 'cif', width: 100 },
  { title: 'Nombre', key: 'nombre', width: 250  },
  { title: 'Dirección', key: 'direccion', width: 300 },
  { title: 'C.P.', key: 'codigoPostal', width: 100 },
  { title: 'Localidad', key: 'localidad', width: 100 },
  { title: 'Cód. Contable', key: 'codigoContable', width: 140 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Proveedores de Factura</VCardTitle>
        <template #append>
          <VBtn prepend-icon="tabler-plus" @click="openCreate">Nuevo</VBtn>
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
        :items="proveedores"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
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

    <ProveedorFormDialog
      v-model="formDialog"
      :proveedor="editingItem"
      @saved="onSaved"
    />

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar proveedor de factura">
        <VCardText>¿Estás seguro de que quieres eliminar este proveedor de factura?</VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn>
          <VBtn color="error" :loading="saving" @click="confirmDelete">Eliminar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
