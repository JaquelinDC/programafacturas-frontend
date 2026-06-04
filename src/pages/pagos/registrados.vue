<script setup lang="ts">
import type { PagoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Pagos Registrados' } })

const loading = ref(false)
const pagos = ref<PagoDto[]>([])

const headers = [
  { title: 'Fecha', key: 'fechaPago', width: 120 },
  { title: 'Tipo', key: 'tipoPagoNombre', width: 180 },
  { title: 'Importe', key: 'importePago', width: 120 },
  { title: 'Facturas', key: 'facturas', sortable: false },
]

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toFixed(2)} €`

async function cargar() {
  loading.value = true
  try {
    pagos.value = await $api<PagoDto[]>('/pagos/registrados')
  }
  finally {
    loading.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Pagos Registrados</VCardTitle>
      <VCardSubtitle>Pagos dados de alta en la aplicación y enlazados a facturas de proveedor.</VCardSubtitle>
      <template #append>
        <VBtn variant="tonal" :loading="loading" @click="cargar">Actualizar</VBtn>
      </template>
    </VCardItem>

    <VDataTable
      :headers="headers"
      :items="pagos"
      :loading="loading"
      item-value="id"
      hover
      density="compact"
    >
      <template #item.fechaPago="{ item }">{{ formatDate(item.fechaPago) }}</template>
      <template #item.importePago="{ item }">{{ formatMoney(item.importePago) }}</template>
      <template #item.facturas="{ item }">
        <div class="d-flex flex-wrap gap-1">
          <VChip v-if="item.facturasProveedorIds.length" v-for="(num, idx) in item.facturasProveedorNumeros" :key="idx" size="small" label>
            {{ num }}
          </VChip>
          <span v-else class="text-disabled">Pendiente</span>
        </div>
      </template>
    </VDataTable>
  </VCard>
</template>
