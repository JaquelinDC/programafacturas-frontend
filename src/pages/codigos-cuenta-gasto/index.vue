<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { CodigoCuentaGastoDto } from '@/types/api'

definePage({ meta: { title: 'Cuentas de Gasto' } })

const {
  items: cuentas, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<CodigoCuentaGastoDto>('/codigos-cuenta-gasto')

const form = ref({ codigo: '', descripcion: '', comun: false })

watch(dialog, open => {
  if (open) {
    form.value = {
      codigo: editingItem.value?.codigo ?? '',
      descripcion: editingItem.value?.descripcion ?? '',
      comun: editingItem.value?.comun ?? false,
    }
  }
})

const search = ref('')

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Código', key: 'codigo', width: 140 },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Común', key: 'comun', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Cuentas de Gasto</VCardTitle>
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
        :items="cuentas"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.comun="{ item }">
          <VChip :color="item.comun ? 'info' : 'default'" size="small" label>
            {{ item.comun ? 'Común' : 'Específico' }}
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
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="480" persistent>
      <VCard :title="editingItem ? 'Editar cuenta de gasto' : 'Nueva cuenta de gasto'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="save(form)">
            <VRow>
              <VCol cols="12" sm="5">
                <AppTextField v-model="form.codigo" label="Código *" required />
              </VCol>
              <VCol cols="12" sm="7" class="d-flex align-center">
                <VSwitch v-model="form.comun" label="Código común" color="info" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.descripcion" label="Descripción *" required />
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
      <VCard title="Eliminar cuenta de gasto">
        <VCardText>¿Estás seguro de que quieres eliminar esta cuenta?</VCardText>
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
