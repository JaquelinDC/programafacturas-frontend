import { ofetch } from 'ofetch'

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken) {
      options.headers = {
        ...(options.headers as unknown as Record<string, string>),
        Authorization: `Bearer ${accessToken}`,
      }
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
