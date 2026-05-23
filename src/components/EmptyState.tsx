import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize, spacing } from '@/theme'

interface EmptyStateProps {
  icon:  string
  title: string
  desc?: string
}

export default function EmptyState({ icon, title, desc }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {desc && <Text style={styles.desc}>{desc}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap:            spacing.sm,
  },
  icon:  { fontSize: 48 },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text1, textAlign: 'center' },
  desc:  { fontSize: fontSize.sm, color: colors.text3, textAlign: 'center', maxWidth: 260 },
})
