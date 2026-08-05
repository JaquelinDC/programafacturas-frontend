<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import PanelBusquedaManualConciliacion from '@/components/conciliacion/PanelBusquedaManualConciliacion.vue'
import FiltrosBusquedaConciliacion from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import type { FiltrosConciliacion } from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import EnlaceAltaManualFactura from '@/components/conciliacion/EnlaceAltaManualFactura.vue'
import type {
  ConciliacionFacturaDto,
  ConciliacionMovimientoDto,
  ConciliacionResumenDto,
  TipoFacturaConciliacion,
} from '@/types/api'

definePage({ meta: { title: 'Conciliar' } })

const api = useConciliacion()
const tab = ref<'factura' | 'movimiento'>('factura')
const tipo = ref<TipoFacturaConciliacion>('PROVEEDOR')

const resumen = ref<ConciliacionResumenDto>({
  facturasProveedorPendientes: 0,
  facturasEmitidasPendientes: 0,
  movimientosPendientes: 0,
})

const facturas = ref<ConciliacionFacturaDto[]>([])
const movimientos = ref<ConciliacionMovimientoDto[]>([])
const facturaActiva = ref<ConciliacionFacturaDto>()
const movimientoActivo = ref<ConciliacionMovimientoDto>()
const qFacturas = ref('')
const qMovimientos = ref('')
const filtrosFacturas = ref<FiltrosConciliacion>({})
const filtrosMovimientos = ref<FiltrosConciliacion>({})
const incluirFacturas = ref(false)
const incluirMovimientos = ref(false)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const mensaje = ref('')
const cajaDialog = ref(false)
const cajaComentario = ref('')

const pageFacturas = ref(1)
const itemsPerPageFacturas = ref(20)
const totalItemsFacturas = ref(0)
const pageMovimientos = ref(1)
const itemsPerPageMovimientos = ref(20)
const totalItemsMovimientos = ref(0)

const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
]

const tipoItems = [
  { title: 'Facturas de proveedor', value: 'PROVEEDOR' },
  { title: 'Facturas emitidas', value: 'EMITIDA' },
]

const formatDate = (value?: string) => value ? value.substring(0, 10).split('-').reverse().join('/') : '—'

const formatMoney = (value?: number) => value == null
  ? '—'
  : `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function colorEstado(value?: string) {
  if (['PENDIENTE', 'VALIDADA', 'SOLICITADA_FACTURA'].includes(value || ''))
    return 'warning'
  if (['EXCLUIDO', 'NO_CONCILIABLE'].includes(value || ''))
    return 'secondary'
  if (value === 'PAGO')
    return 'info'

  return 'success'
}

function getError(err: any, fallback: string) {
  return err?.data?.message || err?.message || fallback
}

const puedeMarcarCaja = computed(() =>
  tab.value === 'factura' && tipo.value === 'PROVEEDOR' && facturaActiva.value && !facturaActiva.value.conciliada,
)

async function cargarResumen() {
  resumen.value = await api.resumen()
}

async function buscarFacturas() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.buscarFacturas(
      tipo.value,
      { q: qFacturas.value, ...filtrosFacturas.value, page: pageFacturas.value - 1, size: itemsPerPageFacturas.value },
      incluirFacturas.value,
    )

    facturas.value = response.content
    totalItemsFacturas.value = response.totalElements
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudieron buscar las facturas.')
  }
  finally {
    loading.value = false
  }
}

async function buscarMovimientos() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.buscarMovimientos(
      { q: qMovimientos.value, ...filtrosMovimientos.value, page: pageMovimientos.value - 1, size: itemsPerPageMovimientos.value },
      incluirMovimientos.value,
    )

    movimientos.value = response.content
    totalItemsMovimientos.value = response.totalElements
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudieron buscar los movimientos.')
  }
  finally {
    loading.value = false
  }
}

function buscarFacturasDesdePagina1() {
  pageFacturas.value = 1

  return buscarFacturas()
}

function buscarMovimientosDesdePagina1() {
  pageMovimientos.value = 1

  return buscarMovimientos()
}

function elegirFactura(item: ConciliacionFacturaDto) {
  facturaActiva.value = item
  movimientoActivo.value = undefined
}

function elegirMovimiento(item: ConciliacionMovimientoDto) {
  movimientoActivo.value = item
  facturaActiva.value = undefined
}

async function refrescarTodo() {
  await Promise.all([cargarResumen(), buscarFacturas(), buscarMovimientos()])
}

async function alConciliar() {
  mensaje.value = 'Conciliación completada.'
  await refrescarTodo()
  if (facturaActiva.value)
    facturaActiva.value = facturas.value.find(item => item.id === facturaActiva.value?.id)
  if (movimientoActivo.value)
    movimientoActivo.value = movimientos.value.find(item => item.id === movimientoActivo.value?.id)
}

async function desconciliar(tipoFactura: TipoFacturaConciliacion, facturaId: number, movimientoId: number) {
  actionLoading.value = true
  error.value = ''
  try {
    const response = await api.desenlazar({ tipoFactura, facturaId, movimientoId })

    mensaje.value = response.mensaje
    await refrescarTodo()
    if (facturaActiva.value)
      facturaActiva.value = facturas.value.find(item => item.id === facturaActiva.value?.id)
    if (movimientoActivo.value)
      movimientoActivo.value = movimientos.value.find(item => item.id === movimientoActivo.value?.id)
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudo eliminar la conciliación.')
  }
  finally {
    actionLoading.value = false
  }
}

function abrirCaja() {
  cajaComentario.value = ''
  cajaDialog.value = true
}

async function marcarCaja() {
  if (!facturaActiva.value)
    return
  actionLoading.value = true
  error.value = ''
  try {
    await api.marcarCaja(facturaActiva.value.id, cajaComentario.value || undefined)
    mensaje.value = 'Factura marcada como pagada en caja.'
    cajaDialog.value = false
    await refrescarTodo()
    facturaActiva.value = undefined
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudo marcar la factura a caja.')
  }
  finally {
    actionLoading.value = false
  }
}

watch(tipo, async () => {
  facturaActiva.value = undefined
  movimientoActivo.value = undefined
  await buscarFacturasDesdePagina1()
})

onMounted(refrescarTodo)
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-center flex-wrap gap-3 mb-4">
      <div>
        <h1 class="text-h4 mb-1">
          Conciliar
        </h1>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Vincula manualmente facturas y movimientos, partiendo de cualquiera de los dos.
        </p>
      </div>
      <VBtn
        prepend-icon="tabler-refresh"
        variant="tonal"
        :loading="loading"
        @click="refrescarTodo"
      >
        Actualizar
      </VBtn>
    </div>

    <VRow class="mb-2">
      <VCol
        v-for="card in [
          { value: resumen.facturasProveedorPendientes, label: 'Facturas proveedor pendientes', icon: 'tabler-file-invoice', color: 'warning' },
          { value: resumen.facturasEmitidasPendientes, label: 'Emitidas pendientes de cobro', icon: 'tabler-file-text', color: 'info' },
          { value: resumen.movimientosPendientes, label: 'Movimientos pendientes', icon: 'tabler-building-bank', color: 'primary' },
        ]"
        :key="card.label"
        cols="12"
        md="4"
      >
        <VCard
          :color="card.color"
          variant="tonal"
        >
          <VCardText class="d-flex align-center gap-4">
            <VAvatar
              :color="card.color"
              variant="flat"
            >
              <VIcon :icon="card.icon" />
            </VAvatar>
            <div>
              <div class="text-h4">
                {{ card.value }}
              </div><div>{{ card.label }}</div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mb-4">
      <VCardText class="d-flex flex-wrap gap-2">
        <VBtn
          to="/facturas/conciliacion-extracto-importe"
          variant="tonal"
          prepend-icon="tabler-wand"
        >
          Propuestas por factura
        </VBtn>
        <VBtn
          to="/extractos"
          variant="tonal"
          prepend-icon="tabler-file-spreadsheet"
        >
          Conciliar por extracto
        </VBtn>
        <VBtn
          to="/pagos/conciliacion-conceptos"
          variant="tonal"
          prepend-icon="tabler-ban"
        >
          Conceptos no conciliables
        </VBtn>
        <VSpacer />
        <EnlaceAltaManualFactura />
      </VCardText>
    </VCard>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="error = ''"
    >
      {{ error }}
    </VAlert>
    <VAlert
      v-if="mensaje"
      type="success"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="mensaje = ''"
    >
      {{ mensaje }}
    </VAlert>

    <VCard>
      <VTabs
        v-model="tab"
        grow
      >
        <VTab
          value="factura"
          prepend-icon="tabler-file-search"
        >
          Por factura
        </VTab>
        <VTab
          value="movimiento"
          prepend-icon="tabler-list-search"
        >
          Por movimiento
        </VTab>
      </VTabs>
      <VDivider />
      <VCardText>
        <AppSelect
          v-model="tipo"
          :items="tipoItems"
          label="Tipo de factura"
          class="mb-4"
          style="max-width: 320px;"
        />
        <VRow>
          <VCol
            cols="12"
            lg="5"
          >
            <div class="text-subtitle-1 font-weight-medium mb-2">
              1. Buscar {{ tab === 'factura' ? 'factura' : 'movimiento' }}
            </div>
            <template v-if="tab === 'factura'">
              <div class="d-flex gap-2 mb-2">
                <AppTextField
                  v-model="qFacturas"
                  label="Número, tercero, importe o ID"
                  clearable
                  @keyup.enter="buscarFacturasDesdePagina1"
                />
                <VBtn
                  icon="tabler-search"
                  :loading="loading"
                  @click="buscarFacturasDesdePagina1"
                />
              </div>
              <FiltrosBusquedaConciliacion
                v-model="filtrosFacturas"
                :mostrar-proveedor="tipo === 'PROVEEDOR'"
                class="mb-2"
                @update:model-value="buscarFacturasDesdePagina1"
              />
              <VSwitch
                v-model="incluirFacturas"
                label="Incluir conciliadas"
                density="compact"
                hide-details
                class="mb-3"
                @update:model-value="buscarFacturasDesdePagina1"
              />
              <VList
                lines="two"
                border
              >
                <VListItem
                  v-for="factura in facturas"
                  :key="factura.id"
                  :active="facturaActiva?.id === factura.id"
                  @click="elegirFactura(factura)"
                >
                  <VListItemTitle>{{ factura.numero || `Factura #${factura.id}` }} · {{ formatMoney(factura.importe) }}</VListItemTitle>
                  <VListItemSubtitle>{{ factura.tercero || 'Sin tercero' }} · {{ formatDate(factura.fecha) }}</VListItemSubtitle>
                  <template #append>
                    <VChip
                      size="x-small"
                      :color="colorEstado(factura.estado)"
                      variant="tonal"
                    >
                      {{ factura.estado }}
                    </VChip>
                  </template>
                </VListItem>
                <VListItem v-if="!facturas.length">
                  <VListItemTitle class="text-disabled">
                    No hay resultados
                  </VListItemTitle>
                </VListItem>
              </VList>
              <div class="d-flex align-center justify-space-between flex-wrap gap-2 mt-2">
                <div class="d-flex align-center gap-2">
                  <span class="text-disabled text-body-2">Por página:</span>
                  <AppSelect
                    v-model="itemsPerPageFacturas"
                    :items="itemsPerPageOptions"
                    density="compact"
                    style="width: 90px;"
                    @update:model-value="buscarFacturasDesdePagina1"
                  />
                </div>
                <VPagination
                  v-if="totalItemsFacturas > itemsPerPageFacturas"
                  v-model="pageFacturas"
                  active-color="primary"
                  density="compact"
                  :length="Math.ceil(totalItemsFacturas / itemsPerPageFacturas)"
                  :total-visible="5"
                  @update:model-value="buscarFacturas"
                />
              </div>
            </template>
            <template v-else>
              <div class="d-flex gap-2 mb-2">
                <AppTextField
                  v-model="qMovimientos"
                  label="ID, concepto, banco o importe"
                  clearable
                  @keyup.enter="buscarMovimientosDesdePagina1"
                />
                <VBtn
                  icon="tabler-search"
                  :loading="loading"
                  @click="buscarMovimientosDesdePagina1"
                />
              </div>
              <FiltrosBusquedaConciliacion
                v-model="filtrosMovimientos"
                :mostrar-proveedor="false"
                class="mb-2"
                @update:model-value="buscarMovimientosDesdePagina1"
              />
              <VSwitch
                v-model="incluirMovimientos"
                label="Incluir conciliados"
                density="compact"
                hide-details
                class="mb-3"
                @update:model-value="buscarMovimientosDesdePagina1"
              />
              <VList
                lines="three"
                border
              >
                <VListItem
                  v-for="movimiento in movimientos"
                  :key="movimiento.id"
                  :active="movimientoActivo?.id === movimiento.id"
                  @click="elegirMovimiento(movimiento)"
                >
                  <VListItemTitle>Mov. #{{ movimiento.id }} · {{ formatMoney(movimiento.importe) }}</VListItemTitle>
                  <VListItemSubtitle>{{ movimiento.concepto || 'Sin concepto' }}</VListItemSubtitle>
                  <VListItemSubtitle>{{ movimiento.banco }} · {{ formatDate(movimiento.fecha) }}</VListItemSubtitle>
                  <template #append>
                    <VChip
                      size="x-small"
                      :color="colorEstado(movimiento.estado)"
                      variant="tonal"
                    >
                      {{ movimiento.estado }}
                    </VChip>
                  </template>
                </VListItem>
                <VListItem v-if="!movimientos.length">
                  <VListItemTitle class="text-disabled">
                    No hay resultados
                  </VListItemTitle>
                </VListItem>
              </VList>
              <div class="d-flex align-center justify-space-between flex-wrap gap-2 mt-2">
                <div class="d-flex align-center gap-2">
                  <span class="text-disabled text-body-2">Por página:</span>
                  <AppSelect
                    v-model="itemsPerPageMovimientos"
                    :items="itemsPerPageOptions"
                    density="compact"
                    style="width: 90px;"
                    @update:model-value="buscarMovimientosDesdePagina1"
                  />
                </div>
                <VPagination
                  v-if="totalItemsMovimientos > itemsPerPageMovimientos"
                  v-model="pageMovimientos"
                  active-color="primary"
                  density="compact"
                  :length="Math.ceil(totalItemsMovimientos / itemsPerPageMovimientos)"
                  :total-visible="5"
                  @update:model-value="buscarMovimientos"
                />
              </div>
            </template>
          </VCol>

          <VCol
            cols="12"
            lg="7"
          >
            <VAlert
              v-if="tab === 'factura' && !facturaActiva"
              type="info"
              variant="tonal"
            >
              Selecciona una factura para buscar sus movimientos.
            </VAlert>
            <VAlert
              v-else-if="tab === 'movimiento' && !movimientoActivo"
              type="info"
              variant="tonal"
            >
              Selecciona un movimiento para buscar sus facturas.
            </VAlert>
            <template v-else>
              <div class="d-flex justify-space-between align-center flex-wrap gap-3 mb-3">
                <div>
                  <div class="text-subtitle-1 font-weight-medium">
                    Elemento seleccionado
                  </div>
                  <div class="text-body-2 text-disabled">
                    {{ tab === 'factura'
                      ? `${facturaActiva?.numero || `#${facturaActiva?.id}`} · ${formatMoney(facturaActiva?.importe)}`
                      : `Movimiento #${movimientoActivo?.id} · ${formatMoney(movimientoActivo?.importe)}` }}
                  </div>
                </div>
                <VBtn
                  v-if="puedeMarcarCaja"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="tabler-cash"
                  @click="abrirCaja"
                >
                  A caja
                </VBtn>
              </div>
              <VDivider class="my-4" />
              <div class="text-subtitle-2 mb-2">
                Relaciones actuales
              </div>
              <div
                v-if="facturaActiva?.movimientoIds.length"
                class="d-flex flex-wrap gap-2 mb-4"
              >
                <VChip
                  v-for="movimientoId in facturaActiva.movimientoIds"
                  :key="movimientoId"
                  closable
                  color="success"
                  :disabled="actionLoading"
                  @click:close="desconciliar(tipo, facturaActiva!.id, movimientoId)"
                >
                  Movimiento #{{ movimientoId }}
                </VChip>
              </div>
              <div
                v-else-if="movimientoActivo?.facturas.length"
                class="d-flex flex-wrap gap-2 mb-4"
              >
                <VChip
                  v-for="factura in movimientoActivo.facturas"
                  :key="`${factura.tipo}-${factura.id}`"
                  closable
                  color="success"
                  :disabled="actionLoading"
                  @click:close="desconciliar(factura.tipo, factura.id, movimientoActivo!.id)"
                >
                  {{ factura.tipo === 'PROVEEDOR' ? 'Proveedor' : 'Emitida' }} · {{ factura.numero || `#${factura.id}` }}
                </VChip>
              </div>
              <div
                v-else
                class="text-body-2 text-disabled mb-4"
              >
                Sin relaciones actuales.
              </div>

              <VDivider class="mb-4" />
              <div class="text-subtitle-2 mb-2">
                Buscar y vincular manualmente
              </div>
              <PanelBusquedaManualConciliacion
                :tipo-factura="tipo"
                :modo="tab"
                :elemento="tab === 'factura' ? facturaActiva : movimientoActivo"
                @conciliado="alConciliar"
              />
            </template>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VDialog
      v-model="cajaDialog"
      max-width="480"
    >
      <VCard>
        <VCardTitle>Marcar factura a caja</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-3">
            La factura se marcará como pagada con el tipo de pago "Caja / otros", sin vincularla a ningún movimiento bancario.
          </p>
          <AppTextarea
            v-model="cajaComentario"
            label="Comentario (opcional)"
            rows="3"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="cajaDialog = false"
          >
            Cancelar
          </VBtn>
          <VBtn
            color="primary"
            :loading="actionLoading"
            @click="marcarCaja"
          >
            Confirmar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
