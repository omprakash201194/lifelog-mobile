import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { View, ActivityIndicator } from 'react-native'
import { colors } from '@/theme'

// Root redirect — sends authenticated users to (app), others to (auth)
export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return user ? <Redirect href="/(app)/(tabs)/" /> : <Redirect href="/(auth)/" />
}
