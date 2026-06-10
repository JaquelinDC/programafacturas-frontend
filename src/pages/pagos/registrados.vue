<script setup lang="ts">
import type { PagoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Pagos Registrados' } })

const loading = ref(false)
const pagos = ref<PagoDto[]>([])
const page = ref(1)
const itemsPerPage = ref(10)

const headers = [
  { title: 'Fecha', key: 'fechaPago', width: 150 },
  { title: 'Tipo', key: 'tipoPagoNombre', width: 180 },
  { title: 'Importe', key: 'importePago', width: 120 },
  { title: 'Facturas', key: 'facturas', sortable: false },
]

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

async function cargar() {
  loading.value = true
  try {
    pagos.value = await $api<PagoDto[]>('/pagos')
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
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="pagos"
      :loading="loading"
      item-value="id"
      hover
    >
      <template #item.fechaPago="{ item }">{{ formatDate(item.fechaPago) }}</template>
      <template #item.importePago="{ item }">{{ formatMoney(item.importePago) }}</template>
      <template #item.facturas="{ item }">
        <div class="d-flex flex-wrap gap-1">
          <VChip v-if="item.facturasProveedorIds.length" v-for="(num, idx) in item.facturasProveedorNumeros" :key="idx" size="small" label>
           <span class="font-weight-bold">#{{ item.facturasProveedorIds[idx] }}</span> <span class="text-muted"> - {{ num }}</span>
          </VChip>
          <span v-else class="text-disabled">Pendiente</span>
        </div>
      </template>
      <template #bottom="{ pageCount }">
        <VDivider />
        <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 px-6 py-3">
          <div class="d-flex align-center gap-2">
            <span class="text-disabled text-body-2">Filas por página:</span>
            <AppSelect v-model="itemsPerPage" :items="[10, 25, 50, 100, { title: 'Todos', value: -1 }]" density="compact" style="width: 90px" />
          </div>
          <VPagination
            v-if="pageCount > 1"
            v-model="page"
            active-color="primary"
            :length="pageCount"
            :total-visible="$vuetify.display.xs ? 1 : Math.min(pageCount, 5)"
          />
        </div>
      </template>
    </VDataTable>
  </VCard>
</template>
