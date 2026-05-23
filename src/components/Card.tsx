import { View, ViewStyle, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '@/theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  deep?: boolean   // deeper background (for input containers)
  padding?: number
}

export default function Card({ children, style, deep, padding = spacing.lg }: CardProps) {
  return (
    <View style={[styles.card, deep && styles.deep, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  deep: {
    backgroundColor: colors.bgDeep,
  },
})
