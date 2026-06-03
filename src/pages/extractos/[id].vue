<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Detalle Extracto Bancario' } })

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const extracto = ref<ExtractoBancarioDto | null>(null)
const movimientos = ref<ExtractoBancarioMovimientoDto[]>([])
const loading = ref(false)
const soloPendientes = ref(false)

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function cargarMovimientos() {
  const endpoint = soloPendientes.value
    ? `/extractos/${id.value}/movimientos/pendientes`
    : `/extractos/${id.value}/movimientos`
  movimientos.value = await $api<ExtractoBancarioMovimientoDto[]>(endpoint)
}

watch(soloPendientes, cargarMovimientos)

async function toggleExcluido(mov: ExtractoBancarioMovimientoDto) {
  const nuevoValor = !mov.excluidoConciliacion
  try {
    const updated = await $api<ExtractoBancarioMovimientoDto>(
      `/extractos/${id.value}/movimientos/${mov.id}/excluir`,
      { method: 'PATCH', params: { excluido: nuevoValor } },
    )
    const idx = movimientos.value.findIndex(m => m.id === mov.id)
    if (idx >= 0) movimientos.value[idx] = updated
    showMsg(nuevoValor ? 'Movimiento excluido de conciliación' : 'Movimiento incluido en conciliación')
  }
  catch {
    showMsg('Error al actualizar el movimiento', 'error')
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatDateTime = (d?: string) => d ? d.substring(0, 16).replace('T', ' ') : '—'
const formatMoney = (n?: number) => n == null ? '—' : `${Number(n).toFixed(2)} €`

function estadoMovimiento(mov: ExtractoBancarioMovimientoDto) {
  if (mov.excluidoConciliacion) return { label: 'Excluido', color: 'default' }
  if (mov.conceptoNoConciliable) return { label: 'No conciliable', color: 'secondary' }
  if (mov.facturaProveedorId) return { label: 'Conciliado (factura)', color: 'success' }
  if (mov.pagoId) return { label: 'Conciliado (pago)', color: 'success' }
  return { label: 'Pendiente', color: 'warning' }
}

const importeColor = (n?: number) => {
  if (n == null) return ''
  return n >= 0 ? 'text-success' : 'text-error'
}

const search = ref('')

const headers = [
  { title: 'Fecha', key: 'fechaMovimiento', width: 100 },
  { title: 'Concepto', key: 'concepto' },
  { title: 'Observaciones', key: 'observaciones' },
  { title: 'Importe', key: 'importe', width: 120 },
  { title: 'Estado', key: 'estado', sortable: false, width: 170 },
  { title: 'Factura', key: 'facturaProveedorNumero', width: 110 },
  { title: 'Excluir', key: 'excluir', sortable: false, width: 80 },
]

onMounted(async () => {
  loading.value = true
  try {
    [extracto.value] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
    ])
    await cargarMovimientos()
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="d-flex justify-center pa-8">
    <VProgressCircular indeterminate />
  </div>

  <div v-else-if="extracto">
    <!-- Cabecera -->
    <div class="d-flex align-center gap-3 mb-4">
      <VBtn icon variant="text" @click="router.push('/extractos')">
        <VIcon icon="tabler-arrow-left" />
      </VBtn>
      <div class="flex-grow-1">
        <h5 class="text-h5">{{ extracto.banco ?? 'Extracto' }} — {{ extracto.nombreFichero }}</h5>
        <span class="text-body-2 text-disabled">
          Subido: {{ formatDateTime(extracto.fechaSubida) }}
          &nbsp;·&nbsp;
          Periodo: {{ formatDate(extracto.fechaInicioMovimientos) }} → {{ formatDate(extracto.fechaFinMovimientos) }}
        </span>
      </div>
    </div>

    <!-- Movimientos -->
    <VCard>
      <VCardItem>
        <VCardTitle>Movimientos</VCardTitle>
        <template #append>
          <div class="d-flex align-center gap-4">
            <span class="text-body-2 text-disabled">{{ movimientos.length }} movimientos</span>
            <VSwitch
              v-model="soloPendientes"
              label="Solo pendientes"
              color="warning"
              density="compact"
              hide-details
            />
          </div>
        </template>
      </VCardItem>

      <VCardText>
        <VRow>
          <VCol cols="12" offset-md="8" md="4">
            <AppTextField
              v-model="search"
              placeholder="Buscar..."
              append-inner-icon="tabler-search"
              single-line
              hide-details
              dense
              outlined
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDataTable
        :headers="headers"
        :items="movimientos"
        :search="search"
        item-value="id"
        hover
        density="compact"
      >
        <template #item.fechaMovimiento="{ item }">{{ formatDate(item.fechaMovimiento) }}</template>

        <template #item.importe="{ item }">
          <span :class="importeColor(item.importe)">
            {{ formatMoney(item.importe) }}
          </span>
        </template>

        <template #item.estado="{ item }">
          <VChip
            :color="estadoMovimiento(item).color"
            size="small"
            label
          >
            {{ estadoMovimiento(item).label }}
          </VChip>
        </template>

        <template #item.facturaProveedorNumero="{ item }">
          <VBtn
            v-if="item.facturaProveedorId"
            variant="text"
            size="small"
            :to="`/facturas/${item.facturaProveedorId}`"
            @click.stop
          >
            {{ item.facturaProveedorNumero ?? `#${item.facturaProveedorId}` }}
          </VBtn>
          <span v-else class="text-disabled">—</span>
        </template>

        <template #item.excluir="{ item }">
          <VTooltip
            :text="item.excluidoConciliacion ? 'Incluir en conciliación' : 'Excluir de conciliación'"
            location="top"
          >
            <template #activator="{ props }">
              <VSwitch
                v-bind="props"
                :model-value="item.excluidoConciliacion"
                color="error"
                density="compact"
                hide-details
                @update:model-value="toggleExcluido(item)"
                @click.stop
              />
            </template>
          </VTooltip>
        </template>
      </VDataTable>
    </VCard>
  </div>

  <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
    {{ snackbarMsg }}
  </VSnackbar>
</template>
