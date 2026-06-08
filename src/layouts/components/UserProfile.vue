<script setup lang="ts">
import avatar1 from '@images/avatars/avatar-1.png'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const rolLabel: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMINISTRADOR: 'Administrador',
  ADMINISTRATIVO: 'Administrativo',
}
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VImg :src="avatar1" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    <VImg :src="avatar1" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ authStore.nombreCompleto || authStore.username }}
            </VListItemTitle>
            <VListItemSubtitle>
              {{ rolLabel[authStore.rol ?? ''] ?? authStore.rol }}
            </VListItemSubtitle>
            <VListItemSubtitle v-if="authStore.empresaNombre" class="text-caption">
              {{ authStore.empresaNombre }}
            </VListItemSubtitle>
            <VListItemSubtitle v-else-if="authStore.isSuperAdmin" class="text-caption text-warning">
              Acceso plataforma completa
            </VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem @click="authStore.logout()">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-logout"
                size="22"
              />
            </template>

            <VListItemTitle>Cerrar sesión</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
