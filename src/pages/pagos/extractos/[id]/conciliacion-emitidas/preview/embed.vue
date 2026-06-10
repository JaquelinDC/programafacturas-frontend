<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Conciliación emitidas embebida' } })

const route = useRoute()
const id = computed(() => (route.params as { id: string }).id)
const extracto = ref<ExtractoBancarioDto | null>(null)
const movimientos = ref<ExtractoBancarioMovimientoDto[]>([])

async function cargar() {
  [extracto.value, movimientos.value] = await Promise.all([
    $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
    $api<ExtractoBancarioMovimientoDto[]>(`/extractos/${id.value}/movimientos/pendientes`),
  ])
}

const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

onMounted(cargar)
</script>

<template>
  <VCard variant="outlined">
    <VCardText>
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-subtitle-1">{{ extracto?.banco ?? 'Extracto' }} #{{ id }}</div>
          <div class="text-body-2 text-disabled">Vista embebida de conciliación de emitidas.</div>
        </div>
        <VBtn size="small" variant="tonal" :to="`/extractos/${id}`">Abrir extracto</VBtn>
      </div>
      <VTable density="compact">
        <thead>
          <tr><th>Concepto</th><th class="text-right">Importe</th><th>Factura</th></tr>
        </thead>
        <tbody>
          <tr v-for="mov in movimientos" :key="mov.id">
            <td>{{ mov.concepto }}</td>
            <td class="text-right">{{ formatMoney(mov.importe) }}</td>
            <td>{{ mov.facturaProveedorNumero ?? '—' }}</td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
  </VCard>
</template>
