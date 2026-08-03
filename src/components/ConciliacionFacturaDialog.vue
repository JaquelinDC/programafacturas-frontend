<script setup lang="ts">
import { useConciliacion } from '@/composables/useConciliacion'
import type { ConciliacionCandidatoMovimientoDto, FacturaProveedorDto } from '@/types/api'

const emit = defineEmits<{ updated: [] }>()
const api = useConciliacion()
const dialog = ref(false)
const confirmDialog = ref(false)
const factura = ref<FacturaProveedorDto>()
const candidatos = ref<ConciliacionCandidatoMovimientoDto[]>([])
const seleccionados = ref<number[]>([])
const query = ref('')
const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')

const candidatosSeleccionados = computed(() =>
  candidatos.value.filter(item => seleccionados.value.includes(item.movimiento.id)),
)

const requiereConfirmacion = computed(() =>
  candidatosSeleccionados.value.some(item => item.coincidencia.requiereConfirmacion),
)

const avisos = computed(() =>
  [...new Set(candidatosSeleccionados.value.flatMap(item => item.coincidencia.avisos))],
)

const formatDate = (value?: string) => value ? value.substring(0, 10).split('-').reverse().join('/') : '—'

const formatMoney = (value?: number) => value == null
  ? '—'
  : `${Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

async function abrir(item: FacturaProveedorDto) {
  factura.value = item
  query.value = ''
  seleccionados.value = []
  error.value = ''
  dialog.value = true
  await buscar()
}

async function buscar() {
  if (!factura.value)
    return
  loading.value = true
  error.value = ''
  try {
    const response = await api.candidatosMovimientos(
      'PROVEEDOR',
      factura.value.id,
      { q: query.value, size: 100 },
    )

    candidatos.value = response.content
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudieron buscar movimientos.'
  }
  finally {
    loading.value = false
  }
}

function toggle(id: number, checked: boolean) {
  const next = new Set(seleccionados.value)

  checked ? next.add(id) : next.delete(id)
  seleccionados.value = [...next]
}

async function conciliar() {
  if (!factura.value || !seleccionados.value.length)
    return
  actionLoading.value = true
  error.value = ''
  try {
    await api.enlazar({
      tipoFactura: 'PROVEEDOR',
      facturaIds: [factura.value.id],
      movimientoIds: seleccionados.value,
      confirmarManual: requiereConfirmacion.value,
    })
    confirmDialog.value = false
    dialog.value = false
    emit('updated')
  }
  catch (err: any) {
    error.value = err?.data?.message || err?.message || 'No se pudo completar la conciliación.'
    confirmDialog.value = false
  }
  finally {
    actionLoading.value = false
  }
}

defineExpose({ abrir })
</script>

<template>
  <VDialog
    v-model="dialog"
    max-width="1000"
    scrollable
  >
    <VCard>
      <VCardTitle class="d-flex align-center">
        Conciliar factura con movimientos
        <VSpacer />
        <IconBtn @click="dialog = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VCardSubtitle v-if="factura">
        {{ factura.numeroFactura || `Factura #${factura.id}` }} ·
        {{ factura.proveedorFacturaNombre || 'Sin proveedor' }} ·
        {{ formatMoney(factura.importeTotal) }}
      </VCardSubtitle>
      <VCardText>
        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </VAlert>

        <div class="d-flex gap-2 mb-4">
          <AppTextField
            v-model="query"
            label="ID, concepto, banco, extracto o importe"
            clearable
            @keyup.enter="buscar"
          />
          <VBtn
            prepend-icon="tabler-search"
            variant="tonal"
            :loading="loading"
            @click="buscar"
          >
            Buscar
          </VBtn>
        </div>

        <VProgressLinear
          v-if="loading"
          indeterminate
          class="mb-3"
        />

        <VCard
          v-for="item in candidatos"
          :key="item.movimiento.id"
          variant="outlined"
          class="mb-2"
        >
          <VCardText class="d-flex gap-3">
            <VCheckboxBtn
              :model-value="seleccionados.includes(item.movimiento.id)"
              @update:model-value="toggle(item.movimiento.id, Boolean($event))"
            />
            <div class="flex-grow-1">
              <div class="d-flex justify-space-between gap-3">
                <div>
                  <strong>Mov. #{{ item.movimiento.id }}</strong> ·
                  {{ item.movimiento.concepto || 'Sin concepto' }}
                </div>
                <strong>{{ formatMoney(item.movimiento.importe) }}</strong>
              </div>
              <div class="text-caption text-disabled">
                {{ item.movimiento.banco }} · {{ formatDate(item.movimiento.fecha) }} ·
                Extracto #{{ item.movimiento.extractoId }}
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
          v-if="!loading && !candidatos.length"
          class="text-center text-disabled py-8"
        >
          No se encontraron movimientos.
        </div>
      </VCardText>
      <VCardActions>
        <VBtn
          variant="text"
          @click="dialog = false"
        >
          Cerrar
        </VBtn>
        <VSpacer />
        <VBtn
          color="primary"
          prepend-icon="tabler-link"
          :disabled="!seleccionados.length"
          @click="confirmDialog = true"
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
        Se vinculará la factura con {{ seleccionados.length }} movimiento(s).
        <VAlert
          v-if="requiereConfirmacion"
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
          {{ requiereConfirmacion ? 'Forzar conciliación' : 'Conciliar' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
