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
      useCookie<string | null>('accessToken').value = null
      useRouter().push('/login')
    }
  },
})
