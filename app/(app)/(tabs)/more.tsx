import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { usePreferences } from '@/contexts/PreferencesContext'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'

// ── Module definitions ─────────────────────────────────────────
const MODULES: {
  key:     string
  label:   string
  emoji:   string
  route:   string
  feature: string
  desc:    string
}[] = [
  { key: 'journal',      label: 'Journal',      emoji: '📓', route: '/(app)/journal',      feature: 'journal',      desc: 'Morning & evening entries' },
  { key: 'goals',        label: 'Goals',        emoji: '🎯', route: '/(app)/goals',        feature: 'goals',        desc: 'Track milestones'          },
  { key: 'health',       label: 'Health',       emoji: '💪', route: '/(app)/health',       feature: 'health',       desc: 'Weight, sleep, steps'      },
  { key: 'reading',      label: 'Reading',      emoji: '📚', route: '/(app)/reading',      feature: 'reading',      desc: 'Books & reading log'       },
  { key: 'notes',        label: 'Notes',        emoji: '🗒️', route: '/(app)/notes',        feature: 'notes',        desc: 'Markdown notes tree'       },
  { key: 'reflections',  label: 'Reflections',  emoji: '🪞', route: '/(app)/reflections',  feature: 'reflections',  desc: 'Weekly & monthly reviews'  },
  { key: 'social',       label: 'Social',       emoji: '👥', route: '/(app)/social',       feature: 'social',       desc: 'Stay in touch'             },
  { key: 'trips',        label: 'Trips',        emoji: '✈️', route: '/(app)/trips',        feature: 'trips',        desc: 'Travel log & destinations' },
  { key: 'career',       label: 'Career',       emoji: '💼', route: '/(app)/career',       feature: 'career',       desc: 'Roles, skills & salary'    },
  { key: 'finance',      label: 'Finance',      emoji: '💰', route: '/(app)/finance',      feature: 'finance',      desc: 'Assets, goals & net worth' },
  { key: 'experiences',  label: 'Experiences',  emoji: '🌟', route: '/(app)/experiences',  feature: 'experiences',  desc: 'Life bucket list'          },
]

// ── Module tile ────────────────────────────────────────────────
function ModuleTile({ mod, onPress }: { mod: typeof MODULES[number]; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.tileEmoji}>{mod.emoji}</Text>
      <Text style={styles.tileLabel}>{mod.label}</Text>
      <Text style={styles.tileDesc} numberOfLines={2}>{mod.desc}</Text>
    </TouchableOpacity>
  )
}

// ── Settings shortcut ──────────────────────────────────────────
function SettingsRow({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsIcon}>
        <Text style={{ fontSize: 20 }}>⚙️</Text>
      </View>
      <View style={styles.settingsText}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <Text style={styles.settingsSub}>Currency, theme, module visibility</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

// ── Main screen ────────────────────────────────────────────────
export default function MoreScreen() {
  const router  = useRouter()
  const { isEnabled } = usePreferences()

  const visible = MODULES.filter(m => isEnabled(m.feature))

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.pageTitle}>More</Text>
      <Text style={styles.pageSubtitle}>All modules</Text>

      {/* Module grid */}
      <View style={styles.grid}>
        {visible.map(mod => (
          <ModuleTile
            key={mod.key}
            mod={mod}
            onPress={() => router.push(mod.route as any)}
          />
        ))}
      </View>

      {/* Disabled modules (greyed out) */}
      {MODULES.filter(m => !isEnabled(m.feature)).length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={styles.sectionLabel}>Hidden modules</Text>
          <View style={styles.grid}>
            {MODULES.filter(m => !isEnabled(m.feature)).map(mod => (
              <View key={mod.key} style={[styles.tile, styles.tileDisabled]}>
                <Text style={[styles.tileEmoji, { opacity: 0.4 }]}>{mod.emoji}</Text>
                <Text style={[styles.tileLabel, { opacity: 0.4 }]}>{mod.label}</Text>
                <Text style={styles.tileHidden}>Hidden</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Divider */}
      <View style={styles.hr} />

      {/* Settings */}
      <SettingsRow onPress={() => router.push('/(app)/settings')} />

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoEmoji}>📊</Text>
        <Text style={styles.appInfoName}>LifeLog</Text>
        <Text style={styles.appInfoSub}>Self-hosted · Private by design</Text>
      </View>

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────────────────
const TILE_W = '30%'

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl + 8 },

  pageTitle:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginBottom: spacing.xl, marginTop: 2 },

  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            spacing.sm,
  },

  tile: {
    width:           TILE_W,
    minHeight:       100,
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.md,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.xs,
  },
  tileDisabled: { opacity: 0.6 },
  tileEmoji:    { fontSize: 24 },
  tileLabel:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text1, textAlign: 'center' },
  tileDesc:     { fontSize: 9, color: colors.text3, textAlign: 'center', lineHeight: 13 },
  tileHidden:   { fontSize: 9, color: colors.text3, textAlign: 'center', fontStyle: 'italic' },

  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },

  hr: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },

  settingsRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  settingsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  settingsText: { flex: 1 },
  settingsTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  settingsSub:  { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  chevron:      { fontSize: 20, color: colors.text3, fontWeight: fontWeight.bold },

  appInfo:     { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs, marginTop: spacing.lg },
  appInfoEmoji:{ fontSize: 28 },
  appInfoName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text2 },
  appInfoSub:  { fontSize: fontSize.xs, color: colors.text3 },
})
