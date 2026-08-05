<script setup lang="ts">
withDefaults(defineProps<{ texto?: string }>(), {
  texto: 'Añadir factura manualmente',
})
</script>

<template>
  <VBtn
    variant="tonal"
    prepend-icon="tabler-file-plus"
    href="/facturas/subir-ticket"
    target="_blank"
    rel="noopener"
  >
    {{ texto }}
  </VBtn>
</template>
