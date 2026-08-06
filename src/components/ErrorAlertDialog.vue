<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  message?: string
}

withDefaults(defineProps<Props>(), {
  title: 'No se pudo completar la acción',
  message: '',
})

defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <VCard class="text-center px-6 py-8">
      <VCardText>
        <VAvatar color="error" variant="tonal" size="72" class="mb-4">
          <VIcon icon="tabler-alert-triangle" size="38" />
        </VAvatar>

        <h6 class="text-h6 mb-2">
          {{ title }}
        </h6>

        <p class="text-body-2 text-medium-emphasis mb-0" style="white-space: pre-line;">
          {{ message }}
        </p>
      </VCardText>

      <VCardText class="pt-0">
        <VBtn color="error" variant="tonal" @click="$emit('update:modelValue', false)">
          Entendido
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>
