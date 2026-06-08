<script setup lang="ts">
import type { PagoDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Pagos' } })

const loading = ref(false)
const pagos = ref<PagoDto[]>([])

const totalPagos = computed(() => pagos.value.length)
const totalImporte = computed(() => {
  const suma = pagos.value.reduce((acc, p) => acc + (p.importePago ?? 0), 0)
  return `${suma.toFixed(2)} €`
})
const pagosSinFactura = computed(() => pagos.value.filter(p => p.facturasProveedorIds.length === 0).length)

async function cargar() {
  loading.value = true
  try {
    pagos.value = await $api<PagoDto[]>('/pagos')
  }
  finally {
    loading.value = false
  }
}

onMounted(cargar)

const blocks = [
  {
    title: 'Pagos registrados',
    description: 'Listado de pagos dados de alta en la aplicación.',
    icon: 'tabler-receipt',
    color: 'primary',
    to: '/pagos/registrados',
  },
  {
    title: 'Alta y edición',
    description: 'Crear, revisar y mantener pagos manuales.',
    icon: 'tabler-cash',
    color: 'success',
    to: '/pagos/manual',
  },
  {
    title: 'Movimientos bancarios',
    description: 'Vista administrativa global de apuntes y enlaces.',
    icon: 'tabler-list-search',
    color: 'info',
    to: '/pagos/movimientos-bancarios',
  },
  {
    title: 'Conciliación',
    description: 'Conceptos no conciliables y flujo de ayuda para bancos.',
    icon: 'tabler-ban',
    color: 'warning',
    links: [
      { label: 'Conceptos no conciliables', to: '/pagos/conciliacion-conceptos' },
      { label: 'Extractos bancarios', to: '/extractos' },
    ],
  },
]
</script>

<template>
  <div>
    <VCard class="mb-6">
      <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
        <div>
          <h4 class="text-h4 mb-1">
            Pagos
          </h4>
          <p class="text-body-1 mb-0">
            Bloque operativo de conciliación, pagos y extractos
          </p>
          <div class="d-flex flex-wrap gap-4 mt-3">
            <div>
              <p class="text-caption text-disabled mb-0">
                Pagos registrados
              </p>
              <p class="text-h6 mb-0">
                <VSkeletonLoader v-if="loading" type="text" width="40" />
                <span v-else>{{ totalPagos }}</span>
              </p>
            </div>
            <VDivider vertical />
            <div>
              <p class="text-caption text-disabled mb-0">
                Total importe
              </p>
              <p class="text-h6 mb-0">
                <VSkeletonLoader v-if="loading" type="text" width="80" />
                <span v-else>{{ totalImporte }}</span>
              </p>
            </div>
            <VDivider vertical />
            <div>
              <p class="text-caption text-disabled mb-0">
                Sin factura
              </p>
              <p class="text-h6 mb-0">
                <VSkeletonLoader v-if="loading" type="text" width="40" />
                <VChip v-else-if="pagosSinFactura > 0" color="warning" size="small" label>
                  {{ pagosSinFactura }}
                </VChip>
                <span v-else class="text-success">0</span>
              </p>
            </div>
          </div>
        </div>
        <VBtn
          to="/pagos/registrados"
          color="primary"
        >
          Abrir pagos registrados
        </VBtn>
      </VCardText>
    </VCard>

    <VRow>
      <VCol
        v-for="block in blocks"
        :key="block.title"
        cols="12"
        md="6"
        lg="3"
      >
        <VCard class="h-100">
          <VCardText class="d-flex flex-column gap-4 h-100">
            <div class="d-flex align-center gap-3">
              <VAvatar
                :color="block.color"
                variant="tonal"
                size="42"
                rounded
              >
                <VIcon :icon="block.icon" />
              </VAvatar>
              <div>
                <h5 class="text-h6 mb-1">
                  {{ block.title }}
                </h5>
                <p class="text-body-2 mb-0">
                  {{ block.description }}
                </p>
              </div>
            </div>

            <div
              v-if="block.to"
              class="mt-auto"
            >
              <VBtn
                :to="block.to"
                variant="tonal"
                block
              >
                Abrir
              </VBtn>
            </div>

            <div
              v-else
              class="d-flex flex-column gap-2 mt-auto"
            >
              <VBtn
                v-for="link in block.links"
                :key="link.label"
                :to="link.to"
                variant="tonal"
                block
              >
                {{ link.label }}
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
