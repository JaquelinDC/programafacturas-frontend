import { $api } from '@/utils/api'

/**
 * Composable genérico para operaciones CRUD sobre un endpoint REST.
 * Gestiona la lista, el diálogo de edición/creación y la confirmación de borrado.
 */
export function useCrud<T extends { id: number }, TRequest = Partial<T>>(endpoint: string) {
  // endpoint puede incluir query params para el listado (p.ej. '/tipos-pago?todos=true').
  // Las mutaciones (POST/PUT/DELETE) usan solo la parte del path, sin query string.
  const baseEndpoint = endpoint.split('?')[0]

  const items = ref<T[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // Diálogo create/edit
  const dialog = ref(false)
  const editingItem = ref<T | null>(null)

  // Diálogo confirmación borrado
  const deleteDialog = ref(false)
  const deletingId = ref<number | null>(null)

  // Snackbar feedback
  const snackbar = ref(false)
  const snackbarMessage = ref('')
  const snackbarColor = ref<'success' | 'error'>('success')

  function showMsg(msg: string, color: 'success' | 'error' = 'success') {
    snackbarMessage.value = msg
    snackbarColor.value = color
    snackbar.value = true
  }

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await $api<T[]>(endpoint)
    }
    catch (e: any) {
      error.value = e?.data?.message || 'Error cargando datos'
    }
    finally {
      loading.value = false
    }
  }

  function openCreate() {
    editingItem.value = null
    dialog.value = true
  }

  function openEdit(item: T) {
    editingItem.value = { ...item }
    dialog.value = true
  }

  async function save(body: TRequest) {
    saving.value = true
    try {
      if (editingItem.value?.id) {
        await $api(`${baseEndpoint}/${editingItem.value.id}`, { method: 'PUT', body: body as any })
        showMsg('Registro actualizado correctamente')
      }
      else {
        await $api(baseEndpoint, { method: 'POST', body: body as any })
        showMsg('Registro creado correctamente')
      }
      dialog.value = false
      await fetchAll()
    }
    catch (e: any) {
      console.error('[useCrud save] error:', e?.status, e?.data, e)
      const msg = e?.data?.message || (e?.status ? `Error ${e.status} al guardar` : 'Error al guardar')
      showMsg(msg, 'error')
    }
    finally {
      saving.value = false
    }
  }

  function openDelete(id: number) {
    deletingId.value = id
    deleteDialog.value = true
  }

  async function confirmDelete() {
    if (!deletingId.value)
      return
    saving.value = true
    try {
      await $api(`${baseEndpoint}/${deletingId.value}`, { method: 'DELETE' })
      showMsg('Registro eliminado correctamente')
      deleteDialog.value = false
      await fetchAll()
    }
    catch (e: any) {
      showMsg(e?.data?.message || 'Error al eliminar', 'error')
    }
    finally {
      saving.value = false
      deletingId.value = null
    }
  }

  onMounted(fetchAll)

  return {
    items,
    loading,
    saving,
    error,
    dialog,
    editingItem,
    deleteDialog,
    snackbar,
    snackbarMessage,
    snackbarColor,
    fetchAll,
    openCreate,
    openEdit,
    openDelete,
    confirmDelete,
    save,
  }
}
