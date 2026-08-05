<script setup lang="ts">
type Nivel = 'alta' | 'media' | 'baja' | 'completa' | 'requiere-confirmacion'

const props = defineProps<{
  nivel: Nivel
  motivos?: string[]
  score?: number
}>()

const color = computed(() => {
  if (props.nivel === 'completa' || props.nivel === 'alta')
    return 'success'
  if (props.nivel === 'media' || props.nivel === 'requiere-confirmacion')
    return 'warning'

  return 'secondary'
})

const etiqueta = computed(() => {
  if (props.nivel === 'completa')
    return 'Coincidencia completa'
  if (props.nivel === 'requiere-confirmacion')
    return 'Requiere confirmación manual'

  return `Confianza ${props.nivel}`
})
</script>

<template>
  <div>
    <VChip
      size="x-small"
      :color="color"
      variant="tonal"
    >
      {{ etiqueta }}<template v-if="score != null">
        · score {{ score }}
      </template>
    </VChip>
    <div
      v-if="motivos?.length"
      class="d-flex flex-wrap ga-1 mt-1"
    >
      <VChip
        v-for="motivo in motivos"
        :key="motivo"
        size="x-small"
        variant="outlined"
        color="secondary"
        label
      >
        {{ motivo }}
      </VChip>
    </div>
  </div>
</template>
