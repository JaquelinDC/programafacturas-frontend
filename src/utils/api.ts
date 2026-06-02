import { ofetch } from 'ofetch'

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
      const accessToken = useCookie<string | null>('accessToken')
      accessToken.value = null
      const router = useRouter()
      router.push('/login')
    }
  },
})
