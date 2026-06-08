<script setup lang="ts">
import type {
  CodigoCuentaGastoDto,
  EntidadDto,
  FacturaProveedorDto,
  ProveedorFacturaDto,
  TipoPagoDto,
} from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Detalle Factura Proveedor' } })

const route = useRoute()
const router = useRouter()
const id = computed(() => (route.params as { id: string }).id)
const listadoTarget = computed(() => ({ path: '/facturas', query: route.query.q ? { q: route.query.q } : undefined }))

// ─── State ────────────────────────────────────────────────────────────────────
const factura = ref<FacturaProveedorDto | null>(null)
const loading = ref(false)
const saving = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

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
  fechaPeticionFactura: '',
  baseImponible: 0,
  iva: 0,
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

// Estado quick change
const nuevoEstado = ref('')
const estadoSaving = ref(false)

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

// ─── Computed selects ─────────────────────────────────────────────────────────
const proveedoresItems = computed(() =>
  proveedores.value.map(p => ({ title: p.nombre, value: p.id }))
)
const entidadesItems = computed(() =>
  entidades.value.map(e => ({ title: e.nombre, value: e.id }))
)
const tiposPagoItems = computed(() =>
  tiposPago.value.map(t => ({ title: t.nombre, value: t.id }))
)
const codigosCuentaItems = computed(() =>
  codigosCuenta.value.map(c => ({ title: `${c.codigo} — ${c.descripcion}`, value: c.id }))
)

// ─── Methods ──────────────────────────────────────────────────────────────────
function fillForm(f: FacturaProveedorDto) {
  form.value = {
    tipo: f.tipo ?? '',
    tipoFacturaFiscal: f.tipoFacturaFiscal ?? '',
    numeroFactura: f.numeroFactura ?? '',
    fechaFactura: f.fechaFactura ? f.fechaFactura.substring(0, 10) : '',
    fechaPeticionFactura: f.fechaPeticionFactura ? f.fechaPeticionFactura.substring(0, 10) : '',
    baseImponible: f.baseImponible ?? 0,
    iva: f.iva ?? 0,
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
        ...form.value,
        tipo: form.value.tipo || null,
        tipoFacturaFiscal: form.value.tipoFacturaFiscal || null,
        fechaFactura: form.value.fechaFactura || null,
        fechaPeticionFactura: form.value.fechaPeticionFactura || null,
      },
    })
    factura.value = updated
    fillForm(updated)
    showMsg('Factura guardada correctamente')
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'Error al guardar', 'error')
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
    showMsg(e?.data?.message || 'Error al cambiar estado', 'error')
  }
  finally {
    estadoSaving.value = false
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
      <VCol cols="12" :md="factura.rutaPdf ? 7 : 12">
        <!-- Datos básicos -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Datos del documento</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.tipo" label="Tipo" :items="tiposFactura" clearable />
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.tipoFacturaFiscal" label="Tipo fiscal" :items="tiposFiscal" clearable />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.numeroFactura" label="Nº Factura" />
              </VCol>
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.fechaFactura" label="Fecha factura" type="date" />
              </VCol>
              <!--
              <VCol cols="12" sm="6">
                <AppTextField v-model="form.fechaPeticionFactura" label="Fecha petición" type="date" />
              </VCol>
            -->
              <VCol cols="12" sm="6">
                <AppSelect
                  v-model="form.proveedorFacturaId"
                  label="Proveedor"
                  :items="proveedoresItems"
                  clearable
                />
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.entidadId" label="Entidad" :items="entidadesItems" clearable />
              </VCol>
              <VCol cols="12" sm="6">
                <AppSelect v-model="form.tipoPagoId" label="Tipo de pago" :items="tiposPagoItems" clearable />
              </VCol>
              <VCol cols="12">
                <AppSelect
                  v-model="form.codigoCuentaGastoId"
                  label="Cuenta de gasto"
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
              <VCol cols="6" sm="3">
                <AppTextField v-model.number="form.baseImponible" label="Base imponible" type="number" />
              </VCol>
              <VCol cols="6" sm="3">
                <AppTextField v-model.number="form.iva" label="IVA" type="number" />
              </VCol>
              <VCol cols="6" sm="3">
                <AppTextField v-model.number="form.irpf" label="IRPF" type="number" />
              </VCol>
              <VCol cols="6" sm="3">
                <AppTextField v-model.number="form.importeTotal" label="Importe total" type="number" />
              </VCol>
              <VCol cols="12" sm="6" class="d-flex align-center">
                <VSwitch v-model="form.facturaEnDolares" label="Factura en dólares" color="warning" density="compact" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Estado y notas -->
        <VCard class="mb-4">
          <VCardItem><VCardTitle>Estado y notas</VCardTitle></VCardItem>
          <VCardText>
            <VRow>
              <VCol cols="12" sm="6">
                <AppSelect
                  v-model="nuevoEstado"
                  label="Cambiar estado"
                  :items="estadosOptions.map(e => ({ title: estadoLabel[e], value: e }))"
                />
              </VCol>
              <VCol cols="12" sm="6" class="d-flex align-end pb-1">
                <VBtn :loading="estadoSaving" variant="tonal" @click="cambiarEstado">
                  Aplicar estado
                </VBtn>
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="form.comentarioPagoCajaOtros" label="Comentario pago caja/otros" />
              </VCol>
              <VCol cols="12">
                <AppTextarea v-model="form.incidenciasNotas" label="Notas sobre incidencias" rows="3" />
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

        <!-- Líneas IVA (solo lectura) -->
        <VCard v-if="factura.lineasIva && factura.lineasIva.length > 0" class="mb-4">
          <VCardItem><VCardTitle>Líneas de IVA</VCardTitle></VCardItem>
          <VCardText>
            <VTable density="compact">
              <thead>
                <tr>
                  <th>% IVA</th>
                  <th>Base imponible</th>
                  <th>Cuota IVA</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="linea in factura.lineasIva" :key="linea.id">
                  <td>{{ linea.porcentajeIva }}%</td>
                  <td>{{ linea.baseImponible.toFixed(2) }} €</td>
                  <td>{{ linea.cuotaIva.toFixed(2) }} €</td>
                </tr>
              </tbody>
            </VTable>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Columna PDF -->
      <VCol v-if="factura.rutaPdf" cols="12" md="5">
        <VCard class="sticky-top" style="position: sticky; top: 80px;">
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
            <iframe
              v-else-if="pdfBlobUrl"
              :src="pdfBlobUrl"
              style="width: 100%; height: 600px; border: none;"
              title="Factura PDF"
            />
            <div v-else class="pa-4 text-body-2 text-disabled">
              PDF no disponible en este entorno (el fichero no está en el servidor local).
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VSnackbar v-model="snackbar" :color="snackbarColor" location="bottom end">
    {{ snackbarMsg }}
  </VSnackbar>
</template>
