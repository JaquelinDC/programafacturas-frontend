<script setup lang="ts">
import type { ExtractoBancarioDto, ExtractoBancarioMovimientoDto, FacturaProveedorDto, FacturaProveedorResumenDto } from '@/types/api'
import { $api } from '@/utils/api'

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
    if (!seleccionadas.value.includes(value)) seleccionadas.value.push(value)
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

function colorConfianza(confidence?: string) {
  if (confidence === 'alta') return 'success'
  if (confidence === 'media') return 'warning'
  return 'secondary'
}

function facturasVinculadas(mov: ExtractoBancarioMovimientoDto): FacturaProveedorResumenDto[] {
  if (mov.facturasProveedor?.length) return mov.facturasProveedor
  if (mov.facturaProveedorId != null || mov.facturaProveedorNumero) {
    return [{ id: mov.facturaProveedorId, numeroFactura: mov.facturaProveedorNumero }]
  }
  return []
}

async function cargar() {
  cargando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const [extractoResp, itemsResp] = await Promise.all([
      $api<ExtractoBancarioDto>(`/extractos/${id.value}`),
      $api<ConciliacionProveedorPreviewItem[]>(`/extractos/${id.value}/conciliacion/preview`),
    ])
    extracto.value = extractoResp
    items.value = itemsResp
    seleccionarMejorPropuesta(itemsResp)
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo cargar la conciliacion.'
  }
  finally {
    cargando.value = false
  }
}

async function confirmarSeleccion() {
  if (!seleccionadas.value.length) {
    error.value = 'Selecciona al menos una relacion movimiento-factura.'
    return
  }
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const res = await $api<{ mensaje?: string }>(`/extractos/${id.value}/conciliar`, {
      method: 'POST',
      body: seleccionadas.value,
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

async function conciliarUna(movimientoId: number, facturaId: number) {
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const res = await $api<{ mensaje?: string }>(`/extractos/${id.value}/conciliar/${facturaId}?movimientoId=${movimientoId}`, {
      method: 'POST',
    })
    mensaje.value = res?.mensaje || 'Conciliacion aplicada.'
    await cargar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo conciliar la factura.'
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
          <VBtn :to="`/extractos/${id}`" variant="tonal">Volver al extracto</VBtn>
          <VBtn color="primary" :loading="guardando" :disabled="cargando || !seleccionadas.length" @click="confirmarSeleccion">
            Confirmar seleccion
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </VAlert>

      <VAlert v-else-if="mensaje" type="success" variant="tonal" class="mb-4">
        {{ mensaje }}
      </VAlert>

      <div class="mb-4 text-body-2 text-disabled">
        Se propone una mejor sugerencia por movimiento y se mantienen candidatas de confianza media o baja para revision manual.
      </div>

      <VProgressLinear v-if="cargando" indeterminate class="mb-4" />

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
                  <div v-if="facturasVinculadas(item.movimiento).length" class="d-flex flex-wrap align-center ga-2 mt-1">
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
                        class="ml-1"
                        @click.stop="desconciliarUna(item.movimiento.id, facturaVinculada.id)"
                      >
                        <VIcon icon="tabler-x" size="14" />
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

              <VTable v-if="item.candidatas.length" density="compact">
                <thead>
                  <tr>
                    <th style="width: 40px;" />
                    <th>Factura</th>
                    <th>Proveedor</th>
                    <th style="width: 110px;">
                      Fecha
                    </th>
                    <th class="text-right" style="width: 120px;">
                      Importe
                    </th>
                    <th>Score</th>
                    <th style="width: 110px;" />
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
                        <VChip v-if="idx === 0" size="x-small" color="primary" variant="tonal" label>
                          mejor
                        </VChip>
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
                      <div class="d-flex flex-column ga-1 py-1">
                        <div class="d-flex align-center ga-2">
                          <VChip
                            size="x-small"
                            :color="colorConfianza(propuesta.confidence)"
                            variant="tonal"
                          >
                            {{ propuesta.confidence }}
                          </VChip>
                          <span class="text-caption">score {{ propuesta.score }}</span>
                        </div>
                        <div class="d-flex flex-wrap ga-1">
                          <VChip
                            v-for="reason in propuesta.reasons"
                            :key="reason"
                            size="x-small"
                            variant="outlined"
                            color="secondary"
                            label
                          >
                            {{ reason }}
                          </VChip>
                        </div>
                      </div>
                    </td>
                    <td class="text-right">
                      <VBtn
                        size="small"
                        variant="text"
                        color="primary"
                        :loading="guardando"
                        :disabled="propuesta.factura.id == null"
                        @click="propuesta.factura.id != null && conciliarUna(item.movimiento.id, propuesta.factura.id)"
                      >
                        Conciliar
                      </VBtn>
                    </td>
                  </tr>
                </tbody>
              </VTable>
              <div v-else class="text-caption text-disabled py-2">
                {{ item.motivo || 'Sin candidatas.' }}
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
