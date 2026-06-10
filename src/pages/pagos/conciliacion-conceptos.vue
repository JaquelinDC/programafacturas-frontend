<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { ConceptoNoConciliableDto } from '@/types/api'

definePage({ meta: { title: 'Conceptos No Conciliables' } })

const {
  items: conceptos,
  loading,
  saving,
  dialog,
  editingItem,
  deleteDialog,
  snackbar,
  snackbarMessage,
  snackbarColor,
  openCreate,
  openDelete,
  confirmDelete,
  save,
  fetchAll,
} = useCrud<ConceptoNoConciliableDto>('/conciliacion-conceptos')

const form = ref({ texto: '', activo: true })
const page = ref(1)
const itemsPerPage = ref(10)
const search = ref('')
watch(search, () => { page.value = 1 })

watch(dialog, open => {
  if (open) {
    form.value = {
      texto: editingItem.value?.texto ?? '',
      activo: editingItem.value?.activo ?? true,
    }
  }
})

function handleSave() {
  save(form.value)
}

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Texto', key: 'texto' },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]

onMounted(fetchAll)
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Conceptos no conciliables</VCardTitle>
        <VCardSubtitle>Si el concepto de un movimiento bancario contiene alguno de estos textos, no se propondrá conciliaciónn automática.</VCardSubtitle>
        <template #append>
          <VBtn prepend-icon="tabler-plus" @click="openCreate">Nuevo</VBtn>
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

      <VDataTable
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="conceptos"
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

    <VDialog v-model="dialog" max-width="520" persistent>
      <VCard title="Nuevo concepto no conciliable">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="handleSave">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="form.texto" label="Texto *" placeholder="Ej. COMISION TARJETA" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-end pt-0 pb-4 px-6">
          <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
          <VBtn :loading="saving" @click="handleSave">Guardar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Eliminar concepto">
        <VCardText>¿Estás seguro de que quieres eliminar este concepto?</VCardText>
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
