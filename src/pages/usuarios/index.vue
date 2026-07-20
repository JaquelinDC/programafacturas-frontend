<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import { useAuthStore } from '@/stores/auth'
import type { EmpresaDto, UsuarioDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Usuarios', requiresAdmin: true } })

const authStore = useAuthStore()

const {
  items: usuarios, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<UsuarioDto>('/usuarios')

const empresas = ref<EmpresaDto[]>([])
const rolesOptions = computed(() =>
  authStore.isSuperAdmin
    ? ['SUPERADMIN', 'ADMINISTRADOR', 'ADMINISTRATIVO']
    : ['ADMINISTRADOR', 'ADMINISTRATIVO'],
)
const empresasOptions = computed(() => empresas.value.map(empresa => ({
  title: empresa.nombre,
  value: empresa.id,
})))

const form = ref({
  username: '',
  password: '',
  nombreCompleto: '',
  rol: 'ADMINISTRATIVO',
  activo: true,
  empresaId: null as number | null,
})

const isPasswordVisible = ref(false)

watch(dialog, open => {
  if (open) {
    isPasswordVisible.value = false
    form.value = {
      username: editingItem.value?.username ?? '',
      password: '',
      nombreCompleto: editingItem.value?.nombreCompleto ?? '',
      rol: editingItem.value?.rol ?? 'ADMINISTRATIVO',
      activo: editingItem.value?.activo ?? true,
      empresaId: editingItem.value?.empresaId ?? authStore.empresaId ?? null,
    }
  }
})

watch(() => form.value.rol, rol => {
  if (rol === 'SUPERADMIN')
    form.value.empresaId = null
  else if (!form.value.empresaId && !authStore.isSuperAdmin)
    form.value.empresaId = authStore.empresaId
})

function handleSave() {
  const body: Record<string, unknown> = { ...form.value }
  if (!authStore.isSuperAdmin)
    body.empresaId = authStore.empresaId
  if (body.rol === 'SUPERADMIN')
    body.empresaId = null
  if (editingItem.value && !body.password)
    delete body.password
  save(body as any)
}

async function fetchEmpresas() {
  if (!authStore.isSuperAdmin)
    return
  empresas.value = await $api<EmpresaDto[]>('/admin/empresas')
}

onMounted(fetchEmpresas)

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Usuario', key: 'username', width: 150 },
  { title: 'Nombre completo', key: 'nombreCompleto' },
  { title: 'Empresa', key: 'empresaNombre' },
  { title: 'Rol', key: 'rol', width: 150 },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]

const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
watch(search, () => { page.value = 1 })

const rolColors: Record<string, string> = {
  SUPERADMIN: 'warning',
  ADMINISTRADOR: 'error',
  ADMINISTRATIVO: 'primary',
}
</script>

<template>
  <div>
    <VAlert v-if="!authStore.isAdmin && !authStore.isSuperAdmin" type="warning" variant="tonal" class="mb-4">
      Solo los administradores pueden gestionar usuarios.
    </VAlert>

    <VCard>
      <VCardItem>
        <VCardTitle>Usuarios</VCardTitle>
        <template #append>
          <VBtn v-if="authStore.isAdmin || authStore.isSuperAdmin" prepend-icon="tabler-plus" @click="openCreate">Nuevo</VBtn>
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
        :items="usuarios"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.empresaNombre="{ item }">
          {{ item.empresaNombre || '-' }}
        </template>
        <template #item.rol="{ item }">
          <VChip :color="rolColors[item.rol] ?? 'default'" size="small" label>{{ item.rol }}</VChip>
        </template>
        <template #item.activo="{ item }">
          <VChip :color="item.activo ? 'success' : 'default'" size="small" label>
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <div v-if="authStore.isAdmin || authStore.isSuperAdmin" class="d-flex gap-1">
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

    <VDialog v-model="dialog" max-width="620" persistent>
      <VCard :title="editingItem ? 'Editar usuario' : 'Nuevo usuario'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="handleSave">
            <VRow>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.username" label="Usuario *" required :disabled="!!editingItem" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField
                  v-model="form.password"
                  :label="editingItem ? 'Nueva contrasena (opcional)' : 'Contrasena *'"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :required="!editingItem"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.nombreCompleto" label="Nombre completo *" required />
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.rol" label="Rol" :items="rolesOptions" />
              </VCol>
              <VCol v-if="authStore.isSuperAdmin && form.rol !== 'SUPERADMIN'" cols="12" sm="6">
                <AppSelect
                  v-model="form.empresaId"
                  label="Empresa *"
                  :items="empresasOptions"
                  required
                />
              </VCol>
              <VCol v-else-if="!authStore.isSuperAdmin" cols="12" sm="6">
                <AppTextField :model-value="authStore.empresaNombre || '-'" label="Empresa" disabled />
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
      <VCard title="Eliminar usuario">
        <VCardText>Estas seguro de que quieres eliminar este usuario?</VCardText>
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
