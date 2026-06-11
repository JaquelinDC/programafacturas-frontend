<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import { useTheme } from 'vuetify'
import type { DashboardResumen } from '@/types/dashboard'
import { $api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

definePage({ meta: { title: 'Inicio' } })

const vuetifyTheme = useTheme()
const authStore = useAuthStore()

// ─── Filtros ──────────────────────────────────────────────────────────────────
const anioActual = new Date().getFullYear()
const anios = Array.from({ length: 5 }, (_, i) => anioActual - i)
const trimestres = [
  { title: 'Año completo', value: 0 },
  { title: 'T1 (Ene-Mar)', value: 1 },
  { title: 'T2 (Abr-Jun)', value: 2 },
  { title: 'T3 (Jul-Sep)', value: 3 },
  { title: 'T4 (Oct-Dic)', value: 4 },
]

const anioSeleccionado = ref(anioActual)
const trimestreSeleccionado = ref(0)

// ─── Datos ────────────────────────────────────────────────────────────────────
const datos = ref<DashboardResumen | null>(null)
const cargando = ref(false)

async function cargarDatos() {
  cargando.value = true
  try {
    datos.value = await $api<DashboardResumen>('/dashboard/resumen', {
      params: { anio: anioSeleccionado.value, trimestre: trimestreSeleccionado.value },
    })
  }
  finally {
    cargando.value = false
  }
}

watch([anioSeleccionado, trimestreSeleccionado], cargarDatos, { immediate: true })

// ─── Helpers de formato ──────────────────────────────────────────────────────
function fmtEur(n: number | undefined | null): string {
  if (n == null) return '0 €'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function estadoLabel(key: string): string {
  const map: Record<string, string> = {
    PENDIENTE_REVISION: 'Pendiente revisión',
    SOLICITADA_FACTURA: 'Solicitada factura',
    VALIDADA: 'Validada',
    PAGADA: 'Pagada',
  }
  return map[key] ?? key
}

function estadoColor(key: string): string {
  const map: Record<string, string> = {
    PENDIENTE_REVISION: 'warning',
    SOLICITADA_FACTURA: 'info',
    VALIDADA: 'primary',
    PAGADA: 'success',
  }
  return map[key] ?? 'secondary'
}

function mesLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short' })
}

// ─── KPI cards ───────────────────────────────────────────────────────────────
const kpiCards = computed(() => {
  const d = datos.value
  const estados = d?.facturasPorEstado ?? {}
  return [
    {
      titulo: 'Pendientes de revisión',
      valor: String(estados.PENDIENTE_REVISION?.count ?? 0),
      subtitulo: fmtEur(estados.PENDIENTE_REVISION?.importe),
      icono: 'tabler-file-search',
      color: 'warning',
    },
    {
      titulo: 'Validadas sin pagar',
      valor: String(estados.VALIDADA?.count ?? 0),
      subtitulo: fmtEur(estados.VALIDADA?.importe),
      icono: 'tabler-file-check',
      color: 'info',
    },
    {
      titulo: 'Con incidencias',
      valor: String(d?.totalConIncidencias ?? 0),
      subtitulo: 'Requieren atención',
      icono: 'tabler-alert-triangle',
      color: 'error',
    },
    {
      titulo: 'Sin exportar contabilidad',
      valor: String(d?.sinExportarContabilidad?.count ?? 0),
      subtitulo: fmtEur(d?.sinExportarContabilidad?.importe),
      icono: 'tabler-cloud-upload',
      color: 'secondary',
    },
    {
      titulo: 'Movimientos sin conciliar',
      valor: String(d?.movimientosSinConciliar ?? 0),
      subtitulo: 'Pendientes en extracto',
      icono: 'tabler-building-bank',
      color: 'primary',
    },
  ]
})

// ─── Colores ApexCharts ───────────────────────────────────────────────────────
const isDark = computed(() => vuetifyTheme.current.value.dark)
const colorTexto = computed(() => isDark.value ? '#E1DEF5' : '#2F2B3D')
const colorBorde = computed(() => isDark.value ? 'rgba(225,222,245,0.12)' : 'rgba(47,43,61,0.12)')

const coloresEstado = ['#FF9F43', '#00BAD1', '#0c6fb4', '#28C76F']

// ─── Donut: facturas por estado ───────────────────────────────────────────────
const donutSeries = computed(() => {
  const d = datos.value?.facturasPorEstado ?? {}
  return ['PENDIENTE_REVISION', 'SOLICITADA_FACTURA', 'VALIDADA', 'PAGADA'].map(k => d[k]?.count ?? 0)
})

const donutOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  labels: ['Pendiente revisión', 'Solicitada factura', 'Validada', 'Pagada'],
  colors: coloresEstado,
  dataLabels: { enabled: false },
  legend: {
    position: 'bottom',
    labels: { colors: colorTexto.value },
    fontSize: '13px',
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            color: colorTexto.value,
            formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0),
          },
        },
      },
    },
  },
  stroke: { width: 0 },
  theme: { mode: isDark.value ? 'dark' : 'light' },
}))

// ─── Bar apilado: gasto mensual ───────────────────────────────────────────────
const gastoSeries = computed(() => {
  const rows = datos.value?.gastoPorMes ?? []
  return [
    { name: 'Base imponible', data: rows.map(r => +(r.base ?? 0).toFixed(2)) },
    { name: 'IVA', data: rows.map(r => +(r.iva ?? 0).toFixed(2)) },
  ]
})

const gastoCategories = computed(() => (datos.value?.gastoPorMes ?? []).map(r => mesLabel(r.mes)))

const gastoOptions = computed(() => ({
  chart: { type: 'bar', stacked: true, background: 'transparent', toolbar: { show: false } },
  colors: ['#0c6fb4', '#00BAD1'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
  xaxis: { categories: gastoCategories.value, labels: { style: { colors: colorTexto.value } }, axisBorder: { show: false } },
  yaxis: { labels: { style: { colors: colorTexto.value }, formatter: (v: number) => fmtEur(v) } },
  grid: { borderColor: colorBorde.value, strokeDashArray: 4 },
  legend: { position: 'top', labels: { colors: colorTexto.value } },
  dataLabels: { enabled: false },
  tooltip: { y: { formatter: (v: number) => fmtEur(v) } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
}))

// ─── Bar horizontal: top proveedores ─────────────────────────────────────────
const topSeries = computed(() => [{
  name: 'Importe',
  data: (datos.value?.topProveedores ?? []).map(p => +(p.importe ?? 0).toFixed(2)),
}])

const topCategories = computed(() =>
  (datos.value?.topProveedores ?? []).map(p => {
    const n = p.nombre ?? ''
    return n.length > 22 ? n.slice(0, 22) + '…' : n
  }),
)

const topOptions = computed(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
  colors: ['#28C76F'],
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
  xaxis: {
    categories: topCategories.value,
    labels: { style: { colors: colorTexto.value }, formatter: (v: number) => fmtEur(v) },
    axisBorder: { show: false },
  },
  yaxis: { labels: { style: { colors: colorTexto.value } } },
  grid: { borderColor: colorBorde.value, strokeDashArray: 4 },
  dataLabels: { enabled: false },
  tooltip: { y: { formatter: (v: number) => fmtEur(v) } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
}))

// ─── Area: facturación emitida ────────────────────────────────────────────────
const emitidaSeries = computed(() => {
  const rows = datos.value?.facturacionEmitidaPorMes ?? []
  return [
    { name: 'Facturado', data: rows.map(r => +(r.total ?? 0).toFixed(2)) },
    { name: 'Cobrado', data: rows.map(r => +(r.cobrado ?? 0).toFixed(2)) },
  ]
})

const emitidaCategories = computed(() => (datos.value?.facturacionEmitidaPorMes ?? []).map(r => mesLabel(r.mes)))

const emitidaOptions = computed(() => ({
  chart: { type: 'area', background: 'transparent', toolbar: { show: false } },
  colors: ['#0c6fb4', '#28C76F'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: { categories: emitidaCategories.value, labels: { style: { colors: colorTexto.value } }, axisBorder: { show: false } },
  yaxis: { labels: { style: { colors: colorTexto.value }, formatter: (v: number) => fmtEur(v) } },
  grid: { borderColor: colorBorde.value, strokeDashArray: 4 },
  legend: { position: 'top', labels: { colors: colorTexto.value } },
  dataLabels: { enabled: false },
  tooltip: { y: { formatter: (v: number) => fmtEur(v) } },
  theme: { mode: isDark.value ? 'dark' : 'light' },
}))

// ─── Tabla incidencias ────────────────────────────────────────────────────────
const headersIncidencias = [
  { title: 'ID', key: 'id', width: '70px' },
  { title: 'Proveedor', key: 'proveedor' },
  { title: 'Importe', key: 'importe', align: 'end' as const },
  { title: 'Estado', key: 'estado' },
  { title: 'Incidencia', key: 'incidencia' },
]

// ─── Tabla movimientos ────────────────────────────────────────────────────────
const headersMovimientos = [
  { title: 'Fecha', key: 'fecha', width: '110px' },
  { title: 'Concepto', key: 'concepto' },
  { title: 'Importe', key: 'importe', align: 'end' as const },
]
</script>

<template>
  <div>
    <!-- ── Cabecera + filtros ───────────────────────────────────────────────── -->
    <VCard class="mb-6">
      <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
        <div>
          <h4 class="text-h4 mb-1">
            Bienvenido, {{ authStore.nombreCompleto || authStore.username }}
          </h4>
          <p class="text-body-1 mb-0 text-medium-emphasis">
            Panel operativo - resumen de facturación y conciliación
          </p>
        </div>

        <div class="d-flex align-center gap-3 flex-wrap">
          <VSelect
            v-model="anioSeleccionado"
            :items="anios"
            label="Año"
            density="compact"
            hide-details
            style="min-width: 100px; max-width: 120px"
          />
          <VSelect
            v-model="trimestreSeleccionado"
            :items="trimestres"
            item-title="title"
            item-value="value"
            label="Periodo"
            density="compact"
            hide-details
            style="min-width: 150px; max-width: 180px"
          />
          <VBtn
            icon
            variant="tonal"
            color="primary"
            size="small"
            :loading="cargando"
            @click="cargarDatos"
          >
            <VIcon icon="tabler-refresh" />
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- ── KPI Cards ───────────────────────────────────────────────────────── -->
    <VRow class="mb-2">
      <VCol
        v-for="card in kpiCards"
        :key="card.titulo"
        cols="12"
        sm="6"
        md="4"
        lg="true"
      >
        <VCard>
          <VCardText class="d-flex align-start gap-3">
            <VAvatar
              :color="card.color"
              variant="tonal"
              size="44"
              rounded
            >
              <VIcon
                :icon="card.icono"
                size="22"
              />
            </VAvatar>
            <div class="flex-grow-1">
              <div class="text-body-2 text-medium-emphasis mb-1">
                {{ card.titulo }}
              </div>
              <div
                class="text-h5 font-weight-bold"
                style="font-variant-numeric: tabular-nums"
              >
                {{ card.valor }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ card.subtitulo }}
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Donut + Gasto mensual ────────────────────────────────────────────── -->
    <VRow class="mb-2">
      <!-- Donut: estados -->
      <VCol
        cols="12"
        md="5"
        lg="4"
      >
        <VCard class="h-100">
          <VCardItem>
            <VCardTitle>Facturas por estado</VCardTitle>
            <template #append>
              <VChip
                density="compact"
                size="small"
                variant="tonal"
                color="primary"
              >
                {{ anioSeleccionado }}
                {{ trimestreSeleccionado > 0 ? `T${trimestreSeleccionado}` : '' }}
              </VChip>
            </template>
          </VCardItem>
          <VCardText>
            <VueApexCharts
              type="donut"
              height="280"
              :series="donutSeries"
              :options="donutOptions"
            />
            <!-- Detalle importes por estado -->
            <VDivider class="my-3" />
            <div
              v-for="(key, i) in ['PENDIENTE_REVISION','SOLICITADA_FACTURA','VALIDADA','PAGADA']"
              :key="key"
              class="d-flex align-center justify-space-between py-1"
            >
              <div class="d-flex align-center gap-2">
                <span
                  class="d-inline-block rounded-circle"
                  style="width:10px;height:10px;flex-shrink:0"
                  :style="{ backgroundColor: coloresEstado[i] }"
                />
                <span class="text-body-2">{{ estadoLabel(key) }}</span>
              </div>
              <span
                class="text-body-2 font-weight-medium"
                style="font-variant-numeric: tabular-nums"
              >
                {{ fmtEur(datos?.facturasPorEstado?.[key]?.importe) }}
              </span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Bar apilado: gasto mensual -->
      <VCol
        cols="12"
        md="7"
        lg="8"
      >
        <VCard class="h-100">
          <VCardItem>
            <VCardTitle>Gasto mensual (facturas proveedor)</VCardTitle>
          </VCardItem>
          <VCardText>
            <VueApexCharts
              type="bar"
              height="310"
              :series="gastoSeries"
              :options="gastoOptions"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Top proveedores + Facturación emitida ───────────────────────────── -->
    <VRow class="mb-2">
      <!-- Bar horizontal: top proveedores -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard class="h-100">
          <VCardItem>
            <VCardTitle>Top proveedores por gasto</VCardTitle>
          </VCardItem>
          <VCardText>
            <div
              v-if="!datos?.topProveedores?.length"
              class="text-center text-medium-emphasis py-8"
            >
              Sin datos para el periodo seleccionado
            </div>
            <VueApexCharts
              v-else
              type="bar"
              :height="Math.max(220, (datos?.topProveedores?.length ?? 0) * 40)"
              :series="topSeries"
              :options="topOptions"
            />
          </VCardText>
        </VCard>
      </VCol>

      <!-- Area: facturación emitida -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard class="h-100">
          <VCardItem>
            <VCardTitle>Facturación emitida</VCardTitle>
            <template #append>
              <div class="d-flex gap-3">
                <div class="d-flex align-center gap-1">
                  <span
                    class="d-inline-block rounded"
                    style="width:12px;height:3px;background:#0c6fb4"
                  />
                  <span class="text-caption">Facturado</span>
                </div>
                <div class="d-flex align-center gap-1">
                  <span
                    class="d-inline-block rounded"
                    style="width:12px;height:3px;background:#28C76F"
                  />
                  <span class="text-caption">Cobrado</span>
                </div>
              </div>
            </template>
          </VCardItem>
          <VCardText>
            <VueApexCharts
              type="area"
              height="270"
              :series="emitidaSeries"
              :options="emitidaOptions"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tablas de atención ──────────────────────────────────────────────── -->
    <VRow>
      <!-- Facturas con incidencias -->
      <VCol
        cols="12"
        lg="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle class="d-flex align-center gap-2">
              <VIcon
                icon="tabler-alert-triangle"
                color="error"
                size="20"
              />
              Facturas con incidencias
            </VCardTitle>
            <template #append>
              <VBtn
                size="small"
                variant="tonal"
                color="error"
                to="/facturas"
              >
                Ver todas
              </VBtn>
            </template>
          </VCardItem>

          <VDataTable
            :headers="headersIncidencias"
            :items="datos?.ultimasFacturasConIncidencias ?? []"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.importe="{ item }">
              <span style="font-variant-numeric: tabular-nums">{{ fmtEur(item.importe) }}</span>
            </template>
            <template #item.estado="{ item }">
              <VChip
                :color="estadoColor(item.estado)"
                size="x-small"
                variant="tonal"
                label
              >
                {{ estadoLabel(item.estado) }}
              </VChip>
            </template>
            <template #item.incidencia="{ item }">
              <span class="text-caption text-medium-emphasis text-truncate d-block" style="max-width:220px">
                {{ item.incidencia }}
              </span>
            </template>
            <template #item.id="{ item }">
              <RouterLink
                :to="`/facturas/${item.id}`"
                class="text-primary text-decoration-none font-weight-medium"
              >
                #{{ item.id }}
              </RouterLink>
            </template>
            <template #no-data>
              <div class="text-center text-medium-emphasis py-4">
                Sin incidencias en el periodo
              </div>
            </template>
          </VDataTable>
        </VCard>
      </VCol>

      <!-- Movimientos sin conciliar -->
      <VCol
        cols="12"
        lg="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle class="d-flex align-center gap-2">
              <VIcon
                icon="tabler-building-bank"
                color="primary"
                size="20"
              />
              Movimientos sin conciliar
            </VCardTitle>
            <template #append>
              <VBtn
                size="small"
                variant="tonal"
                color="primary"
                to="/pagos/movimientos-bancarios"
              >
                Ver todos
              </VBtn>
            </template>
          </VCardItem>

          <VDataTable
            :headers="headersMovimientos"
            :items="datos?.movimientosPendientesRecientes ?? []"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #item.importe="{ item }">
              <span
                style="font-variant-numeric: tabular-nums"
                :class="(item.importe ?? 0) < 0 ? 'text-error' : 'text-success'"
              >
                {{ fmtEur(item.importe) }}
              </span>
            </template>
            <template #item.concepto="{ item }">
              <span class="text-caption text-truncate d-block" style="max-width:260px">
                {{ item.concepto }}
              </span>
            </template>
            <template #no-data>
              <div class="text-center text-medium-emphasis py-4">
                Sin movimientos pendientes
              </div>
            </template>
          </VDataTable>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
