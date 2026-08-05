<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto, FacturaProveedorDto, PageResponse } from '@/types/api'
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

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '-'
const formatMoney = (n?: number) => n == null ? '-' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
const confidenceColor = (confidence?: string) => confidence === 'alta' ? 'success' : confidence === 'media' ? 'warning' : 'secondary'

async function cargar() {
  cargando.value = true
  try {
    const [extractoResp, response] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
      $api<PageResponse<ConciliacionProveedorPreviewItem>>(`/extractos/${id.value}/conciliacion/preview`, {
        params: { size: 100 },
      }),
    ])

    extracto.value = extractoResp
    items.value = response.content
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
          <div class="text-subtitle-1">
            {{ extracto?.banco ?? 'Extracto' }} #{{ id }}
          </div>
          <div class="text-body-2 text-disabled">
            Resumen de candidatos para conciliacion proveedor.
          </div>
        </div>
        <VBtn
          size="small"
          variant="tonal"
          :to="`/pagos/extractos/${id}/conciliacion/preview`"
        >
          Abrir vista operativa
        </VBtn>
      </div>

      <VProgressLinear
        v-if="cargando"
        indeterminate
        class="mb-3"
      />

      <VTable
        v-else
        density="compact"
      >
        <thead>
          <tr>
            <th style="width: 100px;">
              Fecha
            </th>
            <th>Concepto</th>
            <th
              class="text-right"
              style="width: 120px;"
            >
              Importe
            </th>
            <th>Mejor sugerencia</th>
            <th style="width: 150px;">
              Confianza
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.movimiento.id"
          >
            <td>{{ formatDate(item.movimiento.fechaMovimiento) }}</td>
            <td class="text-body-2">
              {{ item.movimiento.concepto }}
            </td>
            <td class="text-right">
              {{ formatMoney(item.movimiento.importe) }}
            </td>
            <td>
              <span
                v-if="item.candidatas.length"
                class="text-body-2"
              >
                {{ item.candidatas[0].factura.numeroFactura || `#${item.candidatas[0].factura.id}` }}
              </span>
              <span
                v-else
                class="text-caption text-disabled"
              >{{ item.motivo || 'Sin candidatas' }}</span>
            </td>
            <td>
              <div
                v-if="item.candidatas.length"
                class="d-flex align-center ga-2"
              >
                <VChip
                  size="x-small"
                  :color="confidenceColor(item.candidatas[0].confidence)"
                  variant="tonal"
                >
                  {{ item.candidatas[0].confidence || 'baja' }}
                </VChip>
                <span class="text-caption">score {{ item.candidatas[0].score }}</span>
              </div>
              <span
                v-else
                class="text-caption text-disabled"
              >-</span>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
  </VCard>
</template>
