/**
 * Diálogo visual para errores de negocio (p. ej. validaciones al cambiar estado o guardar),
 * más visible que un snackbar cuando el mensaje es largo o requiere atención del usuario.
 */
export function useErrorDialog() {
  const errorDialogVisible = ref(false)
  const errorDialogTitle = ref('No se pudo completar la acción')
  const errorDialogMessage = ref('')

  function showErrorDialog(message: string, title = 'No se pudo completar la acción') {
    errorDialogTitle.value = title
    errorDialogMessage.value = message
    errorDialogVisible.value = true
  }

  return { errorDialogVisible, errorDialogTitle, errorDialogMessage, showErrorDialog }
}
