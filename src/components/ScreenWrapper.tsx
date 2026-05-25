import { ReactNode } from 'react'
import { View, ScrollView, RefreshControl, StyleSheet, Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing } from '@/theme'

interface Props {
  children: ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  padHorizontal?: boolean
}

export default function ScreenWrapper({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  padHorizontal = true,
}: Props) {
  const insets = useSafeAreaInsets()

  const paddingTop = insets.top + spacing.sm
  const paddingBottom = insets.bottom + spacing.lg

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop, paddingBottom }, padHorizontal && styles.padH]}>
        {children}
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        { paddingTop, paddingBottom },
        padHorizontal && styles.padH,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={paddingTop}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  padH: {
    paddingHorizontal: spacing.lg,
  },
})
