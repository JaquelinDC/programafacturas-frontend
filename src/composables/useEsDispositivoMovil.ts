/**
 * Detecta si el navegador es de un dispositivo móvil (para decidir por defecto si se usa el
 * modo rápido de subida de tickets). Se basa en el user-agent porque es más fiable que el ancho
 * de ventana, que también puede ser pequeño en un portátil o monitor.
 */
export function useEsDispositivoMovil() {
  const esMovil = ref(false)

  onMounted(() => {
    esMovil.value = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  })

  return esMovil
}
