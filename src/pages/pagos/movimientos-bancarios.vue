<script setup lang="ts">
import type { MovimientoBancarioAdminDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Movimientos Bancarios' } })

const loading = ref(false)
const movimientos = ref<MovimientoBancarioAdminDto[]>([])

const headers = [
  { title: 'Fecha', key: 'fechaMovimiento', width: 110 },
  { title: 'Banco', key: 'banco', width: 160 },
  { title: 'Concepto', key: 'concepto' },
  { title: 'Importe', key: 'importe', width: 120 },
  { title: 'Estado', key: 'estado', width: 140 },
  { title: 'Extracto', key: 'extracto', width: 90 },
  { title: 'Factura', key: 'factura', width: 120 },
]

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toFixed(2)} €`

function estado(m: MovimientoBancarioAdminDto) {
  if (m.excluidoConciliacion) return { label: 'Excluido', color: 'default' }
  if (m.conceptoNoConciliable) return { label: 'No conciliable', color: 'secondary' }
  if (m.facturaProveedorId) return { label: 'Factura', color: 'success' }
  if (m.pagoId) return { label: 'Pago', color: 'success' }
  return { label: 'Pendiente', color: 'warning' }
}

async function cargar() {
  loading.value = true
  try {
    movimientos.value = await $api<MovimientoBancarioAdminDto[]>('/pagos/movimientos-bancarios')
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
      <VCardTitle>Movimientos Bancarios</VCardTitle>
      <template #append>
        <VBtn variant="tonal" :loading="loading" @click="cargar">Actualizar</VBtn>
      </template>
    </VCardItem>

    <VDataTable
      :headers="headers"
      :items="movimientos"
      :loading="loading"
      item-value="id"
      hover
      density="compact"
    >
      <template #item.fechaMovimiento="{ item }">{{ formatDate(item.fechaMovimiento) }}</template>
      <template #item.importe="{ item }">{{ formatMoney(item.importe) }}</template>
      <template #item.estado="{ item }">
        <VChip :color="estado(item).color" size="small" label>{{ estado(item).label }}</VChip>
      </template>
      <template #item.extracto="{ item }">
        <VBtn v-if="item.extractoId" variant="text" size="small" :to="`/extractos/${item.extractoId}`" @click.stop>
          #{{ item.extractoId }}
        </VBtn>
      </template>
      <template #item.factura="{ item }">
        <VBtn v-if="item.facturaProveedorId" variant="text" size="small" :to="`/facturas/${item.facturaProveedorId}`" @click.stop>
          {{ item.facturaProveedorNumero ?? `#${item.facturaProveedorId}` }}
        </VBtn>
      </template>
    </VDataTable>
  </VCard>
</template>
