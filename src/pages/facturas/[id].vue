<script setup lang="ts">
import type {
  CodigoCuentaGastoDto,
  EntidadDto,
  FacturaProveedorDto,
  ProveedorFacturaDto,
  TipoPagoDto,
} from '@/types/api'
import { $api, apiErrorMessage } from '@/utils/api'
import { useErrorDialog } from '@/composables/useErrorDialog'
import { useDisplay } from 'vuetify'

definePage({ meta: { title: 'Detalle Factura Proveedor' } })

const route = useRoute()
const router = useRouter()
const { mdAndUp, smAndDown } = useDisplay()
const { lgAndUp } = useDisplay()
const id = computed(() => (route.params as { id: string }).id)
const listadoTarget = computed(() => ({ path: '/facturas', query: route.query.q ? { q: route.query.q } : undefined }))

// ─── State ────────────────────────────────────────────────────────────────────
const factura = ref<FacturaProveedorDto | null>(null)
const loading = ref(false)
const saving = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const { errorDialogVisible, errorDialogTitle, errorDialogMessage, showErrorDialog } = useErrorDialog()

// ─── Alta proveedor ───────────────────────────────────────────────────────────
const altaProveedorDialog = ref(false)

async function onProveedorCreado(proveedor: ProveedorFacturaDto) {
  proveedores.value.push(proveedor)
  await nextTick()
  form.value.proveedorFacturaId = proveedor.id
  aplicarDefectosProveedor(proveedor.id)
}

// Al seleccionar/cambiar el proveedor (o al cargar una factura recién creada sin estos datos),
// precargar su tipo de facturación y código de cuenta por defecto (si los tiene configurados)
// para no tener que repetirlos en cada factura.
// `soloSiVacio` evita pisar valores que la factura ya trae (p. ej. extraídos por la IA o guardados antes).
function aplicarDefectosProveedor(proveedorId: number | null, soloSiVacio = false) {
  if (!proveedorId) return
  const proveedor = proveedores.value.find(p => p.id === proveedorId)
  if (!proveedor) return
  if (proveedor.tipoFacturacion && (!soloSiVacio || !form.value.tipo))
    form.value.tipo = proveedor.tipoFacturacion
  if (proveedor.codigoCuentaGastoId && (!soloSiVacio || !form.value.codigoCuentaGastoId))
    form.value.codigoCuentaGastoId = proveedor.codigoCuentaGastoId
}

// ─── Dropdown data ────────────────────────────────────────────────────────────
const proveedores = ref<ProveedorFacturaDto[]>([])
const entidades = ref<EntidadDto[]>([])
const tiposPago = ref<TipoPagoDto[]>([])
const codigosCuenta = ref<CodigoCuentaGastoDto[]>([])

// ─── Form ─────────────────────────────────────────────────────────────────────
const form = ref({
  tipo: '',
  tipoFacturaFiscal: '',
  numeroFactura: '',
  fechaFactura: '',
  fechaTrimestre: '',
  fechaPeticionFactura: '',
  lineasIva: [] as { porcentajeIva: number; baseImponible: number }[],
  irpf: 0,
  importeTotal: 0,
  facturaEnDolares: false,
  conceptoGeneral: '',
  incidenciasNotas: '',
  estado: '',
  comentarioPagoCajaOtros: '',
  proveedorFacturaId: null as number | null,
  entidadId: null as number | null,
  tipoPagoId: null as number | null,
  codigoCuentaGastoId: null as number | null,
})

// PDF
const pdfBlobUrl = ref<string | null>(null)
const pdfLoading = ref(false)
const pdfViewerUrl = computed<string | undefined>(() =>
  pdfBlobUrl.value
    ? `${pdfBlobUrl.value}#zoom=page-width&toolbar=0&navpanes=0`
    : undefined
)
// Estado quick change
const nuevoEstado = ref('')
const estadoSaving = ref(false)

// USD conversión
const usdConvirtiendo = ref(false)
const usdMensaje = ref('')

// ─── Constants ────────────────────────────────────────────────────────────────
const tiposFactura = ['INDETERMINADA', 'FACTURA', 'TICKET', 'PROFORMA']
const tiposFiscal = ['ORDINARIA', 'INTRACOMUNITARIA', 'INVERSION_SUJETO_PASIVO']
const estadosOptions = ['PENDIENTE_REVISION', 'SOLICITADA_FACTURA', 'VALIDADA', 'PAGADA']
const estadoLabel: Record<string, string> = {
  PENDIENTE_REVISION: 'Pendiente de revisión',
  SOLICITADA_FACTURA: 'Solicitada factura',
  VALIDADA: 'Validada',
  PAGADA: 'Pagada',
}
const estadoColor: Record<string, string> = {
  PENDIENTE_REVISION: 'warning',
  SOLICITADA_FACTURA: 'info',
  VALIDADA: 'success',
  PAGADA: 'primary',
}

// ─── Trimestre asignado: selects de año/trimestre en vez de fecha libre ───────
const trimestreOptions = [
  { title: 'T1 (enero - marzo)', value: 1 },
  { title: 'T2 (abril - junio)', value: 2 },
  { title: 'T3 (julio - septiembre)', value: 3 },
  { title: 'T4 (octubre - diciembre)', value: 4 },
]
const aniosTrimestre = computed(() => {
  const actual = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => actual - i)
})
function trimestreDeMes(mes: number) {
  return Math.floor((mes - 1) / 3) + 1
}
function inicioTrimestreIso(anio: number, trimestre: number) {
  return `${anio}-${String((trimestre - 1) * 3 + 1).padStart(2, '0')}-01`
}
const trimestreAnioSel = computed({
  get: () => form.value.fechaTrimestre ? Number(form.value.fechaTrimestre.slice(0, 4)) : new Date().getFullYear(),
  set: (anio: number) => {
    form.value.fechaTrimestre = inicioTrimestreIso(anio, trimestreNumSel.value)
  },
})
const trimestreNumSel = computed({
  get: () => form.value.fechaTrimestre ? trimestreDeMes(Number(form.value.fechaTrimestre.slice(5, 7))) : trimestreDeMes(new Date().getMonth() + 1),
  set: (trimestre: number) => {
    form.value.fechaTrimestre = inicioTrimestreIso(trimestreAnioSel.value, trimestre)
  },
})

// ─── Computed — visibilidad por tipo ─────────────────────────────────────────
const esTicket = computed(() => form.value.tipo === 'TICKET')
const esFacturaOProforma = computed(() => ['FACTURA', 'PROFORMA'].includes(form.value.tipo))
const muestraFechaPeticion = computed(() => ['TICKET', 'PROFORMA'].includes(form.value.tipo))
const muestraSeccionProveedor = computed(() => !esTicket.value)
const muestraIvaDesglosado = computed(() => !esTicket.value)
const muestraIrpf = computed(() => !esTicket.value)
const muestraDivisa = computed(() => !esTicket.value)
const muestraCuentaGasto = computed(() => !esTicket.value)

// ─── Computed — IVA calculado ─────────────────────────────────────────────────
const baseCalculada = computed(() =>
  Math.round(form.value.lineasIva.reduce((acc, l) => acc + (l.baseImponible || 0), 0) * 100) / 100
)
const ivaCalculado = computed(() =>
  Math.round(
    form.value.lineasIva.reduce((acc, l) => acc + (l.baseImponible || 0) * (l.porcentajeIva || 0) / 100, 0) * 100
  ) / 100
)
const totalCalculado = computed(() =>
  Math.round((baseCalculada.value + ivaCalculado.value - (form.value.irpf || 0)) * 100) / 100
)
const totalDescuadra = computed(() =>
  Math.abs(totalCalculado.value - (form.value.importeTotal || 0)) > 0.01
)

function addLineaIva() {
  form.value.lineasIva.push({ porcentajeIva: 21, baseImponible: 0 })
}
function removeLineaIva(index: number) {
  form.value.lineasIva.splice(index, 1)
}
function cuotaLinea(linea: { porcentajeIva: number; baseImponible: number }) {
  return Math.round((linea.baseImponible || 0) * (linea.porcentajeIva || 0) / 100 * 100) / 100
}
function formatEUR(v: number) {
  return `${v.toFixed(2)} €`
}

// ─── Computed — estado disponibles según tipo ─────────────────────────────────
const estadosDisponibles = computed(() =>
  estadosOptions.filter(e => e !== 'SOLICITADA_FACTURA' || esTicket.value)
)

// ─── Computed selects ─────────────────────────────────────────────────────────
const proveedoresItems = computed(() =>
  proveedores.value.map(p => ({ title: p.nombre, value: p.id }))
)
const entidadesItems = computed(() =>
  entidades.value.map(e => ({ title: e.nombre, value: e.id }))
)
const tiposPagoItems = computed(() => {
  const items: { title: string; value: number | null }[] = [{ title: 'Pendiente', value: null }]
  tiposPago.value.forEach(t => {
    if (t.nombre) {
      const n = t.nombre.toLowerCase()
      if (n.includes('caja') && n.includes('otros'))
        items.push({ title: t.nombre, value: t.id })
    }
  })
  return items
})
const codigosCuentaItems = computed(() =>
  codigosCuenta.value.map(c => ({ title: `${c.codigo} — ${c.descripcion}`, value: c.id }))
)

// Datos del proveedor seleccionado (para mostrar CIF, CP, Dirección)
const proveedorSeleccionado = computed(() =>
  proveedores.value.find(p => p.id === form.value.proveedorFacturaId) ?? null
)

// ─── Watch — reset estado si tipo cambia de TICKET ────────────────────────────
watch(() => form.value.tipo, (nuevoTipo) => {
  if (nuevoTipo !== 'TICKET' && form.value.estado === 'SOLICITADA_FACTURA') {
    form.value.estado = 'PENDIENTE_REVISION'
    nuevoEstado.value = 'PENDIENTE_REVISION'
  }
})

// ─── Methods ──────────────────────────────────────────────────────────────────
function fillForm(f: FacturaProveedorDto) {
  const tieneLineas = f.lineasIva && f.lineasIva.length > 0

  // Sin líneas desglosadas: inferir un único tipo de IVA por el ratio iva/baseImponible (compatibilidad con datos antiguos)
  let lineasIva: { porcentajeIva: number; baseImponible: number }[] = []
  if (tieneLineas) {
    lineasIva = f.lineasIva!
      .filter(l => Number(l.baseImponible) > 0 || Number(l.porcentajeIva) > 0)
      .map(l => ({ porcentajeIva: Number(l.porcentajeIva) || 0, baseImponible: Number(l.baseImponible) || 0 }))
  } else {
    const baseVal = Number(f.baseImponible ?? 0)
    if (baseVal > 0) {
      const ivaVal = Number(f.iva ?? 0)
      // Sin desglose real: aproxima al tipo de IVA español más cercano en vez del ratio exacto
      // (evita mostrar porcentajes imposibles como "19%" por pequeños desajustes de redondeo).
      const ratio = ivaVal / baseVal * 100
      const tiposReales = [0, 4, 10, 21]
      const pct = tiposReales.reduce((mejor, t) => Math.abs(t - ratio) < Math.abs(mejor - ratio) ? t : mejor, tiposReales[0])
      lineasIva = [{ porcentajeIva: pct, baseImponible: baseVal }]
    }
  }

  form.value = {
    tipo: f.tipo ?? '',
    tipoFacturaFiscal: f.tipoFacturaFiscal ?? '',
    numeroFactura: f.numeroFactura ?? '',
    fechaFactura: f.fechaFactura ? f.fechaFactura.substring(0, 10) : '',
    fechaTrimestre: f.fechaTrimestre ? f.fechaTrimestre.substring(0, 10) : '',
    fechaPeticionFactura: f.fechaPeticionFactura ? f.fechaPeticionFactura.substring(0, 10) : '',
    lineasIva,
    irpf: f.irpf ?? 0,
    importeTotal: f.importeTotal ?? 0,
    facturaEnDolares: f.facturaEnDolares,
    conceptoGeneral: f.conceptoGeneral ?? '',
    incidenciasNotas: f.incidenciasNotas ?? '',
    estado: f.estado ?? '',
    comentarioPagoCajaOtros: f.comentarioPagoCajaOtros ?? '',
    proveedorFacturaId: f.proveedorFacturaId ?? null,
    entidadId: f.entidadId ?? null,
    tipoPagoId: f.tipoPagoId ?? null,
    codigoCuentaGastoId: f.codigoCuentaGastoId ?? null,
  }
  nuevoEstado.value = f.estado ?? ''
}

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

async function cargarPdf() {
  if (!factura.value?.rutaPdf) return
  pdfLoading.value = true
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/facturas/${id.value}/pdf`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!response.ok) {
      if (response.status === 404)
        showMsg('PDF no disponible en este entorno', 'error')
      else
        showMsg('No se pudo cargar el PDF', 'error')
      return
    }
    const blob = await response.blob()
    if (pdfBlobUrl.value) URL.revokeObjectURL(pdfBlobUrl.value)
    pdfBlobUrl.value = URL.createObjectURL(blob)
  }
  catch {
    showMsg('No se pudo cargar el PDF', 'error')
  }
  finally {
    pdfLoading.value = false
  }
}

async function guardar() {
  saving.value = true
  try {
    const updated = await $api<FacturaProveedorDto>(`/facturas/${id.value}`, {
      method: 'PUT',
      body: {
        tipo: form.value.tipo || null,
        tipoFacturaFiscal: form.value.tipoFacturaFiscal || null,
        numeroFactura: form.value.numeroFactura,
        fechaFactura: form.value.fechaFactura || null,
        fechaTrimestre: form.value.fechaTrimestre || null,
        fechaPeticionFactura: form.value.fechaPeticionFactura || null,
        lineasIva: form.value.lineasIva.filter(l => (l.baseImponible || 0) > 0),
        irpf: form.value.irpf,
        importeTotal: form.value.importeTotal,
        facturaEnDolares: form.value.facturaEnDolares,
        conceptoGeneral: form.value.conceptoGeneral,
        incidenciasNotas: form.value.incidenciasNotas,
        estado: form.value.estado || null,
        comentarioPagoCajaOtros: form.value.comentarioPagoCajaOtros,
        proveedorFacturaId: form.value.proveedorFacturaId,
        entidadId: form.value.entidadId,
        tipoPagoId: form.value.tipoPagoId,
        codigoCuentaGastoId: form.value.codigoCuentaGastoId,
      },
    })
    factura.value = updated
    fillForm(updated)
    showMsg('Factura guardada correctamente')
  }
  catch (e: any) {
    showErrorDialog(apiErrorMessage(e, 'Error al guardar'), 'No se pudo guardar la factura')
  }
  finally {
    saving.value = false
  }
}

async function cambiarEstado() {
  if (!nuevoEstado.value) return
  estadoSaving.value = true
  try {
    const updated = await $api<FacturaProveedorDto>(`/facturas/${id.value}/estado`, {
      method: 'PATCH',
      params: { estado: nuevoEstado.value },
    })
    factura.value = updated
    fillForm(updated)
    showMsg('Estado actualizado')
  }
  catch (e: any) {
    showErrorDialog(apiErrorMessage(e, 'Error al cambiar estado'), 'No se pudo cambiar el estado')
  }
  finally {
    estadoSaving.value = false
  }
}

async function convertirUsd() {
  if (!form.value.fechaFactura) {
    showMsg('Introduce la fecha de factura antes de convertir', 'error')
    return
  }
  usdConvirtiendo.value = true
  usdMensaje.value = ''
  try {
    const accessToken = useCookie('accessToken').value
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const resp = await fetch(
      `${baseUrl}/tipo-cambio/usd-eur?fecha=${form.value.fechaFactura}`,
      { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
    )
    if (!resp.ok) throw new Error('No se pudo obtener el tipo de cambio')
    const data: { ok: boolean; usdToEur: number; fecha: string } = await resp.json()
    if (!data.ok || !data.usdToEur) throw new Error('Tipo de cambio no disponible para esa fecha')

    const rate = Number(data.usdToEur)
    const round2 = (v: number) => Math.round(v * rate * 100) / 100
    form.value.lineasIva = form.value.lineasIva.map(l => ({ ...l, baseImponible: round2(l.baseImponible || 0) }))
    if (form.value.irpf) form.value.irpf = round2(form.value.irpf)
    form.value.importeTotal = totalCalculado.value
    usdMensaje.value = `Convertido a EUR con USD/EUR=${rate.toFixed(6)} (${data.fecha})`
  }
  catch (e: any) {
    showMsg(e?.message || 'Error al obtener tipo de cambio', 'error')
  }
  finally {
    usdConvirtiendo.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    [factura.value, proveedores.value, entidades.value, tiposPago.value, codigosCuenta.value] = await Promise.all([
      $api<FacturaProveedorDto>(`/facturas/${id.value}`),
      $api<ProveedorFacturaDto[]>('/proveedores-factura'),
      $api<EntidadDto[]>('/entidades?todas=true'),
      $api<TipoPagoDto[]>('/tipos-pago?todos=true'),
      $api<CodigoCuentaGastoDto[]>('/codigos-cuenta-gasto'),
    ])
    fillForm(factura.value)
    aplicarDefectosProveedor(factura.value.proveedorFacturaId ?? null, true)
    if (factura.value.rutaPdf)
      cargarPdf()
  }
  finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (pdfBlobUrl.value) URL.revokeObjectURL(pdfBlobUrl.value)
})
</script>

<template>
  <div v-if="loading" class="d-flex justify-center pa-8">
    <VProgressCircular indeterminate />
  </div>

  <div v-else-if="factura">
    <!-- Cabecera -->
    <div class="d-flex align-center gap-3 mb-4">
      <VBtn icon variant="text" @click="router.push(listadoTarget)">
        <VIcon icon="tabler-arrow-left" />
      </VBtn>
      <div class="flex-grow-1">
        <h5 class="text-h5">Factura #{{ factura.id }}</h5>
        <span class="text-body-2 text-disabled">{{ factura.proveedorFacturaNombre ?? 'Sin proveedor' }}</span>
      </div>
      <VChip
        v-if="factura.estado"
        :color="estadoColor[factura.estado] ?? 'default'"
        label
      >
        {{ estadoLabel[factura.estado] ?? factura.estado }}
      </VChip>
      <VBtn :loading="saving" color="primary" @click="guardar">
        <VIcon start icon="tabler-device-floppy" /> Guardar
      </VBtn>
    </div>

    <VRow>
      <!-- Columna principal: formulario -->
      <VCol cols="12" md="12" :lg="factura.rutaPdf ? 6 : 12" order="2" order-lg="1">

         <!-- Datos básicos -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Datos del proveedor (como en la factura)</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
             

              <!-- Proveedor y sus datos (oculto para TICKET) -->
              <template v-if="muestraSeccionProveedor">
                <VCol cols="12" sm="8">
                  <AppSelect
                    v-model="form.proveedorFacturaId"
                    label="Proveedor"
                    :items="proveedoresItems"
                    clearable
                    @update:model-value="aplicarDefectosProveedor"
                  />
                 
                </VCol>
                <VCol cols="12" sm="4" class="d-flex align-end">
                  <VBtn @click="altaProveedorDialog = true">
                    <VIcon start icon="tabler-user-plus" />
                    Alta Proveedor
                  </VBtn>
                </VCol>
                <VCol cols="12 pt-0">
                  <span class="text-body-2 text-primary">
                    Si el proveedor no está en la lista, rellene los datos y use <strong>Alta de proveedor</strong> para crearlo y asignarlo a esta factura.
                  </span>
                </VCol>
               
                <VCol cols="12" sm="12">
                    <AppTextField
                      :model-value="factura.proveedorFacturaNombre ?? proveedorSeleccionado?.nombre ?? ''"
                      label="Nombre"
                      readonly
                      variant="outlined"
                    />
                  </VCol>
                <template v-if="form.proveedorFacturaId">
                  <VCol cols="12" sm="6">
                    <AppTextField
                      :model-value="factura.proveedorFacturaCif ?? proveedorSeleccionado?.cif ?? ''"
                      label="CIF"
                      readonly
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" sm="6">
                    <AppTextField
                      :model-value="factura.proveedorFacturaCodigoPostal ?? proveedorSeleccionado?.codigoPostal ?? ''"
                      label="Código postal"
                      readonly
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" sm="12">
                    <AppTextField
                      :model-value="factura.proveedorFacturaDireccion ?? proveedorSeleccionado?.direccion ?? ''"
                      label="Dirección"
                      readonly
                      variant="outlined"
                    />
                  </VCol>
                </template>
              </template>

            </VRow>
          </VCardText>
        </VCard>




        <!-- Datos básicos -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Datos de la factura</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
               <VCol v-if="!esTicket" cols="12" sm="6">
                <AppTextField v-model="form.numeroFactura" label="Nº Factura" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.fechaFactura" label="Fecha factura" type="date" />
              </VCol>
              <VCol cols="12" sm="6">
                <div class="d-flex gap-2">
                  <AppSelect
                    v-model="trimestreAnioSel"
                    :items="aniosTrimestre"
                    label="Año"
                    style="max-width: 110px;"
                  />
                  <AppSelect
                    v-model="trimestreNumSel"
                    :items="trimestreOptions"
                    item-title="title"
                    item-value="value"
                    label="Trimestre asignado"
                    class="flex-grow-1"
                  />
                </div>
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Periodo en que se contabiliza esta factura. Por defecto se calcula desde la fecha de factura; cámbialo para reasignarla a otro periodo.
                </p>
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.tipo" label="Tipo" :items="tiposFactura" clearable />
              </VCol>
              <VCol v-if="esFacturaOProforma" cols="12" sm="6">
                <AppSelect v-model="form.tipoFacturaFiscal" label="Tipo fiscal" :items="tiposFiscal" clearable />
              </VCol>
             
              <VCol v-if="muestraFechaPeticion" cols="12" sm="6">
                <AppTextField v-model="form.fechaPeticionFactura" label="Fecha petición" type="date" />
              </VCol>

              <VCol cols="12" sm="6">
                <AppSelect v-model="form.entidadId" label="A quien se aplica" :items="entidadesItems" clearable />
              </VCol>
              <VCol cols="12" sm="6">
                <p class="text-body-2 text-medium-emphasis mb-1">Tipo de pago</p>
                <div class="d-flex flex-wrap gap-2">
                  <VBtn
                    v-for="item in tiposPagoItems"
                    :key="String(item.value)"
                    size="small"
                    :color="form.tipoPagoId === item.value ? 'primary' : undefined"
                    :variant="form.tipoPagoId === item.value ? 'flat' : 'tonal'"
                    @click="form.tipoPagoId = item.value"
                  >
                    {{ item.title }}
                  </VBtn>
                </div>
              </VCol>
              <VCol v-if="muestraCuentaGasto" cols="12">
                <AppSelect
                  v-model="form.codigoCuentaGastoId"
                  label="Código cuenta gasto (opcional)"
                  :items="codigosCuentaItems"
                  clearable
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.conceptoGeneral" label="Concepto general" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Importes -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Importes</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
              <!-- Bases imponibles por tipo de IVA (oculto para TICKET) -->
              <template v-if="muestraIvaDesglosado">
                <VCol cols="12" class="d-flex align-center justify-space-between flex-wrap gap-2">
                  <p class="text-subtitle-2 mb-0">Bases imponibles por tipo de IVA</p>
                  <VBtn size="x-small" variant="tonal" prepend-icon="tabler-plus" @click="addLineaIva">
                    Añadir tipo de IVA
                  </VBtn>
                </VCol>

                <VCol cols="12">
                  <VCard
                    v-for="(linea, idx) in form.lineasIva"
                    :key="idx"
                    variant="outlined"
                    class="d-flex flex-wrap align-center gap-3 pa-3 mb-2"
                  >
                    <div style="width: 90px;">
                      <AppTextField
                        v-model.number="linea.porcentajeIva"
                        label="% IVA"
                        type="number" step="0.01" min="0"
                        density="compact"
                        @update:model-value="form.importeTotal = totalCalculado"
                      />
                    </div>
                    <div style="min-width: 160px; flex: 1 1 160px;">
                      <AppTextField
                        v-model.number="linea.baseImponible"
                        label="Base imponible (€)"
                        type="number" step="0.01" min="0"
                        density="compact"
                        @update:model-value="form.importeTotal = totalCalculado"
                      />
                    </div>
                    <div class="text-body-2 text-medium-emphasis text-no-wrap">
                      Cuota IVA<br>
                      <strong class="text-high-emphasis">{{ formatEUR(cuotaLinea(linea)) }}</strong>
                    </div>
                    <VBtn
                      icon="tabler-trash"
                      size="small"
                      variant="text"
                      color="error"
                      class="ms-auto"
                      @click="removeLineaIva(idx); form.importeTotal = totalCalculado"
                    />
                  </VCard>
                  <p v-if="form.lineasIva.length === 0" class="text-caption text-medium-emphasis mb-0">
                    Sin líneas de IVA. Pulsa "Añadir tipo de IVA" para introducir una base imponible.
                  </p>
                </VCol>

                <VCol cols="12"><VDivider /></VCol>

                <VCol cols="12" sm="6" class="d-flex gap-4">
                  <div>
                    <p class="text-caption text-medium-emphasis mb-0">Base imponible total</p>
                    <p class="text-subtitle-1 font-weight-medium mb-0">{{ formatEUR(baseCalculada) }}</p>
                  </div>
                  <div>
                    <p class="text-caption text-medium-emphasis mb-0">IVA total</p>
                    <p class="text-subtitle-1 font-weight-medium mb-0">{{ formatEUR(ivaCalculado) }}</p>
                  </div>
                </VCol>
              </template>

              <VCol v-if="muestraIrpf" cols="6" sm="3">
                <AppTextField
                  v-model.number="form.irpf"
                  label="IRPF (€)"
                  type="number" step="0.01"
                  @update:model-value="form.importeTotal = totalCalculado"
                />
              </VCol>
              <VCol cols="6" sm="3">
                <AppTextField v-model.number="form.importeTotal" label="Importe total (€)" type="number" step="0.01" />
              </VCol>
              <VCol v-if="muestraIvaDesglosado && totalDescuadra" cols="12">
                <VAlert type="warning" variant="tonal" density="compact">
                  El total no cuadra con las bases imponibles e impuestos.
                </VAlert>
              </VCol>

              <!-- Divisa USD (oculto para TICKET) -->
              <template v-if="muestraDivisa">
                <VCol cols="12" sm="6" class="d-flex align-center">
                  <VSwitch v-model="form.facturaEnDolares" label="Factura en dólares (USD)" color="warning" density="compact" />
                </VCol>
                <VCol v-if="form.facturaEnDolares" cols="12" sm="6" class="d-flex align-center gap-2">
                  <VBtn
                    :loading="usdConvirtiendo"
                    variant="tonal"
                    color="warning"
                    size="small"
                    @click="convertirUsd"
                  >
                    <VIcon start icon="tabler-currency-euro" />
                    Convertir importes a EUR (fecha factura)
                  </VBtn>
                </VCol>
                <VCol v-if="usdMensaje" cols="12">
                  <VAlert type="info" variant="tonal" density="compact" closable @click:close="usdMensaje = ''">
                    {{ usdMensaje }}
                  </VAlert>
                </VCol>
              </template>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Estado y notas -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Estado y notas</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
              <VCol cols="12">
                <p class="text-body-2 text-medium-emphasis mb-1">Cambiar estado</p>
                <div class="d-flex flex-wrap gap-2">
                  <VBtn
                    v-for="e in estadosDisponibles"
                    :key="e"
                    size="small"
                    :color="nuevoEstado === e ? 'primary' : undefined"
                    :variant="nuevoEstado === e ? 'flat' : 'tonal'"
                    @click="nuevoEstado = e"
                  >
                    {{ estadoLabel[e] }}
                  </VBtn>
                </div>
              </VCol>
              <VCol cols="12" class="d-flex">
                <VBtn :loading="estadoSaving" variant="tonal" @click="cambiarEstado">
                  Aplicar estado
                </VBtn>
              </VCol>
              <VCol cols="12">
                <AppTextarea v-model="form.comentarioPagoCajaOtros" label="Comentario pago caja/otros" rows="2" auto-grow />
              </VCol>
              <VCol cols="12">
                <AppTextarea v-model="form.incidenciasNotas" label="Notas sobre incidencias" rows="2" auto-grow />
              </VCol>
            </VRow>

            <VAlert
              v-if="factura.incidencias"
              type="warning"
              variant="tonal"
              class="mt-3"
              density="compact"
            >
              <strong>Incidencias:</strong> {{ factura.incidencias }}
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Columna PDF -->
      <VCol v-if="factura.rutaPdf" cols="12" md="12" lg="6" order="1" order-lg="2">
        <VCard
          class="pdf-card"
          :class="{ 'pdf-card--sticky': lgAndUp }"
        >
          <VCardItem>
            <VCardTitle>PDF Adjunto</VCardTitle>
            <template #append>
              <VBtn
                v-if="pdfBlobUrl"
                :href="pdfBlobUrl"
                target="_blank"
                icon
                size="small"
                variant="text"
              >
                <VIcon icon="tabler-external-link" />
              </VBtn>
            </template>
          </VCardItem>

          <VCardText class="pa-0">
            <div v-if="pdfLoading" class="d-flex justify-center pa-8">
              <VProgressCircular indeterminate />
            </div>

            <div v-else-if="pdfBlobUrl" class="pdf-wrapper">
              <iframe
                :src="pdfViewerUrl"
                class="pdf-iframe"
                title="Factura PDF"
              />
            </div>

            <div v-else class="pa-4 text-body-2 text-disabled">
              PDF no disponible en este entorno.
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
    {{ snackbarMsg }}
  </VSnackbar>

  <ErrorAlertDialog v-model="errorDialogVisible" :title="errorDialogTitle" :message="errorDialogMessage" />

  <ProveedorFormDialog v-model="altaProveedorDialog" @saved="onProveedorCreado" />
</template>
<style lang="scss" scoped>
@use '@/assets/styles/pages/facturas/edit.scss';
</style>
