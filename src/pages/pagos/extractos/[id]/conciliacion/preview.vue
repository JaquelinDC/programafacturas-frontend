<script setup lang="ts">
import type { ConciliacionMovimientoDto, ExtractoBancarioDto, ExtractoBancarioMovimientoDto, FacturaProveedorDto, FacturaProveedorResumenDto, PageResponse } from '@/types/api'
import { $api } from '@/utils/api'
import { useConciliacion } from '@/composables/useConciliacion'
import BadgeCoincidenciaConciliacion from '@/components/conciliacion/BadgeCoincidenciaConciliacion.vue'
import BotonDescartarSugerencia from '@/components/conciliacion/BotonDescartarSugerencia.vue'
import EnlaceAltaManualFactura from '@/components/conciliacion/EnlaceAltaManualFactura.vue'
import FiltrosBusquedaConciliacion from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import type { FiltrosConciliacion } from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import PanelBusquedaManualConciliacion from '@/components/conciliacion/PanelBusquedaManualConciliacion.vue'

definePage({ meta: { title: 'Conciliar movimientos con facturas proveedor' } })

interface PropuestaFacturaProveedorPreviewDto {
  factura: FacturaProveedorDto
  score: number
  confidence: 'alta' | 'media' | 'baja' | string
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
const seleccionadas = ref<string[]>([])
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const automatico = ref(true)
const usarFecha = ref(true)
const usarImporte = ref(true)
const usarConceptos = ref(true)
const filtros = ref<FiltrosConciliacion>({})
const busquedaManualDialog = ref(false)
const movimientoParaBusquedaManual = ref<ConciliacionMovimientoDto>()

const page = ref(1)
const itemsPerPage = ref(20)
const totalItems = ref(0)

const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
]

const pdfDialogOpen = ref(false)
const pdfUrl = ref('')
const pdfLoadingId = ref<number | null>(null)

watch(pdfDialogOpen, open => {
  if (!open && pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
  }
})

async function verPdf(factura: FacturaProveedorDto) {
  if (factura.id == null)
    return
  pdfLoadingId.value = factura.id
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

    const response = await fetch(`${baseUrl}/facturas/${factura.id}/pdf`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })

    if (!response.ok) {
      error.value = 'No se pudo cargar el documento de la factura.'

      return
    }
    const blob = await response.blob()

    pdfUrl.value = URL.createObjectURL(blob)
    pdfDialogOpen.value = true
  }
  catch {
    error.value = 'No se pudo cargar el documento de la factura.'
  }
  finally {
    pdfLoadingId.value = null
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '-'
const formatMoney = (n?: number) => n == null ? '-' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`

function clave(movimientoId: number, facturaId: number) {
  return `${movimientoId}:${facturaId}`
}

function estaSeleccionada(movimientoId: number, facturaId: number) {
  return seleccionadas.value.includes(clave(movimientoId, facturaId))
}

function toggleSeleccion(movimientoId: number, facturaId: number, checked: boolean) {
  const value = clave(movimientoId, facturaId)
  if (checked) {
    if (!seleccionadas.value.includes(value))
      seleccionadas.value.push(value)

    return
  }
  seleccionadas.value = seleccionadas.value.filter(item => item !== value)
}

function seleccionarMejorPropuesta(itemsResp: ConciliacionProveedorPreviewItem[]) {
  seleccionadas.value = itemsResp.flatMap(item => {
    const mejor = item.candidatas[0]

    return mejor?.factura.id != null ? [clave(item.movimiento.id, mejor.factura.id)] : []
  })
}

function criteriosQuery() {
  return new URLSearchParams({
    automatico: String(automatico.value),
    usarFecha: String(usarFecha.value),
    usarImporte: String(usarImporte.value),
    usarConceptos: String(usarConceptos.value),
  }).toString()
}

function facturasVinculadas(mov: ExtractoBancarioMovimientoDto): FacturaProveedorResumenDto[] {
  if (mov.facturasProveedor?.length)
    return mov.facturasProveedor
  if (mov.facturaProveedorId != null || mov.facturaProveedorNumero)
    return [{ id: mov.facturaProveedorId, numeroFactura: mov.facturaProveedorNumero }]

  return []
}

function abrirBusquedaManual(item: ConciliacionProveedorPreviewItem) {
  movimientoParaBusquedaManual.value = {
    id: item.movimiento.id,
    extractoId: item.movimiento.extractoBancarioId,
    banco: extracto.value?.banco,
    fecha: item.movimiento.fechaMovimiento,
    concepto: item.movimiento.concepto,
    observaciones: item.movimiento.observaciones,
    importe: item.movimiento.importe,
    estado: 'PENDIENTE',
    facturas: [],
  }
  busquedaManualDialog.value = true
}

async function alConciliarManual() {
  busquedaManualDialog.value = false
  mensaje.value = 'Conciliación completada.'
  await cargar()
}

async function cargar() {
  if (!automatico.value && !usarFecha.value && !usarImporte.value && !usarConceptos.value) {
    error.value = 'Selecciona al menos un criterio de conciliación.'

    return
  }
  cargando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const [extractoResp, response] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
      $api<PageResponse<ConciliacionProveedorPreviewItem>>(`/extractos/${id.value}/conciliacion/preview`, {
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
      }),
    ])

    extracto.value = extractoResp

    const itemsOrdenados = response.content
      .map((item, ordenOriginal) => ({ item, ordenOriginal }))
      .sort((a, b) => {
        const aMultiple = a.item.candidatas.length > 1 ? 1 : 0
        const bMultiple = b.item.candidatas.length > 1 ? 1 : 0

        return bMultiple - aMultiple || a.ordenOriginal - b.ordenOriginal
      })
      .map(({ item }) => item)

    items.value = itemsOrdenados
    totalItems.value = response.totalElements
    seleccionarMejorPropuesta(itemsOrdenados)
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo cargar la conciliacion.'
  }
  finally {
    cargando.value = false
  }
}

function cargarDesdePagina1() {
  page.value = 1

  return cargar()
}

async function confirmarSeleccion(relaciones = seleccionadas.value) {
  if (!relaciones.length) {
    error.value = 'Selecciona al menos una relacion movimiento-factura.'

    return
  }
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const res = await $api<{ mensaje?: string }>(`/extractos/${id.value}/conciliar?${criteriosQuery()}`, {
      method: 'POST',
      body: relaciones,
    })

    mensaje.value = res?.mensaje || 'Conciliacion aplicada.'
    await cargar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo confirmar la conciliacion.'
  }
  finally {
    guardando.value = false
  }
}

function seleccionesMovimiento(movimientoId: number) {
  return seleccionadas.value.filter(seleccion => seleccion.startsWith(`${movimientoId}:`))
}

async function conciliarMovimiento(movimientoId: number) {
  await confirmarSeleccion(seleccionesMovimiento(movimientoId))
}

const conciliacionApi = useConciliacion()

async function descartarSeleccionMovimiento(movimientoId: number) {
  const pares = seleccionesMovimiento(movimientoId).map(seleccion => {
    const [, facturaIdRaw] = seleccion.split(':')

    return { facturaId: Number(facturaIdRaw), movimientoId }
  })

  if (!pares.length)
    return
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    await conciliacionApi.descartarLote({ tipoFactura: 'PROVEEDOR', pares })
    seleccionadas.value = seleccionadas.value.filter(seleccion => !seleccion.startsWith(`${movimientoId}:`))
    mensaje.value = 'Sugerencias descartadas.'
    await cargar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudieron descartar las sugerencias seleccionadas.'
  }
  finally {
    guardando.value = false
  }
}

async function desconciliarUna(movimientoId: number, facturaId: number) {
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const res = await $api<{ mensaje?: string }>(`/extractos/${id.value}/movimientos/${movimientoId}/conciliacion?facturaId=${facturaId}`, {
      method: 'DELETE',
    })

    mensaje.value = res?.mensaje || 'Conciliacion revertida.'
    await cargar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo desconciliar la factura.'
  }
  finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>Conciliar movimientos con facturas proveedor</VCardTitle>
      <VCardSubtitle>Candidatas encontradas para cada movimiento pendiente · {{ extracto?.banco ?? 'Extracto' }} #{{ id }}</VCardSubtitle>
      <template #append>
        <div class="d-flex gap-2">
          <EnlaceAltaManualFactura />
          <VBtn
            :to="`/extractos/${id}`"
            variant="tonal"
          >
            Volver al extracto
          </VBtn>
          <VBtn
            color="primary"
            :loading="guardando"
            :disabled="cargando || !seleccionadas.length"
            @click="confirmarSeleccion"
          >
            Conciliar todos los seleccionados ({{ seleccionadas.length }})
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
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
                Automático: concepto aprendido + importe con diferencia máxima del 1%; la fecha ordena las propuestas.
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
              :loading="cargando"
              @click="cargarDesdePagina1"
            >
              Aplicar criterios
            </VBtn>
          </div>
          <FiltrosBusquedaConciliacion
            v-model="filtros"
            @update:model-value="cargarDesdePagina1"
          />
        </VCardText>
      </VCard>

      <VAlert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ error }}
      </VAlert>

      <VAlert
        v-else-if="mensaje"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        {{ mensaje }}
      </VAlert>

      <div class="mb-4 text-body-2 text-disabled">
        Se propone una mejor sugerencia por movimiento y se mantienen candidatas de confianza media o baja para revision manual.
      </div>

      <VProgressLinear
        v-if="cargando"
        indeterminate
        class="mb-4"
      />

      <VRow v-else>
        <VCol
          v-for="item in items"
          :key="item.movimiento.id"
          cols="12"
        >
          <VCard variant="outlined">
            <VCardText>
              <div class="d-flex justify-space-between gap-3 mb-2 flex-wrap">
                <div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ item.movimiento.concepto }}
                  </div>
                  <div class="text-body-2 text-disabled">
                    {{ formatDate(item.movimiento.fechaMovimiento) }} · Mov. #{{ item.movimiento.id }}
                  </div>
                  <div
                    v-if="facturasVinculadas(item.movimiento).length"
                    class="d-flex flex-wrap align-center ga-2 mt-1"
                  >
                    <span class="text-caption text-success">Vinculadas:</span>
                    <VChip
                      v-for="facturaVinculada in facturasVinculadas(item.movimiento)"
                      :key="facturaVinculada.id ?? facturaVinculada.numeroFactura"
                      size="small"
                      color="success"
                      variant="tonal"
                    >
                      <span>{{ facturaVinculada.numeroFactura || `#${facturaVinculada.id}` }}</span>
                      <VBtn
                        v-if="facturaVinculada.id != null"
                        icon
                        size="x-small"
                        variant="text"
                        color="success"
                        :loading="guardando"
                        class="ms-1"
                        @click.stop="desconciliarUna(item.movimiento.id, facturaVinculada.id)"
                      >
                        <VIcon
                          icon="tabler-x"
                          size="14"
                        />
                      </VBtn>
                    </VChip>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-subtitle-1">
                    {{ formatMoney(item.movimiento.importe) }}
                  </div>
                  <VChip
                    size="small"
                    :color="facturasVinculadas(item.movimiento).length ? 'success' : item.candidatas.length ? 'warning' : 'secondary'"
                    variant="tonal"
                  >
                    {{ facturasVinculadas(item.movimiento).length ? 'Conciliado' : item.candidatas.length ? `${item.candidatas.length} candidatas` : 'Sin candidatas' }}
                  </VChip>
                </div>
              </div>

              <VTable
                v-if="item.candidatas.length"
                density="compact"
              >
                <thead>
                  <tr>
                    <th style="width: 40px;" />
                    <th>Factura</th>
                    <th>Proveedor</th>
                    <th style="width: 110px;">
                      Fecha
                    </th>
                    <th
                      class="text-right"
                      style="width: 120px;"
                    >
                      Importe
                    </th>
                    <th>Coincidencia</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(propuesta, idx) in item.candidatas"
                    :key="propuesta.factura.id ?? `${item.movimiento.id}-${idx}`"
                  >
                    <td>
                      <VCheckboxBtn
                        v-if="propuesta.factura.id != null"
                        :model-value="estaSeleccionada(item.movimiento.id, propuesta.factura.id)"
                        @update:model-value="toggleSeleccion(item.movimiento.id, propuesta.factura.id, Boolean($event))"
                      />
                    </td>
                    <td>
                      <div class="d-flex align-center ga-2">
                        <span class="text-body-2 font-weight-medium">
                          {{ propuesta.factura.numeroFactura || `#${propuesta.factura.id}` }}
                        </span>
                        <VChip
                          v-if="idx === 0"
                          size="x-small"
                          color="primary"
                          variant="tonal"
                          label
                        >
                          mejor
                        </VChip>
                        <IconBtn
                          size="small"
                          title="Ver documento original"
                          aria-label="Ver documento original"
                          :loading="pdfLoadingId === propuesta.factura.id"
                          @click="verPdf(propuesta.factura)"
                        >
                          <VIcon
                            icon="tabler-file-type-pdf"
                            color="error"
                            size="18"
                          />
                        </IconBtn>
                      </div>
                    </td>
                    <td class="text-body-2 text-disabled">
                      {{ propuesta.factura.proveedorFacturaNombre || 'Sin proveedor' }}
                    </td>
                    <td>{{ formatDate(propuesta.factura.fechaFactura) }}</td>
                    <td class="text-right">
                      {{ formatMoney(propuesta.factura.importeTotal) }}
                    </td>
                    <td>
                      <BadgeCoincidenciaConciliacion
                        :nivel="(propuesta.confidence as 'alta' | 'media' | 'baja') || 'baja'"
                        :motivos="propuesta.reasons"
                        :score="propuesta.score"
                      />
                    </td>
                    <td>
                      <BotonDescartarSugerencia
                        v-if="propuesta.factura.id != null"
                        tipo-factura="PROVEEDOR"
                        :factura-id="propuesta.factura.id"
                        :movimiento-id="item.movimiento.id"
                        @descartado="cargar"
                      />
                    </td>
                  </tr>
                </tbody>
              </VTable>
              <div
                v-else
                class="text-caption text-disabled py-2"
              >
                {{ item.motivo || 'Sin candidatas.' }}
              </div>
              <div class="d-flex justify-end gap-2 mt-3">
                <VBtn
                  size="small"
                  variant="text"
                  @click="abrirBusquedaManual(item)"
                >
                  Buscar manualmente
                </VBtn>
                <VBtn
                  v-if="item.candidatas.length"
                  size="small"
                  variant="text"
                  color="secondary"
                  :loading="guardando"
                  :disabled="!seleccionesMovimiento(item.movimiento.id).length"
                  @click="descartarSeleccionMovimiento(item.movimiento.id)"
                >
                  Descartar seleccionados
                </VBtn>
                <VBtn
                  v-if="item.candidatas.length"
                  size="small"
                  variant="text"
                  color="primary"
                  :loading="guardando"
                  :disabled="!seleccionesMovimiento(item.movimiento.id).length"
                  @click="conciliarMovimiento(item.movimiento.id)"
                >
                  Conciliar movimiento
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <div class="d-flex align-center justify-space-between flex-wrap gap-2 mt-2">
        <div class="d-flex align-center gap-2">
          <span class="text-disabled text-body-2">Por página:</span>
          <AppSelect
            v-model="itemsPerPage"
            :items="itemsPerPageOptions"
            density="compact"
            style="width: 90px;"
            @update:model-value="cargarDesdePagina1"
          />
          <span class="text-disabled text-body-2">{{ totalItems }} movimientos en total</span>
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
    </VCardText>
  </VCard>

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
    <VCard v-if="movimientoParaBusquedaManual">
      <VCardTitle class="d-flex align-center">
        Buscar facturas para el movimiento #{{ movimientoParaBusquedaManual.id }}
        <VSpacer />
        <IconBtn @click="busquedaManualDialog = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VCardText>
        <PanelBusquedaManualConciliacion
          tipo-factura="PROVEEDOR"
          modo="movimiento"
          :elemento="movimientoParaBusquedaManual"
          @conciliado="alConciliarManual"
        />
      </VCardText>
    </VCard>
  </VDialog>
</template>
