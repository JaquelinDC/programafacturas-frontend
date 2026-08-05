<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import type { ProveedorFacturaDto } from '@/types/api'

export interface FiltrosConciliacion {
  proveedorId?: number
  fechaDesde?: string
  fechaHasta?: string
  importe?: number
}

const props = withDefaults(defineProps<{
  modelValue: FiltrosConciliacion
  mostrarProveedor?: boolean
}>(), {
  mostrarProveedor: true,
})

const emit = defineEmits<{ 'update:modelValue': [FiltrosConciliacion] }>()

const api = useConciliacion()
const proveedores = ref<ProveedorFacturaDto[]>([])
const draft = ref<FiltrosConciliacion>({ ...props.modelValue })

const proveedorItems = computed(() => proveedores.value.map(p => ({ title: p.nombre, value: p.id })))

watch(() => props.modelValue, v => {
  draft.value = { ...v }
})

function actualizarDraft(campo: keyof FiltrosConciliacion, valor: unknown) {
  draft.value = { ...draft.value, [campo]: valor || undefined }
}

function filtrar() {
  emit('update:modelValue', { ...draft.value })
}

function limpiar() {
  draft.value = {}
  emit('update:modelValue', {})
}

onMounted(async () => {
  if (!props.mostrarProveedor)
    return
  try {
    proveedores.value = await api.proveedores()
  }
  catch {
    proveedores.value = []
  }
})
</script>

<template>
  <div class="d-flex flex-wrap align-center gap-3">
    <AppSelect
      v-if="mostrarProveedor"
      :model-value="draft.proveedorId"
      :items="proveedorItems"
      label="Proveedor"
      clearable
      density="compact"
      style="min-width: 220px;"
      @update:model-value="actualizarDraft('proveedorId', $event)"
      @keyup.enter="filtrar"
    />
    <AppTextField
      :model-value="draft.fechaDesde"
      label="Fecha desde"
      type="date"
      clearable
      density="compact"
      style="min-width: 170px;"
      @update:model-value="actualizarDraft('fechaDesde', $event)"
      @keyup.enter="filtrar"
    />
    <AppTextField
      :model-value="draft.fechaHasta"
      label="Fecha hasta"
      type="date"
      clearable
      density="compact"
      style="min-width: 170px;"
      @update:model-value="actualizarDraft('fechaHasta', $event)"
      @keyup.enter="filtrar"
    />
    <AppTextField
      :model-value="draft.importe"
      label="Importe"
      type="number"
      step="0.01"
      clearable
      density="compact"
      style="min-width: 150px;"
      @update:model-value="actualizarDraft('importe', $event ? Number($event) : undefined)"
      @keyup.enter="filtrar"
    />
    <VBtn
      size="small"
      color="primary"
      prepend-icon="tabler-filter"
      @click="filtrar"
    >
      Filtrar
    </VBtn>
    <VBtn
      size="small"
      variant="tonal"
      @click="limpiar"
    >
      Limpiar
    </VBtn>
  </div>
</template>
