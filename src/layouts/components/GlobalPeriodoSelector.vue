<script setup lang="ts">
import { usePeriodoStore } from '@/stores/periodo'

const periodoStore = usePeriodoStore()

const etiquetaTrimestre = computed(() => {
  const opt = periodoStore.trimestreOptions.find(o => o.value === periodoStore.trimestre)
  return periodoStore.trimestre >= 1 && periodoStore.trimestre <= 4 ? `T${periodoStore.trimestre}` : (opt?.title ?? '')
})
</script>

<template>
  <VMenu
    location="bottom end"
    offset="10px"
    :close-on-content-click="false"
  >
    <template #activator="{ props: menuProps }">
      <VBtn
        id="periodo-selector-btn"
        v-bind="menuProps"
        variant="tonal"
        color="primary"
        size="small"
        class="me-2 text-none"
        prepend-icon="tabler-calendar-stats"
      >
        {{ periodoStore.anio }} · {{ etiquetaTrimestre }}
      </VBtn>
    </template>

    <VCard min-width="260">
      <VCardText class="d-flex flex-column gap-3">
        <div class="text-caption text-medium-emphasis">
          Periodo de trabajo
        </div>

        <VSelect
          v-model="periodoStore.anio"
          :items="periodoStore.anios"
          label="Año"
          density="compact"
          hide-details
        />

        <VSelect
          v-model="periodoStore.trimestre"
          :items="periodoStore.trimestreOptions"
          item-title="title"
          item-value="value"
          label="Trimestre"
          density="compact"
          hide-details
        />
      </VCardText>
    </VCard>
  </VMenu>
</template>
