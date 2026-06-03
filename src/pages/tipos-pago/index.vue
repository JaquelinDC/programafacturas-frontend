<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { useCrud } from '@/composables/useCrud'
import type { TipoPagoDto } from '@/types/api'

definePage({ meta: { title: 'Tipos de Pago' } })

const {
  items: tiposPago, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<TipoPagoDto>('/tipos-pago?todos=true')

const formRef = ref<VForm>()
const form = ref({ nombre: '', orden: 0, activo: true })

watch(dialog, open => {
  if (open) {
    form.value = {
      nombre: editingItem.value?.nombre ?? '',
      orden: editingItem.value?.orden ?? 0,
      activo: editingItem.value?.activo ?? true,
    }
    nextTick(() => formRef.value?.resetValidation())
  }
})

const rules = {
  nombre: [
    (v: string) => (!!v && !!v.trim()) || 'El nombre es obligatorio',
    (v: string) => (v?.length <= 80) || 'Máximo 80 caracteres',
  ],
}

async function handleSave() {
  const { valid } = await formRef.value!.validate()
  if (valid)
    save(form.value)
}

const search = ref('')

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Orden', key: 'orden', width: 100 },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Tipos de Pago</VCardTitle>
        <VCardSubtitle>Transferencia, tarjetas, etc. Se usan al registrar el pago de facturas.</VCardSubtitle>
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
        :items="tiposPago"
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
      </VDataTable>
    </VCard>

    <VDialog v-model="dialog" max-width="440" persistent>
      <VCard :title="editingItem ? 'Editar tipo de pago' : 'Nuevo tipo de pago'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm ref="formRef" @submit.prevent="handleSave">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.nombre"
                  label="Nombre *"
                  :rules="rules.nombre"
                  placeholder="Ej. Transferencia, Tarjeta 1"
                  maxlength="80"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model.number="form.orden" label="Orden" type="number" :min="0" />
              </VCol>
              <VCol cols="12" sm="6" class="d-flex align-center">
                <VSwitch v-model="form.activo" label="Activo" color="primary" />
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
      <VCard title="Eliminar tipo de pago">
        <VCardText>¿Estás seguro de que quieres eliminar este tipo de pago?</VCardText>
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
