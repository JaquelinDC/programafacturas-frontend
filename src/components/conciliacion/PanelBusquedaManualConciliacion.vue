<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import BadgeCoincidenciaConciliacion from '@/components/conciliacion/BadgeCoincidenciaConciliacion.vue'
import BotonDescartarSugerencia from '@/components/conciliacion/BotonDescartarSugerencia.vue'
import FiltrosBusquedaConciliacion from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import type { FiltrosConciliacion } from '@/components/conciliacion/FiltrosBusquedaConciliacion.vue'
import type {
  ConciliacionCandidatoFacturaDto,
  ConciliacionCandidatoMovimientoDto,
  ConciliacionFacturaDto,
  ConciliacionMovimientoDto,
  TipoFacturaConciliacion,
} from '@/types/api'

const props = defineProps<{
  tipoFactura: TipoFacturaConciliacion
  modo: 'factura' | 'movimiento'
  elemento?: ConciliacionFacturaDto | ConciliacionMovimientoDto
}>()

const emit = defineEmits<{ conciliado: [] }>()

const api = useConciliacion()

const q = ref('')
const filtros = ref<FiltrosConciliacion>({})
const incluirDescartados = ref(false)
const candidatosMov = ref<ConciliacionCandidatoMovimientoDto[]>([])
const candidatosFac = ref<ConciliacionCandidatoFacturaDto[]>([])
const seleccionMov = ref<number[]>([])
const seleccionFac = ref<number[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const confirmDialog = ref(false)
const confirmacionManual = ref(false)
const avisos = ref<string[]>([])
const page = ref(1)
const itemsPerPage = ref(20)
const totalItems = ref(0)

const itemsPerPageOptions = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
]

const facturaActiva = computed(() => props.modo === 'factura' ? props.elemento as ConciliacionFacturaDto | undefined : undefined)
const movimientoActivo = computed(() => props.modo === 'movimiento' ? props.elemento as ConciliacionMovimientoDto | undefined : undefined)

const formatDate = (value?: string) => value ? value.substring(0, 10).split('-').reverse().join('/') : '—'

const formatMoney = (value?: number) => value == null
  ? '—'
  : `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

function nivelDe(coincidencia: { requiereConfirmacion: boolean }) {
  return coincidencia.requiereConfirmacion ? 'requiere-confirmacion' as const : 'completa' as const
}

async function buscar() {
  if (props.modo === 'factura') {
    if (!facturaActiva.value)
      return
    loading.value = true
    error.value = ''
    try {
      const response = await api.candidatosMovimientos(
        props.tipoFactura,
        facturaActiva.value.id,
        { q: q.value, ...filtros.value, page: page.value - 1, size: itemsPerPage.value },
        incluirDescartados.value,
      )

      candidatosMov.value = response.content
      totalItems.value = response.totalElements
    }
    catch (err: any) {
      error.value = err?.data?.message || err?.message || 'No se pudieron buscar movimientos candidatos.'
    }
    finally {
      loading.value = false
    }
  }
  else {
    if (!movimientoActivo.value)
      return
    loading.value = true
    error.value = ''
    try {
      const response = await api.candidatosFacturas(
        movimientoActivo.value.id,
        props.tipoFactura,
        { q: q.value, ...filtros.value, page: page.value - 1, size: itemsPerPage.value },
        incluirDescartados.value,
      )

      candidatosFac.value = response.content
      totalItems.value = response.totalElements
    }
    catch (err: any) {
      error.value = err?.data?.message || err?.message || 'No se pudieron buscar facturas candidatas.'
    }
    finally {
      loading.value = false
    }
  }
}

function buscarDesdePagina1() {
  page.value = 1

  return buscar()
}

function toggleMovimiento(id: number, checked: boolean) {
  const next = new Set(seleccionMov.value)

  checked ? next.add(id) : next.delete(id)
  seleccionMov.value = [...next]
}

function toggleFactura(id: number, checked: boolean) {
  const next = new Set(seleccionFac.value)

  checked ? next.add(id) : next.delete(id)
  seleccionFac.value = [...next]
}

const sumaSeleccionada = computed(() => props.modo === 'factura'
  ? candidatosMov.value.filter(c => seleccionMov.value.includes(c.movimiento.id))
    .reduce((total, c) => total + (c.movimiento.importe || 0), 0)
  : candidatosFac.value.filter(c => seleccionFac.value.includes(c.factura.id))
    .reduce((total, c) => total + (c.factura.importe || 0), 0))

const importeReferencia = computed(() => props.modo === 'factura' ? facturaActiva.value?.importe : movimientoActivo.value?.importe)

const superaImporte = computed(() => {
  if (importeReferencia.value == null)
    return false

  return sumaSeleccionada.value > Math.abs(importeReferencia.value) * 1.01
})

function prepararConfirmacion() {
  const coincidencias = props.modo === 'factura'
    ? candidatosMov.value.filter(item => seleccionMov.value.includes(item.movimiento.id)).map(item => item.coincidencia)
    : candidatosFac.value.filter(item => seleccionFac.value.includes(item.factura.id)).map(item => item.coincidencia)

  confirmacionManual.value = coincidencias.some(item => item.requiereConfirmacion) || superaImporte.value
  avisos.value = [...new Set(coincidencias.flatMap(item => item.avisos))]
  if (superaImporte.value)
    avisos.value.push(`La suma seleccionada (${formatMoney(sumaSeleccionada.value)}) supera el importe de referencia (${formatMoney(importeReferencia.value)}).`)
  confirmDialog.value = true
}

async function conciliar() {
  actionLoading.value = true
  error.value = ''
  try {
    await api.enlazar({
      tipoFactura: props.tipoFactura,
      facturaIds: props.modo === 'factura' ? [facturaActiva.value!.id] : seleccionFac.value,
      movimientoIds: props.modo === 'movimiento' ? [movimientoActivo.value!.id] : seleccionMov.value,
      confirmarManual: confirmacionManual.value,
    })
    seleccionMov.value = []
    seleccionFac.value = []
    confirmDialog.value = false
    emit('conciliado')
    await buscar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo completar la conciliación.'
    confirmDialog.value = false
  }
  finally {
    actionLoading.value = false
  }
}

const haySeleccion = computed(() => props.modo === 'factura' ? seleccionMov.value.length > 0 : seleccionFac.value.length > 0)

async function descartarSeleccionados() {
  const pares = props.modo === 'factura'
    ? seleccionMov.value.map(movimientoId => ({ facturaId: facturaActiva.value!.id, movimientoId }))
    : seleccionFac.value.map(facturaId => ({ facturaId, movimientoId: movimientoActivo.value!.id }))

  if (!pares.length)
    return
  actionLoading.value = true
  error.value = ''
  try {
    await api.descartarLote({ tipoFactura: props.tipoFactura, pares })
    seleccionMov.value = []
    seleccionFac.value = []
    await buscar()
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudieron descartar las sugerencias seleccionadas.'
  }
  finally {
    actionLoading.value = false
  }
}

watch(() => props.elemento?.id, () => {
  q.value = ''
  seleccionMov.value = []
  seleccionFac.value = []
  candidatosMov.value = []
  candidatosFac.value = []
  page.value = 1
  if (props.elemento)
    buscar()
}, { immediate: true })

watch(incluirDescartados, buscarDesdePagina1)
</script>

<template>
  <div>
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-3"
      @click:close="error = ''"
    >
      {{ error }}
    </VAlert>

    <div class="d-flex gap-2 mb-2">
      <AppTextField
        v-model="q"
        :label="modo === 'factura' ? 'ID, concepto, banco, extracto o importe' : 'Número, tercero, CIF, referencia, importe o ID'"
        clearable
        @keyup.enter="buscarDesdePagina1"
      />
      <VBtn
        icon="tabler-search"
        variant="tonal"
        :loading="loading"
        @click="buscarDesdePagina1"
      />
    </div>

    <FiltrosBusquedaConciliacion
      v-model="filtros"
      :mostrar-proveedor="modo === 'movimiento' && tipoFactura === 'PROVEEDOR'"
      class="mb-2"
      @update:model-value="buscarDesdePagina1"
    />

    <VSwitch
      v-model="incluirDescartados"
      label="Incluir descartadas"
      density="compact"
      hide-details
      class="mb-3"
    />

    <VProgressLinear
      v-if="loading"
      indeterminate
      class="mb-3"
    />

    <div
      class="overflow-y-auto pe-1"
      style="max-height: 50vh;"
    >
      <template v-if="modo === 'factura'">
        <VCard
          v-for="item in candidatosMov"
          :key="item.movimiento.id"
          variant="outlined"
          class="mb-2"
          :class="{ 'opacity-60': item.descartado }"
        >
          <VCardText class="d-flex gap-3">
            <VCheckboxBtn
              :model-value="seleccionMov.includes(item.movimiento.id)"
              :disabled="item.descartado"
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
              <BadgeCoincidenciaConciliacion
                class="mt-1"
                :nivel="nivelDe(item.coincidencia)"
                :motivos="item.coincidencia.avisos"
              />
              <div class="mt-1">
                <BotonDescartarSugerencia
                  :tipo-factura="tipoFactura"
                  :factura-id="facturaActiva!.id"
                  :movimiento-id="item.movimiento.id"
                  :descartado="item.descartado"
                  @descartado="buscar"
                  @deshecho="buscar"
                />
              </div>
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
          :class="{ 'opacity-60': item.descartado }"
        >
          <VCardText class="d-flex gap-3">
            <VCheckboxBtn
              :model-value="seleccionFac.includes(item.factura.id)"
              :disabled="item.descartado"
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
              <BadgeCoincidenciaConciliacion
                class="mt-1"
                :nivel="nivelDe(item.coincidencia)"
                :motivos="item.coincidencia.avisos"
              />
              <div class="mt-1">
                <BotonDescartarSugerencia
                  :tipo-factura="tipoFactura"
                  :factura-id="item.factura.id"
                  :movimiento-id="movimientoActivo!.id"
                  :descartado="item.descartado"
                  @descartado="buscar"
                  @deshecho="buscar"
                />
              </div>
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
    </div>

    <div class="d-flex align-center justify-space-between flex-wrap gap-2 mt-2">
      <div class="d-flex align-center gap-2">
        <span class="text-disabled text-body-2">Por página:</span>
        <AppSelect
          v-model="itemsPerPage"
          :items="itemsPerPageOptions"
          density="compact"
          style="width: 90px;"
          @update:model-value="buscarDesdePagina1"
        />
      </div>
      <VPagination
        v-if="totalItems > itemsPerPage"
        v-model="page"
        active-color="primary"
        density="compact"
        :length="Math.ceil(totalItems / itemsPerPage)"
        :total-visible="5"
        @update:model-value="buscar"
      />
    </div>

    <VAlert
      v-if="superaImporte"
      type="warning"
      variant="tonal"
      density="compact"
      class="mt-3"
    >
      La suma seleccionada ({{ formatMoney(sumaSeleccionada) }}) supera el importe de referencia ({{ formatMoney(importeReferencia) }}).
    </VAlert>

    <div class="d-flex justify-end gap-2 mt-3">
      <VBtn
        color="secondary"
        variant="tonal"
        prepend-icon="tabler-square-x"
        :disabled="!haySeleccion"
        :loading="actionLoading"
        @click="descartarSeleccionados"
      >
        Descartar seleccionados
      </VBtn>
      <VBtn
        color="primary"
        prepend-icon="tabler-link"
        :disabled="modo === 'factura' ? !seleccionMov.length : !seleccionFac.length"
        @click="prepararConfirmacion"
      >
        Conciliar seleccionados
      </VBtn>
    </div>

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
