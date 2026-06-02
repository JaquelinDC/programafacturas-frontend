<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore()
</script>

<template>
  <div>
    <VCard class="mb-6">
      <VCardText>
        <h4 class="text-h4 mb-1">
          Bienvenido, {{ authStore.nombreCompleto || authStore.username }} 👋
        </h4>
        <p class="text-body-1 mb-0">
          Panel de gestión de facturas TRACOM
        </p>
      </VCardText>
    </VCard>

    <VRow>
      <VCol cols="12" sm="6" lg="3">
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar color="primary" variant="tonal" size="42" rounded>
              <VIcon icon="tabler-file-invoice" />
            </VAvatar>
            <div>
              <p class="text-body-2 mb-0">Facturas Proveedores</p>
              <RouterLink :to="{ name: 'facturas' }" class="text-h6 text-primary text-decoration-none">
                Ver listado
              </RouterLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar color="success" variant="tonal" size="42" rounded>
              <VIcon icon="tabler-file-text" />
            </VAvatar>
            <div>
              <p class="text-body-2 mb-0">Facturas Emitidas</p>
              <RouterLink :to="{ name: 'facturas-emitidas' }" class="text-h6 text-success text-decoration-none">
                Ver listado
              </RouterLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar color="info" variant="tonal" size="42" rounded>
              <VIcon icon="tabler-building-bank" />
            </VAvatar>
            <div>
              <p class="text-body-2 mb-0">Extractos Bancarios</p>
              <RouterLink :to="{ name: 'extractos' }" class="text-h6 text-info text-decoration-none">
                Ver listado
              </RouterLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" lg="3">
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar color="warning" variant="tonal" size="42" rounded>
              <VIcon icon="tabler-truck" />
            </VAvatar>
            <div>
              <p class="text-body-2 mb-0">Proveedores</p>
              <RouterLink :to="{ name: 'proveedores' }" class="text-h6 text-warning text-decoration-none">
                Ver listado
              </RouterLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
