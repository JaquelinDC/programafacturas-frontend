<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto, FacturaProveedorDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Conciliacion proveedor embebida' } })

interface PropuestaFacturaProveedorPreviewDto {
  factura: FacturaProveedorDto
  score: number
  confidence: string
  reasons: string[]
}

interface ConciliacionProveedorPreviewItem {
  movimiento: ExtractoBancarioMovimientoDto
  candidatas: PropuestaFacturaProveedorPreviewDto[]
  motivo: string | null
}

const route = useRoute()
const id = computed(() => (route.params as { id: string }).id)
const extracto = ref<ExtractoBancarioDto | null>(null)
const items = ref<ConciliacionProveedorPreviewItem[]>([])
const cargando = ref(false)

const formatMoney = (n?: number) => n == null ? '-' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`

async function cargar() {
  cargando.value = true
  try {
    ;[extracto.value, items.value] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
      $api<ConciliacionProveedorPreviewItem[]>(`/extractos/${id.value}/conciliacion/preview`),
    ])
  }
  finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <VCard variant="outlined">
    <VCardText>
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-subtitle-1">{{ extracto?.banco ?? 'Extracto' }} #{{ id }}</div>
          <div class="text-body-2 text-disabled">Resumen de candidatos para conciliacion proveedor.</div>
        </div>
        <VBtn size="small" variant="tonal" :to="`/pagos/extractos/${id}/conciliacion/preview`">Abrir vista operativa</VBtn>
      </div>

      <VProgressLinear v-if="cargando" indeterminate class="mb-3" />

      <VTable v-else density="compact">
        <thead>
          <tr><th>Concepto</th><th class="text-right">Importe</th><th>Mejor sugerencia</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.movimiento.id">
            <td>{{ item.movimiento.concepto }}</td>
            <td class="text-right">{{ formatMoney(item.movimiento.importe) }}</td>
            <td>
              <span v-if="item.candidatas.length">
                {{ item.candidatas[0].factura.numeroFactura || `#${item.candidatas[0].factura.id}` }}
                ({{ item.candidatas[0].confidence }}, score {{ item.candidatas[0].score }})
              </span>
              <span v-else class="text-disabled">{{ item.motivo || 'Sin candidatas' }}</span>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
  </VCard>
</template>
