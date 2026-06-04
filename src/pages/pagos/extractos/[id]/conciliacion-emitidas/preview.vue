<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Conciliación emitidas' } })

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

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toFixed(2)} €`

onMounted(cargar)
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Conciliación de facturas emitidas</VCardTitle>
      <VCardSubtitle>{{ extracto?.banco ?? 'Extracto' }} #{{ id }}</VCardSubtitle>
      <template #append>
        <VBtn :to="`/extractos/${id}`" variant="tonal">Abrir extracto</VBtn>
      </template>
    </VCardItem>

    <VCardText>
      <div class="mb-4 text-body-2 text-disabled">
        Vista heredada para revisar movimientos que pueden asociarse a cobros de facturas emitidas.
      </div>
      <VTable density="compact">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th class="text-right">Importe</th>
            <th>Factura</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mov in movimientos" :key="mov.id">
            <td>{{ formatDate(mov.fechaMovimiento) }}</td>
            <td>{{ mov.concepto }}</td>
            <td class="text-right">{{ formatMoney(mov.importe) }}</td>
            <td>{{ mov.facturaProveedorNumero ?? '—' }}</td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
  </VCard>
</template>
