import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { colors, spacing } from '@/theme'

export default function Spinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
})
