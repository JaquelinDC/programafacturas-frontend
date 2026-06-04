<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

definePage({ meta: { title: 'Inicio' } })

const authStore = useAuthStore()

const blocks = [
  {
    title: 'Operativa diaria',
    description: 'Facturas proveedor, facturas emitidas y acciones de carga.',
    icon: 'tabler-file-invoice',
    color: 'primary',
    links: [
      { label: 'Facturas proveedor', to: { name: 'facturas' } },
      { label: 'Facturas emitidas', to: { name: 'facturas-emitidas' } },
      { label: 'Subir ticket', to: { name: 'facturas-subir-ticket' } },
    ],
  },
  {
    title: 'Conciliación bancaria',
    description: 'Pagos, extractos y movimientos para el trabajo diario.',
    icon: 'tabler-building-bank',
    color: 'success',
    links: [
      { label: 'Pagos', to: { name: 'pagos' } },
      { label: 'Extractos', to: { name: 'extractos' } },
      { label: 'Movimientos bancarios', to: { name: 'pagos-movimientos-bancarios' } },
    ],
  },
  {
    title: 'Maestros',
    description: 'Catálogos de soporte para el resto de la operativa.',
    icon: 'tabler-database',
    color: 'warning',
    links: [
      { label: 'Proveedores', to: { name: 'proveedores' } },
      { label: 'Clientes', to: { name: 'clientes' } },
      { label: 'Entidades', to: { name: 'entidades' } },
    ],
  },
  {
    title: 'Administración',
    description: 'Gestión de usuarios y acceso administrativo.',
    icon: 'tabler-shield-lock',
    color: 'error',
    links: [
      { label: 'Usuarios', to: { name: 'usuarios' } },
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
            Bienvenido, {{ authStore.nombreCompleto || authStore.username }}
          </h4>
          <p class="text-body-1 mb-0">
            Panel operativo de facturación y conciliación
          </p>
        </div>
        <VChip
          color="primary"
          variant="tonal"
          label
        >
          Prioridad: facturas y pagos
        </VChip>
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

            <div class="d-flex flex-column gap-2 mt-auto">
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
