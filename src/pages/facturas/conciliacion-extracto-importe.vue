<script setup lang="ts">
import type { ConciliacionFacturaDto, FacturaConciliacionImporteDto, PageResponse } from '@/types/api'
import { $api } from '@/utils/api'
import { useConciliacion } from '@/composables/useConciliacion'
import BadgeCoincidenciaConciliacion from '@/components/conciliacion/BadgeCoincidenciaConciliacion.vue'
import BotonDescartarSugerencia from '@/components/conciliacion/BotonDescartarSugerencia.vue'
import EnlaceAltaManualFactura from '@/components/conciliacion/EnlaceAltaManualFactura.vue'
import FiltrosBusquedaConciliacion from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import type { FiltrosConciliacion } from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import PanelBusquedaManualConciliacion from '@/components/conciliacion/PanelBusquedaManualConciliacion.vue'

definePage({ meta: { title: 'Conciliación de facturas y movimientos' } })

const loading = ref(false)
const items = ref<FacturaConciliacionImporteDto[]>([])
const selectedMovimientosPorFactura = ref<Record<number, number[]>>({})
const facturaIdsAConciliar = ref<number[]>([])
const confirmDialog = ref(false)
const actionLoading = ref(false)
const soloConflictos = ref(false)
const automatico = ref(true)
const usarFecha = ref(true)
const usarImporte = ref(true)
const usarConceptos = ref(true)
const filtros = ref<FiltrosConciliacion>({})
const busquedaManualDialog = ref(false)
const facturaParaBusquedaManual = ref<ConciliacionFacturaDto>()

const page = ref(1)
const itemsPerPage = ref(20)
const totalItems = ref(0)

const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
]

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

const pdfDialogOpen = ref(false)
const pdfUrl = ref('')
const pdfLoadingId = ref<number | null>(null)

watch(pdfDialogOpen, open => {
  if (!open && pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
  }
})

async function verPdf(facturaId: number) {
  pdfLoadingId.value = facturaId
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

    const response = await fetch(`${baseUrl}/facturas/${facturaId}/pdf`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })

    if (!response.ok) {
      showMsg('No se pudo cargar el documento de la factura', 'error')

      return
    }
    const blob = await response.blob()

    pdfUrl.value = URL.createObjectURL(blob)
    pdfDialogOpen.value = true
  }
  catch {
    showMsg('No se pudo cargar el documento de la factura', 'error')
  }
  finally {
    pdfLoadingId.value = null
  }
}

async function cargar() {
  if (!automatico.value && !usarFecha.value && !usarImporte.value && !usarConceptos.value) {
    showMsg('Selecciona al menos un criterio de conciliación', 'error')

    return
  }
  loading.value = true
  try {
    const response = await $api<PageResponse<FacturaConciliacionImporteDto>>('/facturas/conciliacion-extracto-por-importe', {
      params: {
        automatico: automatico.value,
        usarFecha: usarFecha.value,
        usarImporte: usarImporte.value,
        usarConceptos: usarConceptos.value,
        fechaDesde: filtros.value.fechaDesde || undefined,
        fechaHasta: filtros.value.fechaHasta || undefined,
        importe: filtros.value.importe ?? undefined,
        proveedorId: filtros.value.proveedorId ?? undefined,
        page: page.value - 1,
        size: itemsPerPage.value,
      },
    })

    items.value = response.content
      .map((item, ordenOriginal) => ({ item, ordenOriginal }))
      .sort((a, b) => {
        const aMultiple = a.item.movimientos.length > 1 ? 1 : 0
        const bMultiple = b.item.movimientos.length > 1 ? 1 : 0

        return bMultiple - aMultiple || a.ordenOriginal - b.ordenOriginal
      })
      .map(({ item }) => item)
    totalItems.value = response.totalElements
    selectedMovimientosPorFactura.value = Object.fromEntries(
      items.value
        .filter(item => item.movimientos[0]?.movimientoId != null)
        .map(item => [item.facturaId, [item.movimientos[0].movimientoId]]),
    )
  }
  catch {
    showMsg('No se pudo cargar la conciliacion por importe', 'error')
  }
  finally {
    loading.value = false
  }
}

function cargarDesdePagina1() {
  page.value = 1

  return cargar()
}

function criteriosQuery() {
  return new URLSearchParams({
    automatico: String(automatico.value),
    usarFecha: String(usarFecha.value),
    usarImporte: String(usarImporte.value),
    usarConceptos: String(usarConceptos.value),
  }).toString()
}

const facturaIdsSeleccionadas = computed(() => Object.entries(selectedMovimientosPorFactura.value)
  .filter(([, movimientoIds]) => movimientoIds.length)
  .map(([facturaId]) => Number(facturaId)))

const movimientosSeleccionadosCount = computed(() => Object.values(selectedMovimientosPorFactura.value)
  .reduce((total, movimientoIds) => total + movimientoIds.length, 0))

const selectedFacturaIds = computed(() => facturaIdsAConciliar.value)

const selectedMovimientoIds = computed(() => facturaIdsAConciliar.value
  .flatMap(facturaId => selectedMovimientosPorFactura.value[facturaId] ?? []))

const vinculosAConciliarCount = computed(() => selectedMovimientoIds.value.length)

const facturasSeleccionadasPorMovimiento = computed(() => {
  const selecciones = new Map<number, Set<number>>()
  for (const [facturaIdRaw, movimientoIds] of Object.entries(selectedMovimientosPorFactura.value)) {
    const facturaId = Number(facturaIdRaw)
    for (const movimientoId of movimientoIds) {
      const facturaIds = selecciones.get(movimientoId) ?? new Set<number>()

      facturaIds.add(facturaId)
      selecciones.set(movimientoId, facturaIds)
    }
  }

  return selecciones
})

const movimientosRepetidosEnSeleccionActual = computed(() =>
  [...facturasSeleccionadasPorMovimiento.value.values()].filter(facturaIds => facturaIds.size > 1).length,
)

const itemsVisibles = computed(() => {
  if (!soloConflictos.value)
    return items.value

  return items.value
    .map(item => ({
      ...item,
      movimientos: item.movimientos.filter(movimiento =>
        movimientoSeleccionadoEnVariasFacturas(movimiento.movimientoId)),
    }))
    .filter(item => item.movimientos.length)
})

function abrirBusquedaManual(item: FacturaConciliacionImporteDto) {
  facturaParaBusquedaManual.value = {
    tipo: 'PROVEEDOR',
    id: item.facturaId,
    numero: item.facturaNumero,
    tercero: item.proveedorNombre,
    fecha: item.facturaFecha,
    importe: item.importeTotal,
    conciliada: !item.libreParaConciliacion,
    movimientoIds: [],
  }
  busquedaManualDialog.value = true
}

async function alConciliarManual() {
  busquedaManualDialog.value = false
  showMsg('Conciliación completada')
  await cargar()
}

const conciliacionApi = useConciliacion()

async function descartarSeleccionMovimientos(facturaId: number) {
  const pares = [...movimientosSeleccionados(facturaId)].map(movimientoId => ({ facturaId, movimientoId }))

  if (!pares.length)
    return
  actionLoading.value = true
  try {
    await conciliacionApi.descartarLote({ tipoFactura: 'PROVEEDOR', pares })
    showMsg('Sugerencias descartadas')
    await cargar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudieron descartar las sugerencias seleccionadas', 'error')
  }
  finally {
    actionLoading.value = false
  }
}

const movimientosRepetidosSeleccionados = computed(() => {
  const selecciones = new Map<number, Set<number>>()
  for (const facturaId of facturaIdsAConciliar.value) {
    for (const movimientoId of selectedMovimientosPorFactura.value[facturaId] ?? []) {
      const facturaIds = selecciones.get(movimientoId) ?? new Set<number>()

      facturaIds.add(facturaId)
      selecciones.set(movimientoId, facturaIds)
    }
  }

  return [...selecciones.entries()]
    .filter(([, facturaIds]) => facturaIds.size > 1)
    .map(([movimientoId, facturaIds]) => ({ movimientoId, facturas: facturaIds.size }))
})

function movimientosSeleccionados(facturaId: number) {
  return new Set(selectedMovimientosPorFactura.value[facturaId] ?? [])
}

function movimientoSeleccionadoEnVariasFacturas(movimientoId: number) {
  return (facturasSeleccionadasPorMovimiento.value.get(movimientoId)?.size ?? 0) > 1
}

function toggleMovimiento(facturaId: number, movimientoId: number, checked: boolean) {
  const next = new Set(selectedMovimientosPorFactura.value[facturaId] ?? [])

  checked ? next.add(movimientoId) : next.delete(movimientoId)
  selectedMovimientosPorFactura.value = { ...selectedMovimientosPorFactura.value, [facturaId]: [...next] }
}

function limpiarSeleccion() {
  selectedMovimientosPorFactura.value = {}
  facturaIdsAConciliar.value = []
}

function abrirConciliacionFactura(facturaId: number) {
  if (!movimientosSeleccionados(facturaId).size)
    return
  facturaIdsAConciliar.value = [facturaId]
  confirmDialog.value = true
}

function abrirConciliacionSeleccionadas() {
  if (!facturaIdsSeleccionadas.value.length)
    return
  facturaIdsAConciliar.value = facturaIdsSeleccionadas.value
  confirmDialog.value = true
}

async function conciliar() {
  if (!facturaIdsAConciliar.value.length)
    return
  actionLoading.value = true
  try {
    let mensaje = 'Conciliación completada'
    for (const facturaId of facturaIdsAConciliar.value) {
      const movimientoIds = selectedMovimientosPorFactura.value[facturaId] ?? []
      if (!movimientoIds.length)
        continue

      const res = await $api<{ ok: boolean; mensaje: string }>(`/facturas/conciliacion-extracto-por-importe/conciliar-seleccion?${criteriosQuery()}`, {
        method: 'POST',
        body: { facturaIds: [facturaId], movimientoIds },
      })

      mensaje = res.mensaje
    }

    showMsg(mensaje)
    limpiarSeleccion()
    confirmDialog.value = false
    await cargar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo conciliar', 'error')
  }
  finally {
    actionLoading.value = false
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '-'
const formatMoney = (n?: number) => n == null ? '-' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`

onMounted(cargar)
</script>

<template>
  <VCard class="mb-4">
    <VCardText class="d-flex align-center justify-space-between flex-wrap gap-3">
      <div>
        <div class="text-h6">
          Conciliación de facturas con movimientos
        </div>
        <div class="text-body-2 text-disabled">
          Busca movimientos desde las facturas usando modo automático o criterios personalizados.
        </div>
      </div>
      <div class="d-flex gap-2">
        <EnlaceAltaManualFactura />
        <VBtn
          variant="tonal"
          :loading="loading"
          @click="cargar"
        >
          Actualizar
        </VBtn>
      </div>
    </VCardText>
  </VCard>

  <VCard
    variant="tonal"
    class="mb-4"
  >
    <VCardText>
      <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-3">
        <div>
          <div class="text-subtitle-1">
            Criterios de búsqueda
          </div>
          <div class="text-body-2 text-disabled">
            Automático: concepto aprendido + importe con diferencia máxima del 1%; la fecha ordena los movimientos.
          </div>
        </div>
        <VBtnToggle
          v-model="automatico"
          mandatory
          color="primary"
          density="compact"
        >
          <VBtn value>
            Automático
          </VBtn>
          <VBtn :value="false">
            Personalizado
          </VBtn>
        </VBtnToggle>
      </div>
      <div class="d-flex flex-wrap align-center gap-4 mb-3">
        <VSwitch
          v-model="usarFecha"
          label="Mismo día"
          :disabled="automatico"
          hide-details
          density="compact"
        />
        <VSwitch
          v-model="usarImporte"
          label="Importe (tolerancia 1%)"
          :disabled="automatico"
          hide-details
          density="compact"
        />
        <VSwitch
          v-model="usarConceptos"
          label="Conceptos aprendidos"
          :disabled="automatico"
          hide-details
          density="compact"
        />
        <VBtn
          variant="tonal"
          :loading="loading"
          @click="cargarDesdePagina1"
        >
          Aplicar criterios
        </VBtn>
        <VBtn
          :color="soloConflictos ? 'warning' : undefined"
          :variant="soloConflictos ? 'flat' : 'tonal'"
          :disabled="!movimientosRepetidosEnSeleccionActual && !soloConflictos"
          @click="soloConflictos = !soloConflictos"
        >
          {{ soloConflictos ? 'Ver todos' : `Ver solo conflictos (${movimientosRepetidosEnSeleccionActual})` }}
        </VBtn>
        <VBtn
          color="primary"
          :disabled="!facturaIdsSeleccionadas.length"
          @click="abrirConciliacionSeleccionadas"
        >
          Conciliar todos los seleccionados ({{ movimientosSeleccionadosCount }})
        </VBtn>
      </div>
      <FiltrosBusquedaConciliacion
        v-model="filtros"
        @update:model-value="cargarDesdePagina1"
      />
    </VCardText>
  </VCard>

  <VProgressLinear
    v-if="loading"
    indeterminate
    class="mb-4"
  />

  <VAlert
    v-if="!loading && movimientosRepetidosEnSeleccionActual"
    type="warning"
    variant="tonal"
    class="mb-4"
  >
    Has seleccionado {{ movimientosRepetidosEnSeleccionActual }} movimiento(s) en más de una factura.
    Se crearán todos los vínculos N:N seleccionados.
  </VAlert>

  <VRow>
    <VCol
      v-for="item in itemsVisibles"
      :key="item.facturaId"
      cols="12"
    >
      <VCard variant="outlined">
        <VCardText>
          <div class="d-flex justify-space-between gap-3 mb-2">
            <div>
              <div class="d-flex align-center ga-1">
                <span class="text-subtitle-1 font-weight-medium">
                  {{ item.facturaNumero || `Factura #${item.facturaId}` }}
                </span>
                <IconBtn
                  size="small"
                  title="Ver documento original"
                  aria-label="Ver documento original"
                  :loading="pdfLoadingId === item.facturaId"
                  @click="verPdf(item.facturaId)"
                >
                  <VIcon
                    icon="tabler-file-type-pdf"
                    color="error"
                    size="20"
                  />
                </IconBtn>
              </div>
              <div class="text-body-2 text-disabled">
                {{ item.proveedorNombre || 'Sin proveedor' }} · {{ formatDate(item.facturaFecha) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-subtitle-1">
                {{ formatMoney(item.importeTotal) }}
              </div>
              <VChip
                size="small"
                :color="item.movimientoConceptoOk ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ item.movimientoConceptoOk ? 'Coincidencia fuerte' : 'Coincidencia debil' }}
              </VChip>
            </div>
          </div>

          <VTable density="compact">
            <thead>
              <tr>
                <th>Mov.</th>
                <th>Extracto</th>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Observ.</th>
                <th class="text-right">
                  Importe
                </th>
                <th>Coincidencia</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="mov in item.movimientos"
                :key="mov.movimientoId"
                :style="movimientoSeleccionadoEnVariasFacturas(mov.movimientoId)
                  ? { backgroundColor: 'rgba(var(--v-theme-warning), 0.12)' }
                  : undefined"
              >
                <td>{{ mov.movimientoId }}</td>
                <td>{{ mov.extractoEtiqueta }}</td>
                <td>{{ formatDate(mov.fechaMovimiento) }}</td>
                <td>
                  <VChip
                    v-if="mov.conceptoOk"
                    size="x-small"
                    color="success"
                    variant="tonal"
                    class="me-1"
                  >
                    OK
                  </VChip>
                  {{ mov.concepto }}
                </td>
                <td class="text-body-2 text-disabled">
                  {{ mov.observaciones || '-' }}
                </td>
                <td class="text-right">
                  {{ formatMoney(mov.importe) }}
                </td>
                <td>
                  <BadgeCoincidenciaConciliacion
                    :nivel="(mov.confidence as 'alta' | 'media' | 'baja') || 'baja'"
                    :motivos="mov.reasons"
                    :score="mov.score"
                  />
                </td>
                <td>
                  <BotonDescartarSugerencia
                    tipo-factura="PROVEEDOR"
                    :factura-id="item.facturaId"
                    :movimiento-id="mov.movimientoId"
                    @descartado="cargar"
                  />
                </td>
                <td class="text-right">
                  <VCheckboxBtn
                    :model-value="movimientosSeleccionados(item.facturaId).has(mov.movimientoId)"
                    :aria-label="`Seleccionar movimiento ${mov.movimientoId}`"
                    @update:model-value="(v: boolean) => toggleMovimiento(item.facturaId, mov.movimientoId, v)"
                  />
                </td>
              </tr>
            </tbody>
          </VTable>

          <div class="d-flex justify-end gap-2 mt-3">
            <VBtn
              size="small"
              variant="text"
              @click="abrirBusquedaManual(item)"
            >
              Buscar manualmente
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              color="secondary"
              :disabled="!movimientosSeleccionados(item.facturaId).size"
              :loading="actionLoading"
              @click="descartarSeleccionMovimientos(item.facturaId)"
            >
              Descartar seleccionados
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              color="primary"
              :disabled="!movimientosSeleccionados(item.facturaId).size"
              @click="abrirConciliacionFactura(item.facturaId)"
            >
              Conciliar factura
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-4">
    <div class="d-flex align-center gap-2">
      <span class="text-disabled text-body-2">Por página:</span>
      <AppSelect
        v-model="itemsPerPage"
        :items="itemsPerPageOptions"
        density="compact"
        style="width: 90px;"
        @update:model-value="cargarDesdePagina1"
      />
      <span class="text-disabled text-body-2">{{ totalItems }} facturas en total</span>
    </div>
    <VPagination
      v-if="totalItems > itemsPerPage"
      v-model="page"
      active-color="primary"
      density="compact"
      :length="Math.ceil(totalItems / itemsPerPage)"
      :total-visible="5"
      @update:model-value="cargar"
    />
  </div>

  <VDialog
    v-model="confirmDialog"
    max-width="520"
  >
    <VCard v-if="facturaIdsAConciliar.length">
      <VCardTitle>Confirmar conciliacion</VCardTitle>
      <VCardText>
        Se conciliarán {{ selectedFacturaIds.length }} factura(s) con {{ selectedMovimientoIds.length }} movimiento(s), creando {{ vinculosAConciliarCount }} vínculo(s).
        <VAlert
          v-if="movimientosRepetidosSeleccionados.length"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ movimientosRepetidosSeleccionados.length }} movimiento(s) están seleccionados para más de una factura.
          Se crearán todos los vínculos N:N seleccionados.
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
          Conciliar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar
    v-model="snackbar"
    :color="snackbarColor"
  >
    {{ snackbarMsg }}
  </VSnackbar>

  <VDialog
    v-model="pdfDialogOpen"
    max-width="960"
    max-height="90vh"
    scrollable
  >
    <VCard>
      <VCardTitle class="d-flex align-center pa-3">
        <VIcon
          icon="tabler-file-type-pdf"
          color="error"
          class="me-2"
        />
        Documento
        <VSpacer />
        <IconBtn @click="pdfDialogOpen = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VCardText
        class="pa-0"
        style="height: 80vh;"
      >
        <iframe
          v-if="pdfUrl"
          :src="pdfUrl"
          style="width:100%;height:100%;border:none;"
        />
      </VCardText>
    </VCard>
  </VDialog>

  <VDialog
    v-model="busquedaManualDialog"
    max-width="900"
    scrollable
  >
    <VCard v-if="facturaParaBusquedaManual">
      <VCardTitle class="d-flex align-center">
        Buscar movimientos para {{ facturaParaBusquedaManual.numero || `Factura #${facturaParaBusquedaManual.id}` }}
        <VSpacer />
        <IconBtn @click="busquedaManualDialog = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VCardText>
        <PanelBusquedaManualConciliacion
          tipo-factura="PROVEEDOR"
          modo="factura"
          :elemento="facturaParaBusquedaManual"
          @conciliado="alConciliarManual"
        />
      </VCardText>
    </VCard>
  </VDialog>
</template>
