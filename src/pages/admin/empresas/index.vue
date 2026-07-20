<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import { useAuthStore } from '@/stores/auth'
import type { EmpresaDto } from '@/types/api'
import { $api } from '@/utils/api'
import { useRouter } from 'vue-router'

definePage({ meta: { title: 'Empresas', requiresSuperAdmin: true } })

const authStore = useAuthStore()
const router = useRouter()

watchEffect(() => {
  if (authStore.rol && !authStore.isSuperAdmin)
    router.replace('/')
})

const {
  items: empresas, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save, fetchAll,
} = useCrud<EmpresaDto>('/admin/empresas')

const form = ref({
  nombre: '',
  cif: '',
  codigoInterno: '',
  emailContacto: '',
  logoUrl: '',
  activa: true,
})

const adminDialog = ref(false)
const adminSaving = ref(false)
const selectedEmpresa = ref<EmpresaDto | null>(null)
const isPasswordVisible = ref(false)
const adminForm = ref({
  username: '',
  password: '',
  nombreCompleto: '',
  activo: true,
})

watch(dialog, open => {
  if (open) {
    form.value = {
      nombre: editingItem.value?.nombre ?? '',
      cif: editingItem.value?.cif ?? '',
      codigoInterno: editingItem.value?.codigoInterno ?? '',
      emailContacto: editingItem.value?.emailContacto ?? '',
      logoUrl: editingItem.value?.logoUrl ?? '',
      activa: editingItem.value?.activa ?? true,
    }
  }
})

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
watch(search, () => { page.value = 1 })

const headers = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'Codigo', key: 'codigoInterno', width: 120 },
  { title: 'Nombre', key: 'nombre' },
  { title: 'CIF', key: 'cif', width: 130 },
  { title: 'Email contacto', key: 'emailContacto' },
  { title: 'Activa', key: 'activa', width: 100 },
  { title: 'Creada', key: 'creadaEn', width: 160 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 160 },
]

function formatDate(val?: string) {
  if (!val)
    return ''
  return val.substring(0, 10).split('-').reverse().join('-')
}

function openCreateAdmin(empresa: EmpresaDto) {
  selectedEmpresa.value = empresa
  isPasswordVisible.value = false
  adminForm.value = {
    username: '',
    password: '',
    nombreCompleto: '',
    activo: true,
  }
  adminDialog.value = true
}

async function saveAdmin() {
  if (!selectedEmpresa.value)
    return
  adminSaving.value = true
  try {
    await $api(`/admin/empresas/${selectedEmpresa.value.id}/usuarios`, {
      method: 'POST',
      body: adminForm.value,
    })
    snackbarMessage.value = 'Administrador creado correctamente'
    snackbarColor.value = 'success'
    snackbar.value = true
    adminDialog.value = false
    await fetchAll()
  }
  catch (e: any) {
    snackbarMessage.value = e?.data?.message || 'Error al crear administrador'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    adminSaving.value = false
  }
}
</script>

<template>
  <div>
    <VAlert v-if="!authStore.isSuperAdmin" type="warning" variant="tonal" class="mb-4">
      Solo el superadministrador puede gestionar empresas.
    </VAlert>

    <VCard>
      <VCardItem>
        <VCardTitle>Empresas (tenants)</VCardTitle>
        <template #append>
          <VBtn prepend-icon="tabler-plus" @click="openCreate">Nueva empresa</VBtn>
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
        :items="empresas"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.activa="{ item }">
          <VChip :color="item.activa ? 'success' : 'default'" size="small" label>
            {{ item.activa ? 'Activa' : 'Inactiva' }}
          </VChip>
        </template>
        <template #item.creadaEn="{ item }">
          {{ formatDate(item.creadaEn) }}
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <IconBtn size="small" @click="openCreateAdmin(item)">
              <VIcon icon="tabler-user-plus" />
              <VTooltip activator="parent" location="top">Crear administrador</VTooltip>
            </IconBtn>
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
              <span class="text-disabled text-body-2">Filas por pagina:</span>
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
      <VCard :title="editingItem ? 'Editar empresa' : 'Nueva empresa'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="save(form)">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.nombre" label="Nombre *" required />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.cif" label="CIF / NIF" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField
                  v-model="form.codigoInterno"
                  label="Codigo interno *"
                  :disabled="!!editingItem"
                  hint="Identificador unico, no modificable tras la creacion"
                  persistent-hint
                  required
                />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.emailContacto" label="Email de contacto" type="email" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.logoUrl" label="URL del logo" />
              </VCol>
              <VCol cols="12">
                <VSwitch v-model="form.activa" label="Activa" color="primary" />
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

    <VDialog v-model="adminDialog" max-width="560" persistent>
      <VCard :title="`Crear administrador - ${selectedEmpresa?.nombre ?? ''}`">
        <DialogCloseBtn @click="adminDialog = false" />
        <VCardText>
          <VForm @submit.prevent="saveAdmin">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="adminForm.username" label="Usuario *" required />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField
                  v-model="adminForm.password"
                  label="Contrasena *"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  required
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="adminForm.nombreCompleto" label="Nombre completo *" required />
              </VCol>
              <VCol cols="12">
                <VSwitch v-model="adminForm.activo" label="Activo" color="primary" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-end pt-0 pb-4 px-6">
          <VBtn variant="tonal" @click="adminDialog = false">Cancelar</VBtn>
          <VBtn :loading="adminSaving" @click="saveAdmin">Crear administrador</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Desactivar empresa">
        <VCardText>
          La empresa quedara marcada como inactiva. Los datos no se borran.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="tonal" @click="deleteDialog = false">Cancelar</VBtn>
          <VBtn color="error" :loading="saving" @click="confirmDelete">Desactivar</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
