<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { ProveedorFacturaDto } from '@/types/api'

definePage({ meta: { title: 'Proveedores de Factura' } })

const {
  items: proveedores, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<ProveedorFacturaDto>('/proveedores-factura')

const form = ref({ cif: '', nombre: '', direccion: '', codigoPostal: '', localidad: '', codigoContable: '' })

watch(dialog, open => {
  if (open) {
    form.value = {
      cif: editingItem.value?.cif ?? '',
      nombre: editingItem.value?.nombre ?? '',
      direccion: editingItem.value?.direccion ?? '',
      codigoPostal: editingItem.value?.codigoPostal ?? '',
      localidad: editingItem.value?.localidad ?? '',
      codigoContable: editingItem.value?.codigoContable ?? '',
    }
  }
})

const search = ref('')

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'CIF', key: 'cif', width: 130 },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Dirección', key: 'direccion' },
  { title: 'C.P.', key: 'codigoPostal', width: 100 },
  { title: 'Localidad', key: 'localidad' },
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
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="560" persistent>
      <VCard :title="editingItem ? 'Editar proveedor de factura' : 'Nuevo proveedor de factura'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="save(form)">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.cif" label="CIF" />
              </VCol>
              <VCol v-if="editingItem" cols="12" sm="6">
                <AppTextField v-model="form.codigoContable" label="Código Contable" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.nombre" label="Nombre *" required />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.direccion" label="Dirección" />
              </VCol>
              <VCol cols="12" sm="4">
                <AppTextField v-model="form.codigoPostal" label="C.P." />
              </VCol>
              <VCol cols="12" sm="8">
                <AppTextField v-model="form.localidad" label="Localidad" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-end pt-0 pb-4 px-6">
          <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
          <VBtn :loading="saving" @click="save(form)">Guardar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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
