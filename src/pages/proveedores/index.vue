<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { ProveedorDto } from '@/types/api'

definePage({ meta: { title: 'Proveedores' } })

const {
  items: proveedores, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<ProveedorDto>('/proveedores')

const form = ref({ nombre: '', observaciones: '', localidad: '' })

watch(dialog, open => {
  if (open) {
    form.value = {
      nombre: editingItem.value?.nombre ?? '',
      observaciones: editingItem.value?.observaciones ?? '',
      localidad: editingItem.value?.localidad ?? '',
    }
  }
})

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Localidad', key: 'localidad' },
  { title: 'Observaciones', key: 'observaciones' },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Proveedores</VCardTitle>
        <template #append>
          <VBtn prepend-icon="tabler-plus" @click="openCreate">Nuevo</VBtn>
        </template>
      </VCardItem>

      <VDataTable
        :headers="headers"
        :items="proveedores"
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

    <!-- Diálogo crear / editar -->
    <VDialog v-model="dialog" max-width="520" persistent>
      <VCard :title="editingItem ? 'Editar proveedor' : 'Nuevo proveedor'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="save(form)">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="form.nombre" label="Nombre *" required />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.localidad" label="Localidad" />
              </VCol>
              <VCol cols="12">
                <AppTextarea v-model="form.observaciones" label="Observaciones" rows="3" />
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

    <!-- Confirmar borrado -->
    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar proveedor">
        <VCardText>¿Estás seguro de que quieres eliminar este proveedor?</VCardText>
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
