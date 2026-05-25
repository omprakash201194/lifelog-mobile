import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { StatusBar } from 'expo-status-bar'
import OfflineBanner from '@/components/OfflineBanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry:     1,
    },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
