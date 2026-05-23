import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize, spacing } from '@/theme'

interface Stat {
  val:   string
  lbl:   string
  color?: string
}

export default function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={s.lbl} style={styles.item}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.inner}>
            <Text style={[styles.val, s.color ? { color: s.color } : {}]}>{s.val}</Text>
            <Text style={styles.lbl}>{s.lbl}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  item:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  inner:   { alignItems: 'center', gap: 2 },
  val:     { fontSize: fontSize.hero, fontWeight: '400', color: colors.text1 },
  lbl:     { fontSize: fontSize.xs, color: colors.text3 },
})
