import axios from 'axios'
import { auth } from '@/lib/firebase'
import { router } from 'expo-router'

// reason: base URL is the publicly-accessible Cloudflare Tunnel domain
// Set EXPO_PUBLIC_API_URL in .env (e.g., https://lifelog.yourdomain.com/api)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://lifelog.homelab.local/api'

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// Attach Firebase JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      router.replace('/(auth)')
    }
    return Promise.reject(err)
  },
)

export default apiClient
