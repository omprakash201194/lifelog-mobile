import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useToast } from '@/contexts/ToastContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useLayout } from '@/hooks/useLayout'
import { formatCurrency } from '@/lib/currency'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import ScreenWrapper from '@/components/ScreenWrapper'
import type { DashboardData } from '@/types/models'

// ── Small UI atoms ─────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <View style={[styles.statCard, accent ? { borderColor: accent } : {}]}>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

function SectionHeader({ title, onPress, action }: { title: string; onPress?: () => void; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && action ? (
        <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={action}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

// ── Mood helper ────────────────────────────────────────────────
const MOOD_LABEL = ['', '\u{1F61E}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '\u{1F604}']
function moodLabel(m: number | null) {
  if (m === null || m === 0) return null
  return MOOD_LABEL[m] ?? null
}

// ── Main screen ────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { currency, isEnabled } = usePreferences()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const { tileWidth } = useLayout()

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn:  () => apiClient.get('/dashboard').then(r => r.data),
  })

  // Complete focus task
  const completeFocus = useMutation({
    mutationFn: (id: string) => apiClient.put(`/tasks/${id}`, { completed: true }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      showToast('Task completed!', 'success')
    },
    onError: () => showToast('Failed to complete task', 'error'),
  })

  const netWorthFmt = data
    ? formatCurrency(data.netWorth, currency).replace(/\.\d+$/, '')
    : '\u2014'

  const habitPct = data && data.todayHabits.total > 0
    ? Math.round((data.todayHabits.completed / data.todayHabits.total) * 100)
    : 0

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load dashboard</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Retry">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {greeting()}</Text>
          <Text style={styles.dateText}>{todayLabel()}</Text>
        </View>
        <View style={styles.moodBadge}>
          <Text style={styles.moodEmoji}>{moodLabel(data.reflectionMood) ?? '\u{1F31F}'}</Text>
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <StatCard
          label="Habits today"
          value={`${data.todayHabits.completed}/${data.todayHabits.total}`}
          sub={`${habitPct}% done`}
          accent={habitPct === 100 ? colors.green : undefined}
        />
        <StatCard
          label="Net worth"
          value={netWorthFmt}
          accent={data.netWorth >= 0 ? colors.green : colors.red}
        />
        <StatCard
          label="Focus this week"
          value={`${data.weekFocusMinutes}m`}
          sub={data.weekFocusMinutes >= 300 ? '\u{1F525} On fire' : undefined}
        />
        <StatCard
          label="Active goals"
          value={String(data.activeGoals)}
        />
      </View>

      {/* Habit progress bar */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Today's habits</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/habits')} accessibilityRole="button" accessibilityLabel="View all habits">
            <Text style={styles.linkText}>View all \u2192</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressBg} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: habitPct }}>
          <View style={[styles.progressFill, { width: `${habitPct}%`, backgroundColor: habitPct === 100 ? colors.green : colors.primary }]} />
        </View>
        <Text style={styles.progressLabel}>
          {data.todayHabits.completed} of {data.todayHabits.total} completed
        </Text>
      </View>

      {/* Focus task */}
      {data.focusTask && (
        <View style={styles.card}>
          <SectionHeader title="Focus task" />
          <View style={styles.focusRow}>
            <TouchableOpacity
              style={[styles.focusCheck, data.focusTask.completed && styles.focusCheckDone]}
              disabled={isOffline || data.focusTask.completed}
              onPress={() => !data.focusTask!.completed && completeFocus.mutate(data.focusTask!.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: data.focusTask.completed }}
              accessibilityLabel="Complete focus task">
              {data.focusTask.completed && <Text style={styles.checkMark}>{'\u2713'}</Text>}
            </TouchableOpacity>
            <Text style={[styles.focusTitle, data.focusTask.completed && styles.focusDone]}>
              {data.focusTask.title}
            </Text>
          </View>
        </View>
      )}

      {/* Top streaks */}
      {data.topStreaks.length > 0 && (
        <View style={styles.card}>
          <SectionHeader title="Top streaks \u{1F525}" />
          {data.topStreaks.slice(0, 3).map(s => (
            <View key={s.habitId} style={styles.streakRow}>
              <Text style={styles.streakName}>{s.name}</Text>
              <Text style={styles.streakCount}>{s.streak} days</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick links */}
      <SectionHeader title="Quick access" />
      <View style={styles.quickGrid}>
        {QUICK_LINKS.filter(q => isEnabled(q.feature)).map(q => (
          <TouchableOpacity
            key={q.label}
            style={[styles.quickTile, { width: tileWidth }]}
            onPress={() => router.push(q.route as any)}
            accessibilityRole="button"
            accessibilityLabel={q.label}>
            <Text style={styles.quickEmoji}>{q.emoji}</Text>
            <Text style={styles.quickLabel}>{q.label}</Text>
            {q.badge?.(data) ? <View style={styles.badge}><Text style={styles.badgeText}>{q.badge(data)}</Text></View> : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Journal status */}
      {(data.journalToday.morning || data.journalToday.evening) && (
        <View style={[styles.card, styles.journalRow]}>
          <Text style={styles.journalEmoji}>{'\u{1F4D3}'}</Text>
          <View>
            <Text style={styles.journalTitle}>Journal</Text>
            <Text style={styles.journalSub}>
              {[
                data.journalToday.morning ? 'Morning \u2705' : 'Morning \u2B1C',
                data.journalToday.evening ? 'Evening \u2705' : 'Evening \u2B1C',
              ].join('  ')}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.bottomPad} />
    </ScreenWrapper>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
}

const QUICK_LINKS: { label: string; emoji: string; route: string; feature: string; badge?: (d: DashboardData) => string | null }[] = [
  { label: 'Journal',     emoji: '\u{1F4D3}', route: '/(app)/journal',      feature: 'journal' },
  { label: 'Goals',       emoji: '\u{1F3AF}', route: '/(app)/goals',        feature: 'goals',        badge: d => d.activeGoals > 0 ? String(d.activeGoals) : null },
  { label: 'Health',      emoji: '\u{1F4AA}', route: '/(app)/health',       feature: 'health' },
  { label: 'Reading',     emoji: '\u{1F4DA}', route: '/(app)/reading',      feature: 'reading',      badge: d => d.booksReading > 0 ? String(d.booksReading) : null },
  { label: 'Notes',       emoji: '\u{1F5D2}\uFE0F', route: '/(app)/notes',        feature: 'notes' },
  { label: 'Reflections', emoji: '\u{1FA9E}', route: '/(app)/reflections',  feature: 'reflections' },
  { label: 'Social',      emoji: '\u{1F465}', route: '/(app)/social',       feature: 'social',       badge: d => d.socialOverdue > 0 ? String(d.socialOverdue) : null },
  { label: 'Trips',       emoji: '\u2708\uFE0F', route: '/(app)/trips',        feature: 'trips' },
  { label: 'Career',      emoji: '\u{1F4BC}', route: '/(app)/career',       feature: 'career' },
  { label: 'Finance',     emoji: '\u{1F4B0}', route: '/(app)/finance',      feature: 'finance' },
  { label: 'Experiences', emoji: '\u{1F31F}', route: '/(app)/experiences',  feature: 'experiences' },
]

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  greeting:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  dateText:    { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  moodBadge:   { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  moodEmoji:   { fontSize: 22 },

  statGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard:    { flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  statValue:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text1 },
  statLabel:   { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },
  statSub:     { fontSize: fontSize.xs, color: colors.green, marginTop: 2 },

  card:        { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle:   { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  linkText:    { fontSize: fontSize.sm, color: colors.primary },

  progressBg:    { height: 8, backgroundColor: colors.border, borderRadius: 4, marginVertical: spacing.sm, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: fontSize.xs, color: colors.text3 },

  focusRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  focusCheck:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  focusCheckDone:{ backgroundColor: colors.primary },
  checkMark:     { color: '#fff', fontSize: 13, fontWeight: fontWeight.bold },
  focusTitle:    { flex: 1, fontSize: fontSize.base, color: colors.text1 },
  focusDone:     { textDecorationLine: 'line-through', color: colors.text3 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  sectionAction: { fontSize: fontSize.sm, color: colors.primary },

  streakRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  streakName: { fontSize: fontSize.sm, color: colors.text2 },
  streakCount:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.amber },

  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickTile:  { aspectRatio: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontSize: 10, color: colors.text2, textAlign: 'center' },

  badge:     { position: 'absolute', top: 6, right: 6, backgroundColor: colors.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: fontWeight.bold },

  journalRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  journalEmoji:{ fontSize: 24 },
  journalTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  journalSub:  { fontSize: fontSize.xs, color: colors.text3, marginTop: 2 },

  errorText: { color: colors.text3, fontSize: fontSize.base },
  retryBtn:  { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryText: { color: '#fff', fontWeight: fontWeight.semibold },

  bottomPad: { height: spacing.xxxl },
})
