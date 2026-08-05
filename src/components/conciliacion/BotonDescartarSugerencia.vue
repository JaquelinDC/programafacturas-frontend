<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import type { TipoFacturaConciliacion } from '@/types/api'

const props = defineProps<{
  tipoFactura: TipoFacturaConciliacion
  facturaId: number
  movimientoId: number
  descartado?: boolean
}>()

const emit = defineEmits<{ descartado: []; deshecho: [] }>()

const api = useConciliacion()
const loading = ref(false)
const error = ref('')

async function descartar() {
  loading.value = true
  error.value = ''
  try {
    await api.descartar({ tipoFactura: props.tipoFactura, facturaId: props.facturaId, movimientoId: props.movimientoId })
    emit('descartado')
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo descartar la sugerencia.'
  }
  finally {
    loading.value = false
  }
}

async function deshacer() {
  loading.value = true
  error.value = ''
  try {
    await api.deshacerDescarte({ tipoFactura: props.tipoFactura, facturaId: props.facturaId, movimientoId: props.movimientoId })
    emit('deshecho')
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo deshacer el descarte.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <VBtn
    v-if="!descartado"
    size="small"
    variant="text"
    color="secondary"
    prepend-icon="tabler-square-x"
    :loading="loading"
    :title="error || 'Descartar esta sugerencia de forma permanente'"
    @click="descartar"
  >
    Descartar
  </VBtn>
  <VBtn
    v-else
    size="small"
    variant="text"
    color="primary"
    prepend-icon="tabler-arrow-back-up"
    :loading="loading"
    :title="error || 'Volver a mostrar esta sugerencia'"
    @click="deshacer"
  >
    Deshacer
  </VBtn>
</template>
