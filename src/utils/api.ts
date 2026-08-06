import { ofetch } from 'ofetch'

/**
 * Extrae el mensaje de error de una respuesta fallida de la API, cubriendo los distintos formatos usados
 * por el backend: {error}, {message} (GlobalExceptionHandler) o {detail} (ProblemDetail de ResponseStatusException).
 */
export function apiErrorMessage(e: any, fallback: string): string {
  return e?.data?.error || e?.data?.message || e?.data?.detail || fallback
}

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken) {
      const headers = new Headers(options.headers as HeadersInit)
      headers.set('Authorization', `Bearer ${accessToken}`)
      options.headers = headers
    }
  },
  async onResponseError({ response }) {
    if (response.status === 401) {
      useCookie<string | null>('accessToken').value = null
      useRouter().push('/login')
    }
  },
})
