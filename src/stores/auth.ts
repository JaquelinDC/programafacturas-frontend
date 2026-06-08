import type { AuthResponse } from '@/types/api'
import { $api } from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const accessToken = useCookie<string | null>('accessToken', { default: () => null })
  const username = ref<string | null>(null)
  const nombreCompleto = ref<string | null>(null)
  const rol = ref<string | null>(null)
  const empresaId = ref<number | null>(null)
  const empresaNombre = ref<string | null>(null)

  // ─── Getters ─────────────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => rol.value === 'ADMINISTRADOR')
  const isSuperAdmin = computed(() => rol.value === 'SUPERADMIN')

  // ─── Actions ──────────────────────────────────────────────────────────────────

  async function login(user: string, password: string): Promise<void> {
    const res = await $api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { username: user, password },
    })

    accessToken.value = res.accessToken
    username.value = res.username
    nombreCompleto.value = res.nombreCompleto
    rol.value = res.rol
    empresaId.value = res.empresaId ?? null
    empresaNombre.value = res.empresaNombre ?? null
  }

  async function fetchMe(): Promise<void> {
    try {
      const res = await $api<AuthResponse>('/auth/me')
      username.value = res.username
      nombreCompleto.value = res.nombreCompleto
      rol.value = res.rol
      empresaId.value = res.empresaId ?? null
      empresaNombre.value = res.empresaNombre ?? null
    }
    catch {
      logout()
    }
  }

  function logout(): void {
    accessToken.value = null
    username.value = null
    nombreCompleto.value = null
    rol.value = null
    empresaId.value = null
    empresaNombre.value = null
    const router = useRouter()
    router.push('/login')
  }

  return {
    accessToken,
    username,
    nombreCompleto,
    rol,
    empresaId,
    empresaNombre,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    login,
    fetchMe,
    logout,
  }
})
