import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { colors, spacing, fontSize, fontWeight } from '@/theme'

export default function OfflineBanner() {
  const { isOffline } = useNetworkStatus()
  const insets = useSafeAreaInsets()

  if (!isOffline) return null

  return (
    <View style={[styles.banner, { top: insets.top }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>You're offline — changes won't be saved</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    backgroundColor: colors.amber,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    color: '#000',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
})
