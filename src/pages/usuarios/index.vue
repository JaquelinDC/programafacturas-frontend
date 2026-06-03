<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import { useAuthStore } from '@/stores/auth'
import type { UsuarioDto } from '@/types/api'

definePage({ meta: { title: 'Usuarios' } })

const authStore = useAuthStore()

const {
  items: usuarios, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save,
} = useCrud<UsuarioDto>('/usuarios')

const rolesOptions = ['ADMINISTRADOR', 'USUARIO', 'CONSULTA']

const form = ref({
  username: '',
  password: '',
  nombreCompleto: '',
  rol: 'USUARIO',
  activo: true,
})

const isPasswordVisible = ref(false)

watch(dialog, open => {
  if (open) {
    isPasswordVisible.value = false
    form.value = {
      username: editingItem.value?.username ?? '',
      password: '',
      nombreCompleto: editingItem.value?.nombreCompleto ?? '',
      rol: editingItem.value?.rol ?? 'USUARIO',
      activo: editingItem.value?.activo ?? true,
    }
  }
})

function handleSave() {
  // En edición, la contraseña es opcional
  const body: Record<string, unknown> = { ...form.value }
  if (editingItem.value && !body.password)
    delete body.password
  save(body as any)
}

const headers = [
  { title: 'ID', key: 'id', width: 80 },
  { title: 'Usuario', key: 'username', width: 150 },
  { title: 'Nombre completo', key: 'nombreCompleto' },
  { title: 'Rol', key: 'rol', width: 150 },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Acciones', key: 'actions', sortable: false, width: 120 },
]

const search = ref('')

const rolColors: Record<string, string> = {
  ADMINISTRADOR: 'error',
  USUARIO: 'primary',
  CONSULTA: 'secondary',
}
</script>

<template>
  <div>
    <VAlert v-if="!authStore.isAdmin" type="warning" variant="tonal" class="mb-4">
      Solo los administradores pueden gestionar usuarios.
    </VAlert>

    <VCard>
      <VCardItem>
        <VCardTitle>Usuarios</VCardTitle>
        <template #append>
          <VBtn v-if="authStore.isAdmin" prepend-icon="tabler-plus" @click="openCreate">Nuevo</VBtn>
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
        :items="usuarios"
        :search="search"
        :loading="loading"
        item-value="id"
        hover
      >
        <template #item.rol="{ item }">
          <VChip :color="rolColors[item.rol] ?? 'default'" size="small" label>{{ item.rol }}</VChip>
        </template>
        <template #item.activo="{ item }">
          <VChip :color="item.activo ? 'success' : 'default'" size="small" label>
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <div v-if="authStore.isAdmin" class="d-flex gap-1">
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

    <VDialog v-model="dialog" max-width="520" persistent>
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
                  :label="editingItem ? 'Nueva contraseña (opcional)' : 'Contraseña *'"
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
        <VCardText>¿Estás seguro de que quieres eliminar este usuario?</VCardText>
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
