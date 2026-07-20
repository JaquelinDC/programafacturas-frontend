<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import type { EmpresaDto, UsuarioDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Administracion', requiresAdmin: true } })

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const empresas = ref<EmpresaDto[]>([])
const usuarios = ref<UsuarioDto[]>([])

watchEffect(() => {
  if (authStore.rol && !authStore.isAdmin && !authStore.isSuperAdmin)
    router.replace('/')
})

async function cargarPanel() {
  if (!authStore.isAdmin && !authStore.isSuperAdmin)
    return

  loading.value = true
  error.value = null

  try {
    const usuariosPromise = $api<UsuarioDto[]>('/usuarios')
    const empresasPromise = authStore.isSuperAdmin
      ? $api<EmpresaDto[]>('/admin/empresas')
      : Promise.resolve([])

    const [usuariosData, empresasData] = await Promise.all([usuariosPromise, empresasPromise])

    usuarios.value = usuariosData
    empresas.value = empresasData
  }
  catch (e: any) {
    error.value = e?.data?.message || 'No se pudo cargar el panel de administracion'
  }
  finally {
    loading.value = false
  }
}

watch(
  () => authStore.rol,
  () => cargarPanel(),
  { immediate: true },
)

const usuariosActivos = computed(() => usuarios.value.filter(usuario => usuario.activo).length)
const empresasActivas = computed(() => empresas.value.filter(empresa => empresa.activa).length)

const stats = computed(() => [
  {
    title: 'Usuarios',
    value: usuarios.value.length,
    subtitle: `${usuariosActivos.value} activos`,
    icon: 'tabler-users',
    color: 'primary',
    to: { name: 'usuarios' },
    visible: authStore.isAdmin || authStore.isSuperAdmin,
  },
  {
    title: 'Empresas',
    value: empresas.value.length,
    subtitle: `${empresasActivas.value} activas`,
    icon: 'tabler-building-skyscraper',
    color: 'success',
    to: { name: 'admin-empresas' },
    visible: authStore.isSuperAdmin,
  },
  {
    title: 'Tenant activo',
    value: authStore.tenantKey || '-',
    subtitle: authStore.empresaNombre || 'Sin empresa seleccionada',
    icon: 'tabler-database',
    color: 'info',
    visible: true,
  },
])

const quickActions = computed(() => [
  {
    title: 'Gestionar usuarios',
    subtitle: 'Alta, baja, roles y estado de acceso',
    icon: 'tabler-user-cog',
    to: { name: 'usuarios' },
    visible: authStore.isAdmin || authStore.isSuperAdmin,
  },
  {
    title: 'Gestionar empresas',
    subtitle: 'Alta de tenants y datos maestros de empresa',
    icon: 'tabler-building-skyscraper',
    to: { name: 'admin-empresas' },
    visible: authStore.isSuperAdmin,
  },
])
</script>

<template>
  <div>
    <VAlert v-if="!authStore.isAdmin && !authStore.isSuperAdmin" type="warning" variant="tonal" class="mb-4">
      Solo los administradores pueden acceder a este panel.
    </VAlert>

    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </VAlert>

    <VCard class="mb-6">
      <VCardItem>
        <VCardTitle>Panel de administracion</VCardTitle>
        <VCardSubtitle>
          Control de usuarios, empresas y contexto multi-tenant.
        </VCardSubtitle>
        <template #append>
          <VBtn icon variant="tonal" :loading="loading" @click="cargarPanel">
            <VIcon icon="tabler-refresh" />
          </VBtn>
        </template>
      </VCardItem>
    </VCard>

    <VRow class="match-height">
      <VCol
        v-for="stat in stats.filter(item => item.visible)"
        :key="stat.title"
        cols="12"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar :color="stat.color" variant="tonal" rounded>
              <VIcon :icon="stat.icon" />
            </VAvatar>
            <div>
              <div class="text-body-2 text-disabled">
                {{ stat.title }}
              </div>
              <div class="text-h5">
                {{ stat.value }}
              </div>
              <div class="text-caption">
                {{ stat.subtitle }}
              </div>
            </div>
            <VSpacer />
            <VBtn v-if="stat.to" icon variant="text" :to="stat.to">
              <VIcon icon="tabler-arrow-right" />
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-2">
      <VCol cols="12" md="7">
        <VCard>
          <VCardItem>
            <VCardTitle>Acciones</VCardTitle>
          </VCardItem>
          <VList lines="two">
            <template
              v-for="action in quickActions.filter(item => item.visible)"
              :key="action.title"
            >
              <VListItem :to="action.to">
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" rounded>
                    <VIcon :icon="action.icon" />
                  </VAvatar>
                </template>
                <VListItemTitle>{{ action.title }}</VListItemTitle>
                <VListItemSubtitle>{{ action.subtitle }}</VListItemSubtitle>
                <template #append>
                  <VIcon icon="tabler-chevron-right" />
                </template>
              </VListItem>
              <VDivider />
            </template>
          </VList>
        </VCard>
      </VCol>

      <VCol cols="12" md="5">
        <VCard>
          <VCardItem>
            <VCardTitle>Sesion actual</VCardTitle>
          </VCardItem>
          <VList density="compact">
            <VListItem title="Usuario" :subtitle="authStore.username || '-'" />
            <VListItem title="Rol" :subtitle="authStore.rol || '-'" />
            <VListItem title="Empresa" :subtitle="authStore.empresaNombre || '-'" />
            <VListItem title="Tenant key" :subtitle="authStore.tenantKey || '-'" />
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
