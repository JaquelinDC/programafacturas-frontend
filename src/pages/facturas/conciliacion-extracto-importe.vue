<script setup lang="ts">
import type { FacturaConciliacionImporteDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Conciliacion por importe' } })

const loading = ref(false)
const items = ref<FacturaConciliacionImporteDto[]>([])
const selectedFacturaId = ref<number | null>(null)
const selectedMovimientoId = ref<number | null>(null)
const confirmDialog = ref(false)
const actionLoading = ref(false)

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
  loading.value = true
  try {
    items.value = await $api<FacturaConciliacionImporteDto[]>('/facturas/conciliacion-extracto-por-importe')
  }
  catch {
    showMsg('No se pudo cargar la conciliacion por importe', 'error')
  }
  finally {
    loading.value = false
  }
}

const selectedFactura = computed(() => items.value.find(f => f.facturaId === selectedFacturaId.value) ?? null)

async function conciliar() {
  if (!selectedFacturaId.value || !selectedMovimientoId.value)
    return
  actionLoading.value = true
  try {
    const res = await $api<{ ok: boolean; mensaje: string }>('/facturas/conciliacion-extracto-por-importe/conciliar', {
      method: 'POST',
      body: { facturaId: selectedFacturaId.value, movimientoId: selectedMovimientoId.value },
    })

    showMsg(res.mensaje)
    selectedMovimientoId.value = null
    selectedFacturaId.value = null
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

async function desconciliar(facturaId: number) {
  actionLoading.value = true
  try {
    const res = await $api<{ ok: boolean; mensaje: string }>(`/facturas/${facturaId}/desconciliar-extracto`, { method: 'POST' })

    showMsg(res.mensaje)
    await cargar()
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo desconciliar', 'error')
  }
  finally {
    actionLoading.value = false
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '-'
const formatMoney = (n?: number) => n == null ? '-' : `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
const confidenceColor = (confidence?: string) => confidence === 'alta' ? 'success' : confidence === 'media' ? 'warning' : 'secondary'

onMounted(cargar)
</script>

<template>
  <VCard class="mb-4">
    <VCardText class="d-flex align-center justify-space-between flex-wrap gap-3">
      <div>
        <div class="text-h6">
          Conciliacion de facturas con movimientos
        </div>
        <div class="text-body-2 text-disabled">
          Seleccion por importe con ranking, score y apoyo de observaciones.
        </div>
      </div>
      <VBtn
        variant="tonal"
        :loading="loading"
        @click="cargar"
      >
        Actualizar
      </VBtn>
    </VCardText>
  </VCard>

  <VProgressLinear
    v-if="loading"
    indeterminate
    class="mb-4"
  />

  <VRow>
    <VCol
      v-for="item in items"
      :key="item.facturaId"
      cols="12"
    >
      <VCard :variant="selectedFacturaId === item.facturaId ? 'elevated' : 'outlined'">
        <VCardText>
          <div class="d-flex justify-space-between gap-3 mb-2">
            <div>
              <div class="d-flex align-center ga-1">
                <span class="text-subtitle-1 font-weight-medium">
                  {{ item.facturaNumero || `Factura #${item.facturaId}` }}
                </span>
                <IconBtn
                  v-if="item.rutaPdf"
                  size="small"
                  :loading="pdfLoadingId === item.facturaId"
                  @click="verPdf(item.facturaId)"
                >
                  <VIcon icon="tabler-file-type-pdf" color="error" size="20" />
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
                <th>Score</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="mov in item.movimientos"
                :key="mov.movimientoId"
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
                  <div class="d-flex flex-column ga-1 py-1">
                    <div class="d-flex align-center ga-2">
                      <VChip
                        size="x-small"
                        :color="confidenceColor(mov.confidence)"
                        variant="tonal"
                      >
                        {{ mov.confidence || 'baja' }}
                      </VChip>
                      <span class="text-caption">score {{ mov.score }}</span>
                    </div>
                    <div class="d-flex flex-wrap ga-1">
                      <VChip
                        v-for="reason in mov.reasons"
                        :key="reason"
                        size="x-small"
                        variant="outlined"
                      >
                        {{ reason }}
                      </VChip>
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="selectedFacturaId = item.facturaId; selectedMovimientoId = mov.movimientoId; confirmDialog = true"
                  >
                    Seleccionar
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>

          <div class="d-flex justify-end mt-3">
            <VBtn
              size="small"
              variant="text"
              color="error"
              :loading="actionLoading"
              @click="desconciliar(item.facturaId)"
            >
              Desconciliar
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VDialog
    v-model="confirmDialog"
    max-width="520"
  >
    <VCard v-if="selectedFactura">
      <VCardTitle>Confirmar conciliacion</VCardTitle>
      <VCardText>
        Factura {{ selectedFactura.facturaNumero || selectedFactura.facturaId }} con movimiento {{ selectedMovimientoId }}.
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          variant="text"
          @click="selectedFacturaId = null; selectedMovimientoId = null; confirmDialog = false"
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
        <VIcon icon="tabler-file-type-pdf" color="error" class="me-2" />
        Documento
        <VSpacer />
        <IconBtn @click="pdfDialogOpen = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VCardText class="pa-0" style="height: 80vh;">
        <iframe v-if="pdfUrl" :src="pdfUrl" style="width:100%;height:100%;border:none;" />
      </VCardText>
    </VCard>
  </VDialog>
</template>
