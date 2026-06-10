<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { EntidadDto } from '@/types/api'

definePage({ meta: { title: 'Entidades' } })

const {
  items: entidades, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<EntidadDto>('/entidades?todas=true')

const form = ref({ nombre: '', codigo: '', ordenVisual: 0, activo: true })

watch(dialog, open => {
  if (open) {
    form.value = {
      nombre: editingItem.value?.nombre ?? '',
      codigo: editingItem.value?.codigo ?? '',
      ordenVisual: editingItem.value?.ordenVisual ?? 0,
      activo: editingItem.value?.activo ?? true,
    }
  }
})

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
watch(search, () => { page.value = 1 })

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Código', key: 'codigo', width: 120 },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Orden', key: 'ordenVisual', width: 100 },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Entidades</VCardTitle>
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
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="entidades"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.activo="{ item }">
          <VChip :color="item.activo ? 'success' : 'default'" size="small" label>
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </VChip>
        </template>
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

    <VDialog v-model="dialog" max-width="480" persistent>
      <VCard :title="editingItem ? 'Editar entidad' : 'Nueva entidad'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="save(form)">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.codigo" label="Código" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model.number="form.ordenVisual" label="Orden visual" type="number" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.nombre" label="Nombre *" required />
              </VCol>
              <VCol cols="12">
                <VSwitch v-model="form.activo" label="Activo" color="primary" />
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
      <VCard title="Eliminar entidad">
        <VCardText>¿Estás seguro de que quieres eliminar esta entidad?</VCardText>
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
