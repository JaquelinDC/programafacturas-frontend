<script setup lang="ts">
definePage({ meta: { title: 'Pagos' } })
</script>

<template>
  <VRow>
    <VCol cols="12" md="4">
      <VCard>
        <VCardText class="d-flex flex-column gap-3">
          <VAvatar color="success" variant="tonal" size="42" rounded>
            <VIcon icon="tabler-cash" />
          </VAvatar>
          <div>
            <h5 class="text-h6 mb-1">Pagos manuales</h5>
            <p class="text-body-2 mb-0">Alta, edición y borrado de pagos registrados.</p>
          </div>
          <VBtn to="/pagos/manual" variant="tonal">Abrir CRUD</VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="4">
      <VCard>
        <VCardText class="d-flex flex-column gap-3">
          <VAvatar color="success" variant="tonal" size="42" rounded>
            <VIcon icon="tabler-receipt" />
          </VAvatar>
          <div>
            <h5 class="text-h6 mb-1">Pagos registrados</h5>
            <p class="text-body-2 mb-0">Listado de pagos dados de alta en la app.</p>
          </div>
          <VBtn to="/pagos/registrados" variant="tonal">Abrir listado</VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="4">
      <VCard>
        <VCardText class="d-flex flex-column gap-3">
          <VAvatar color="info" variant="tonal" size="42" rounded>
            <VIcon icon="tabler-building-bank" />
          </VAvatar>
          <div>
            <h5 class="text-h6 mb-1">Extractos bancarios</h5>
            <p class="text-body-2 mb-0">Importa, revisa y descarga extractos.</p>
          </div>
          <VBtn to="/extractos" variant="tonal">Abrir extractos</VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="4">
      <VCard>
        <VCardText class="d-flex flex-column gap-3">
          <VAvatar color="warning" variant="tonal" size="42" rounded>
            <VIcon icon="tabler-ban" />
          </VAvatar>
          <div>
            <h5 class="text-h6 mb-1">Conceptos no conciliables</h5>
            <p class="text-body-2 mb-0">Gestiona la lista negra de conceptos.</p>
          </div>
          <VBtn to="/pagos/conciliacion-conceptos" variant="tonal">Abrir lista</VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="4">
      <VCard>
        <VCardText class="d-flex flex-column gap-3">
          <VAvatar color="primary" variant="tonal" size="42" rounded>
            <VIcon icon="tabler-list-search" />
          </VAvatar>
          <div>
            <h5 class="text-h6 mb-1">Movimientos globales</h5>
            <p class="text-body-2 mb-0">Vista administrativa de todos los apuntes.</p>
          </div>
          <VBtn to="/pagos/movimientos-bancarios" variant="tonal">Abrir vista</VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
