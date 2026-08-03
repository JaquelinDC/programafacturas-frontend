<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import type {
  ConciliacionCandidatoFacturaDto,
  ConciliacionCandidatoMovimientoDto,
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
const candidatosMov = ref<ConciliacionCandidatoMovimientoDto[]>([])
const candidatosFac = ref<ConciliacionCandidatoFacturaDto[]>([])
const seleccionMov = ref<number[]>([])
const seleccionFac = ref<number[]>([])
const qFacturas = ref('')
const qMovimientos = ref('')
const qCandidatos = ref('')
const incluirFacturas = ref(false)
const incluirMovimientos = ref(false)
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const mensaje = ref('')
const busquedaDialog = ref(false)
const confirmDialog = ref(false)
const confirmacionManual = ref(false)
const avisos = ref<string[]>([])

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

async function cargarResumen() {
  resumen.value = await api.resumen()
}

async function buscarFacturas() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.buscarFacturas(tipo.value, { q: qFacturas.value, size: 100 }, incluirFacturas.value)

    facturas.value = response.content
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
    const response = await api.buscarMovimientos({ q: qMovimientos.value, size: 100 }, incluirMovimientos.value)

    movimientos.value = response.content
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudieron buscar los movimientos.')
  }
  finally {
    loading.value = false
  }
}

async function elegirFactura(item: ConciliacionFacturaDto) {
  facturaActiva.value = item
  movimientoActivo.value = undefined
  qCandidatos.value = ''
  seleccionMov.value = []
  await abrirBusquedaManual()
}

async function elegirMovimiento(item: ConciliacionMovimientoDto) {
  movimientoActivo.value = item
  facturaActiva.value = undefined
  qCandidatos.value = ''
  seleccionFac.value = []
  await abrirBusquedaManual()
}

async function abrirBusquedaManual() {
  qCandidatos.value = ''
  busquedaDialog.value = true
  if (tab.value === 'factura')
    await buscarCandidatosMovimiento()
  else
    await buscarCandidatosFactura()
}

async function buscarCandidatosMovimiento() {
  if (!facturaActiva.value)
    return
  loading.value = true
  error.value = ''
  try {
    const response = await api.candidatosMovimientos(
      tipo.value,
      facturaActiva.value.id,
      { q: qCandidatos.value, size: 100 },
    )

    candidatosMov.value = response.content
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudieron buscar movimientos candidatos.')
  }
  finally {
    loading.value = false
  }
}

async function buscarCandidatosFactura() {
  if (!movimientoActivo.value)
    return
  loading.value = true
  error.value = ''
  try {
    const response = await api.candidatosFacturas(
      movimientoActivo.value.id,
      tipo.value,
      { q: qCandidatos.value, size: 100 },
    )

    candidatosFac.value = response.content
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudieron buscar facturas candidatas.')
  }
  finally {
    loading.value = false
  }
}

function toggleMovimiento(id: number, checked: boolean) {
  if (tipo.value === 'EMITIDA') {
    seleccionMov.value = checked ? [id] : []

    return
  }
  const next = new Set(seleccionMov.value)

  checked ? next.add(id) : next.delete(id)
  seleccionMov.value = [...next]
}

function toggleFactura(id: number, checked: boolean) {
  const next = new Set(seleccionFac.value)

  checked ? next.add(id) : next.delete(id)
  seleccionFac.value = [...next]
}

function prepararConfirmacion() {
  const coincidencias = tab.value === 'factura'
    ? candidatosMov.value.filter(item => seleccionMov.value.includes(item.movimiento.id)).map(item => item.coincidencia)
    : candidatosFac.value.filter(item => seleccionFac.value.includes(item.factura.id)).map(item => item.coincidencia)

  confirmacionManual.value = coincidencias.some(item => item.requiereConfirmacion)
  avisos.value = [...new Set(coincidencias.flatMap(item => item.avisos))]
  confirmDialog.value = true
}

async function refrescarTodo() {
  await Promise.all([cargarResumen(), buscarFacturas(), buscarMovimientos()])
  if (tab.value === 'factura')
    await buscarCandidatosMovimiento()
  else await buscarCandidatosFactura()
}

async function conciliar() {
  actionLoading.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const response = await api.enlazar({
      tipoFactura: tipo.value,
      facturaIds: tab.value === 'factura' ? [facturaActiva.value!.id] : seleccionFac.value,
      movimientoIds: tab.value === 'movimiento' ? [movimientoActivo.value!.id] : seleccionMov.value,
      confirmarManual: confirmacionManual.value,
    })

    mensaje.value = response.mensaje
    seleccionMov.value = []
    seleccionFac.value = []
    confirmDialog.value = false
    busquedaDialog.value = false
    await refrescarTodo()
  }
  catch (err: any) {
    error.value = getError(err, 'No se pudo completar la conciliación.')
    confirmDialog.value = false
  }
  finally {
    actionLoading.value = false
  }
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

watch(tipo, async () => {
  facturaActiva.value = undefined
  movimientoActivo.value = undefined
  candidatosMov.value = []
  candidatosFac.value = []
  await buscarFacturas()
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
                  @keyup.enter="buscarFacturas"
                />
                <VBtn
                  icon="tabler-search"
                  :loading="loading"
                  @click="buscarFacturas"
                />
              </div>
              <VSwitch
                v-model="incluirFacturas"
                label="Incluir conciliadas"
                density="compact"
                hide-details
                class="mb-3"
                @update:model-value="buscarFacturas"
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
                    <div class="d-flex align-center gap-2">
                      <VChip
                        size="x-small"
                        :color="colorEstado(factura.estado)"
                        variant="tonal"
                      >
                        {{ factura.estado }}
                      </VChip>
                      <IconBtn
                        title="Buscar movimientos para esta factura"
                        aria-label="Buscar movimientos para esta factura"
                        @click.stop="elegirFactura(factura)"
                      >
                        <VIcon icon="tabler-search" />
                      </IconBtn>
                    </div>
                  </template>
                </VListItem>
                <VListItem v-if="!facturas.length">
                  <VListItemTitle class="text-disabled">
                    No hay resultados
                  </VListItemTitle>
                </VListItem>
              </VList>
            </template>
            <template v-else>
              <div class="d-flex gap-2 mb-2">
                <AppTextField
                  v-model="qMovimientos"
                  label="ID, concepto, banco o importe"
                  clearable
                  @keyup.enter="buscarMovimientos"
                />
                <VBtn
                  icon="tabler-search"
                  :loading="loading"
                  @click="buscarMovimientos"
                />
              </div>
              <VSwitch
                v-model="incluirMovimientos"
                label="Incluir conciliados"
                density="compact"
                hide-details
                class="mb-3"
                @update:model-value="buscarMovimientos"
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
                    <div class="d-flex align-center gap-2">
                      <VChip
                        size="x-small"
                        :color="colorEstado(movimiento.estado)"
                        variant="tonal"
                      >
                        {{ movimiento.estado }}
                      </VChip>
                      <IconBtn
                        title="Buscar facturas para este movimiento"
                        aria-label="Buscar facturas para este movimiento"
                        @click.stop="elegirMovimiento(movimiento)"
                      >
                        <VIcon icon="tabler-search" />
                      </IconBtn>
                    </div>
                  </template>
                </VListItem>
                <VListItem v-if="!movimientos.length">
                  <VListItemTitle class="text-disabled">
                    No hay resultados
                  </VListItemTitle>
                </VListItem>
              </VList>
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
              <div class="d-flex justify-space-between align-center gap-3 mb-3">
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
                  color="primary"
                  prepend-icon="tabler-search"
                  @click="abrirBusquedaManual"
                >
                  Buscar manualmente
                </VBtn>
              </div>
              <VDivider class="my-4" />
              <div class="text-subtitle-2 mb-2">
                Relaciones actuales
              </div>
              <div
                v-if="facturaActiva?.movimientoIds.length"
                class="d-flex flex-wrap gap-2"
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
                class="d-flex flex-wrap gap-2"
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
                class="text-body-2 text-disabled"
              >
                Sin relaciones actuales.
              </div>
            </template>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VDialog
      v-model="busquedaDialog"
      max-width="1000"
      scrollable
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          Buscar {{ tab === 'factura' ? 'movimientos para la factura' : 'facturas para el movimiento' }}
          <VSpacer />
          <IconBtn @click="busquedaDialog = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </VCardTitle>
        <VCardSubtitle>
          {{ tab === 'factura'
            ? `${facturaActiva?.numero || `Factura #${facturaActiva?.id}`} · ${formatMoney(facturaActiva?.importe)}`
            : `Movimiento #${movimientoActivo?.id} · ${formatMoney(movimientoActivo?.importe)}` }}
        </VCardSubtitle>
        <VCardText>
          <div class="d-flex gap-2 mb-4">
            <AppTextField
              v-model="qCandidatos"
              :label="tab === 'factura' ? 'ID, concepto, banco, extracto o importe' : 'Número, tercero, CIF, referencia, importe o ID'"
              clearable
              @keyup.enter="tab === 'factura' ? buscarCandidatosMovimiento() : buscarCandidatosFactura()"
            />
            <VBtn
              variant="tonal"
              prepend-icon="tabler-search"
              :loading="loading"
              @click="tab === 'factura' ? buscarCandidatosMovimiento() : buscarCandidatosFactura()"
            >
              Buscar
            </VBtn>
          </div>

          <VProgressLinear
            v-if="loading"
            indeterminate
            class="mb-3"
          />

          <template v-if="tab === 'factura'">
            <VCard
              v-for="item in candidatosMov"
              :key="item.movimiento.id"
              variant="outlined"
              class="mb-2"
            >
              <VCardText class="d-flex gap-3">
                <VCheckboxBtn
                  :model-value="seleccionMov.includes(item.movimiento.id)"
                  @update:model-value="toggleMovimiento(item.movimiento.id, Boolean($event))"
                />
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between gap-2">
                    <div><strong>Mov. #{{ item.movimiento.id }}</strong> · {{ item.movimiento.concepto || 'Sin concepto' }}</div>
                    <strong>{{ formatMoney(item.movimiento.importe) }}</strong>
                  </div>
                  <div class="text-caption text-disabled">
                    {{ item.movimiento.banco }} · {{ formatDate(item.movimiento.fecha) }} · Extracto #{{ item.movimiento.extractoId }}
                  </div>
                  <div
                    v-if="item.coincidencia.avisos.length"
                    class="text-caption text-warning mt-1"
                  >
                    {{ item.coincidencia.avisos.join(' · ') }}
                  </div>
                  <VChip
                    size="x-small"
                    class="mt-1"
                    :color="item.coincidencia.requiereConfirmacion ? 'warning' : 'success'"
                    variant="tonal"
                  >
                    {{ item.coincidencia.requiereConfirmacion ? 'Requiere confirmación manual' : 'Coincidencia completa' }}
                  </VChip>
                </div>
              </VCardText>
            </VCard>
            <div
              v-if="!loading && !candidatosMov.length"
              class="text-center text-disabled py-8"
            >
              No se encontraron movimientos.
            </div>
          </template>
          <template v-else>
            <VCard
              v-for="item in candidatosFac"
              :key="item.factura.id"
              variant="outlined"
              class="mb-2"
            >
              <VCardText class="d-flex gap-3">
                <VCheckboxBtn
                  :model-value="seleccionFac.includes(item.factura.id)"
                  @update:model-value="toggleFactura(item.factura.id, Boolean($event))"
                />
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between gap-2">
                    <div><strong>{{ item.factura.numero || `Factura #${item.factura.id}` }}</strong> · {{ item.factura.tercero }}</div>
                    <strong>{{ formatMoney(item.factura.importe) }}</strong>
                  </div>
                  <div class="text-caption text-disabled">
                    {{ formatDate(item.factura.fecha) }} · {{ item.factura.estado }}
                  </div>
                  <div
                    v-if="item.coincidencia.avisos.length"
                    class="text-caption text-warning mt-1"
                  >
                    {{ item.coincidencia.avisos.join(' · ') }}
                  </div>
                  <VChip
                    size="x-small"
                    class="mt-1"
                    :color="item.coincidencia.requiereConfirmacion ? 'warning' : 'success'"
                    variant="tonal"
                  >
                    {{ item.coincidencia.requiereConfirmacion ? 'Requiere confirmación manual' : 'Coincidencia completa' }}
                  </VChip>
                </div>
              </VCardText>
            </VCard>
            <div
              v-if="!loading && !candidatosFac.length"
              class="text-center text-disabled py-8"
            >
              No se encontraron facturas.
            </div>
          </template>
        </VCardText>
        <VCardActions>
          <VBtn
            variant="text"
            @click="busquedaDialog = false"
          >
            Cerrar
          </VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            prepend-icon="tabler-link"
            :disabled="tab === 'factura' ? !seleccionMov.length : !seleccionFac.length"
            @click="prepararConfirmacion"
          >
            Conciliar seleccionados
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="confirmDialog"
      max-width="620"
    >
      <VCard>
        <VCardTitle>Confirmar conciliación</VCardTitle>
        <VCardText>
          Se crearán los vínculos seleccionados.
          <VAlert
            v-if="confirmacionManual"
            type="warning"
            variant="tonal"
            class="mt-3"
          >
            <div class="font-weight-medium mb-2">
              Hay diferencias que debes comprobar
            </div>
            <ul class="ps-5 mb-2">
              <li
                v-for="aviso in avisos"
                :key="aviso"
              >
                {{ aviso }}
              </li>
            </ul>
            La operación se guardará como conciliación manual forzada.
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="confirmDialog = false"
          >
            Cancelar
          </VBtn>
          <VBtn
            color="primary"
            :loading="actionLoading"
            @click="conciliar"
          >
            {{ confirmacionManual ? 'Forzar conciliación' : 'Conciliar' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
