import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'

// 🚧 Phase 2 — full implementation coming
export default function SocialScreen() {
  const router = useRouter()
  const meta = MODULE_META['social']
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
        <Text style={styles.title}>{meta.label}</Text>
        <Text style={styles.sub}>{meta.desc}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming in Phase 2</Text>
        </View>
      </View>
    </View>
  )
}

const MODULE_META: Record<string, { label: string; emoji: string; desc: string }> = {
  journal:     { label: 'Journal',      emoji: '📓', desc: 'Morning & evening entries, mood tracking' },
  goals:       { label: 'Goals',        emoji: '🎯', desc: 'Set targets, track milestones'            },
  health:      { label: 'Health',       emoji: '💪', desc: 'Weight, sleep, heart rate, workouts'      },
  reading:     { label: 'Reading',      emoji: '📚', desc: 'Books, progress, notes & summaries'        },
  notes:       { label: 'Notes',        emoji: '🗒️', desc: 'Markdown notes in a tree structure'       },
  reflections: { label: 'Reflections',  emoji: '🪞', desc: 'Weekly and monthly review prompts'        },
  social:      { label: 'Social',       emoji: '👥', desc: 'Keep in touch with people you care about' },
  trips:       { label: 'Trips',        emoji: '✈️', desc: 'Travel log, visited countries & cities'   },
  career:      { label: 'Career',       emoji: '💼', desc: 'Roles, skills, achievements, salary'      },
  finance:     { label: 'Finance',      emoji: '💰', desc: 'Assets, liabilities, goals & net worth'   },
  experiences: { label: 'Experiences',  emoji: '🌟', desc: 'Bucket list & life experiences log'       },
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  back:      { marginBottom: spacing.xl },
  backText:  { fontSize: fontSize.base, color: colors.primary },
  hero:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emoji:     { fontSize: 64 },
  title:     { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text1 },
  sub:       { fontSize: fontSize.base, color: colors.text3, textAlign: 'center', maxWidth: 280 },
  badge:     { backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  badgeText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
})
