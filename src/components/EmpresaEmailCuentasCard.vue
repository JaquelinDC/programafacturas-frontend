<script setup lang="ts">
import { useCrud } from '@/composables/useCrud'
import type { EmailCuentaConexionResultDto, EmpresaEmailCuentaDto } from '@/types/api'
import { $api, apiErrorMessage } from '@/utils/api'
import { emailValidator, requiredValidator } from '@core/utils/validators'

// endpoint: '/mi-empresa/email-cuentas' (autoservicio) o '/admin/empresas/{id}/email-cuentas' (SUPERADMIN).
const props = defineProps<{ endpoint: string }>()

const {
  items: cuentas, loading, saving, dialog, editingItem,
  deleteDialog, snackbar, snackbarMessage, snackbarColor,
  openCreate, openEdit, openDelete, confirmDelete, save, fetchAll,
} = useCrud<EmpresaEmailCuentaDto>(props.endpoint)

const form = ref({
  nombre: '',
  host: '',
  puerto: 993,
  protocolo: 'imaps',
  carpeta: 'INBOX',
  usuario: '',
  password: '',
  activo: true,
})

const isPasswordVisible = ref(false)

watch(dialog, open => {
  if (open) {
    isPasswordVisible.value = false
    form.value = {
      nombre: editingItem.value?.nombre ?? '',
      host: editingItem.value?.host ?? '',
      puerto: editingItem.value?.puerto ?? 993,
      protocolo: editingItem.value?.protocolo ?? 'imaps',
      carpeta: editingItem.value?.carpeta ?? 'INBOX',
      usuario: editingItem.value?.usuario ?? '',
      password: '',
      activo: editingItem.value?.activo ?? true,
    }
  }
})

const protocolos = [
  { title: 'IMAPS (recomendado)', value: 'imaps' },
  { title: 'IMAP', value: 'imap' },
]

const headers = [
  { title: 'Usuario', key: 'usuario' },
  { title: 'Host', key: 'host' },
  { title: 'Protocolo', key: 'protocolo', width: 100 },
  { title: 'Activo', key: 'activo', width: 100 },
  { title: 'Última revisión', key: 'ultimaRevisionAt', width: 170 },
  { title: 'Último error', key: 'ultimoError' },
  { title: 'Acciones', key: 'actions', sortable: false, width: 150 },
]

function formatFecha(val?: string | null) {
  if (!val)
    return 'Nunca'
  return val.substring(0, 16).replace('T', ' ')
}

// ─── Probar conexión ────────────────────────────────────────────────────────
const probandoFila = ref<number | null>(null)
const probandoFormulario = ref(false)
const probarSnackbar = ref(false)
const probarMensaje = ref('')
const probarColor = ref<'success' | 'error'>('success')

function mostrarResultado(result: EmailCuentaConexionResultDto) {
  probarMensaje.value = result.mensaje
  probarColor.value = result.exito ? 'success' : 'error'
  probarSnackbar.value = true
}

function mostrarErrorProbar(e: any) {
  probarMensaje.value = apiErrorMessage(e, 'No se pudo probar la conexión')
  probarColor.value = 'error'
  probarSnackbar.value = true
}

async function probarFila(cuenta: EmpresaEmailCuentaDto) {
  probandoFila.value = cuenta.id
  try {
    const result = await $api<EmailCuentaConexionResultDto>(`${props.endpoint}/${cuenta.id}/probar-conexion`, {
      method: 'POST',
      body: {},
    })

    mostrarResultado(result)
  }
  catch (e: any) {
    mostrarErrorProbar(e)
  }
  finally {
    probandoFila.value = null
  }
}

async function probarFormulario() {
  probandoFormulario.value = true
  try {
    const path = editingItem.value
      ? `${props.endpoint}/${editingItem.value.id}/probar-conexion`
      : `${props.endpoint}/probar-conexion`

    const body: Record<string, unknown> = {
      host: form.value.host,
      puerto: form.value.puerto,
      protocolo: form.value.protocolo,
      carpeta: form.value.carpeta,
      usuario: form.value.usuario,
    }

    // En edición, blanco = usar la contraseña ya guardada (el backend hace el fallback).
    // Al crear, hace falta enviar la que se ha escrito (puede estar vacía si el usuario no la rellenó).
    if (form.value.password || !editingItem.value)
      body.password = form.value.password

    const result = await $api<EmailCuentaConexionResultDto>(path, { method: 'POST', body })

    mostrarResultado(result)
  }
  catch (e: any) {
    mostrarErrorProbar(e)
  }
  finally {
    probandoFormulario.value = false
  }
}

function guardar() {
  const body: Record<string, unknown> = { ...form.value }

  if (!body.password)
    delete body.password
  save(body as any)
}

defineExpose({ fetchAll })
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Cuentas de correo</VCardTitle>
      <VCardSubtitle>
        Buzones IMAP desde los que se ingieren automáticamente las facturas recibidas por email.
      </VCardSubtitle>
      <template #append>
        <VBtn prepend-icon="tabler-plus" @click="openCreate">
          Nueva cuenta
        </VBtn>
      </template>
    </VCardItem>

    <VDataTable
      :headers="headers"
      :items="cuentas"
      :loading="loading"
      item-value="id"
      hover
    >
      <template #item.activo="{ item }">
        <VChip :color="item.activo ? 'success' : 'default'" size="small" label>
          {{ item.activo ? 'Activa' : 'Inactiva' }}
        </VChip>
      </template>
      <template #item.ultimaRevisionAt="{ item }">
        {{ formatFecha(item.ultimaRevisionAt) }}
      </template>
      <template #item.ultimoError="{ item }">
        <VChip v-if="item.ultimoError" color="error" size="small" label class="text-truncate" style="max-inline-size: 260px;">
          {{ item.ultimoError }}
          <VTooltip activator="parent" location="top">{{ item.ultimoError }}</VTooltip>
        </VChip>
        <span v-else class="text-disabled">—</span>
      </template>
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <IconBtn size="small" :loading="probandoFila === item.id" @click="probarFila(item)">
            <VIcon icon="tabler-plug-connected" />
            <VTooltip activator="parent" location="top">Probar conexión</VTooltip>
          </IconBtn>
          <IconBtn size="small" @click="openEdit(item)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn size="small" color="error" @click="openDelete(item.id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </div>
      </template>
      <template #no-data>
        <p class="text-disabled py-6 text-center mb-0">
          No hay cuentas de correo configuradas todavía.
        </p>
      </template>
    </VDataTable>

    <VDialog v-model="dialog" max-width="560" persistent>
      <VCard :title="editingItem ? 'Editar cuenta de correo' : 'Nueva cuenta de correo'">
        <DialogCloseBtn @click="dialog = false" />
        <VCardText>
          <VForm @submit.prevent="guardar">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="form.nombre" label="Etiqueta (opcional)" placeholder="Facturas recepción" />
              </VCol>
              <VCol cols="12" sm="8">
                <AppTextField v-model="form.host" label="Host *" placeholder="mail.tuempresa.es" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12" sm="4">
                <AppTextField v-model.number="form.puerto" label="Puerto" type="number" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.protocolo" label="Protocolo" :items="protocolos" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.carpeta" label="Carpeta" placeholder="INBOX" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.usuario" label="Usuario (email) *" type="email" :rules="[requiredValidator, emailValidator]" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField
                  v-model="form.password"
                  label="Contraseña *"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :placeholder="editingItem ? 'Dejar en blanco para no cambiarla' : ''"
                  :rules="editingItem ? [] : [requiredValidator]"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />
              </VCol>
              <VCol cols="12" class="d-flex align-center">
                <VSwitch v-model="form.activo" label="Activo" color="primary" />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-space-between pt-0 pb-4 px-6">
          <VBtn variant="tonal" :loading="probandoFormulario" prepend-icon="tabler-plug-connected" @click="probarFormulario">
            Probar conexión
          </VBtn>
          <div class="d-flex gap-2">
            <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
            <VBtn :loading="saving" @click="guardar">Guardar</VBtn>
          </div>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="deleteDialog" max-width="420">
      <VCard title="Desactivar cuenta de correo">
        <VCardText>
          La cuenta dejará de revisarse en cada ciclo. Puedes reactivarla más tarde editándola de nuevo.
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
    <VSnackbar v-model="probarSnackbar" :color="probarColor" location="bottom end" :timeout="6000">
      {{ probarMensaje }}
    </VSnackbar>
  </VCard>
</template>
