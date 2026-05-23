import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Pressable,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Habit, HabitLog } from '@/types/models'

// ── Contribution grid ──────────────────────────────────────────
const CELL = 11
const GAP  = 2
const STEP = CELL + GAP
const WEEKS = 18

interface ContribDay { date: string; count: number }

function buildGrid(data: ContribDay[]) {
  const today = new Date()
  const cells: { dateStr: string; count: number }[] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = data.find(c => c.date === dateStr)
    cells.push({ dateStr, count: found ? Number(found.count) : 0 })
  }
  return cells
}

const LEVEL_COLORS = [
  colors.bgCard,
  '#1d4a2a',
  '#276337',
  '#39874d',
  '#4eba62',
]
function lvl(n: number) {
  if (n === 0) return 0
  if (n < 3)   return 1
  if (n < 5)   return 2
  if (n < 7)   return 3
  return 4
}

function ContribGrid({ data }: { data: ContribDay[] }) {
  const cells = useMemo(() => buildGrid(data), [data])
  const weeks: typeof cells[] = []
  for (let w = 0; w < WEEKS; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))

  return (
    <View style={{ flexDirection: 'row', gap: GAP }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'column', gap: GAP }}>
          {week.map((cell, di) => (
            <View
              key={di}
              style={{
                width: CELL, height: CELL,
                borderRadius: 2,
                backgroundColor: LEVEL_COLORS[lvl(cell.count)],
              }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

// ── Habit row ──────────────────────────────────────────────────
function HabitRow({
  habit, todayLog, onToggle, onEdit,
}: {
  habit: Habit
  todayLog: HabitLog | undefined
  onToggle: () => void
  onEdit:   () => void
}) {
  const done = todayLog?.completed ?? false
  return (
    <View style={styles.habitRow}>
      <TouchableOpacity style={[styles.checkBox, done && styles.checkDone]} onPress={onToggle}>
        {done && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      <Text style={styles.habitIcon}>{habit.icon || '✦'}</Text>
      <Text style={[styles.habitName, done && styles.habitDone]}>{habit.name}</Text>
      <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
        <Text style={styles.editDot}>•••</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Add / Edit modal ───────────────────────────────────────────
const FREQ_OPTIONS = ['daily', 'weekdays', 'weekends', 'weekly']
const DEFAULT_ICONS = ['✅', '💪', '📚', '🧘', '💧', '🏃', '🍎', '💤', '🎯', '✍️']

function HabitModal({
  visible, initial, onSave, onDelete, onClose,
}: {
  visible: boolean
  initial: Partial<Habit> | null
  onSave:  (h: Partial<Habit>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name,  setName]  = useState(initial?.name  ?? '')
  const [icon,  setIcon]  = useState(initial?.icon  ?? '✅')
  const [freq,  setFreq]  = useState(initial?.frequency ?? 'daily')

  const isEdit = !!initial?.id

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{isEdit ? 'Edit habit' : 'New habit'}</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Habit name"
            placeholderTextColor={colors.text3}
          />

          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {DEFAULT_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconBtn, icon === ic && styles.iconBtnActive]}
                onPress={() => setIcon(ic)}>
                <Text style={{ fontSize: 22 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.freqRow}>
            {FREQ_OPTIONS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.freqBtn, freq === f && styles.freqActive]}
                onPress={() => setFreq(f)}>
                <Text style={[styles.freqText, freq === f && styles.freqActiveText]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !name.trim() && { opacity: 0.4 }]}
            disabled={!name.trim()}
            onPress={() => onSave({ ...initial, name: name.trim(), icon, frequency: freq })}>
            <Text style={styles.saveBtnText}>Save habit</Text>
          </TouchableOpacity>

          {isEdit && onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteBtnText}>Delete habit</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Main screen ────────────────────────────────────────────────
export default function HabitsScreen() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Partial<Habit> | null>(null)

  const { data: habits = [], isLoading, refetch, isFetching } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn:  () => apiClient.get('/habits').then(r => r.data),
  })

  const { data: logs = [] } = useQuery<HabitLog[]>({
    queryKey: ['habitLogs', today],
    queryFn:  () => apiClient.get(`/habits/logs?date=${today}`).then(r => r.data),
  })

  const { data: contribution = [] } = useQuery<ContribDay[]>({
    queryKey: ['habitContrib'],
    queryFn:  () => {
      const from = new Date()
      from.setDate(from.getDate() - WEEKS * 7)
      return apiClient.get(`/habits/contribution?from=${from.toISOString().split('T')[0]}&to=${today}`).then(r => r.data)
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['habits'] })
    qc.invalidateQueries({ queryKey: ['habitLogs', today] })
    qc.invalidateQueries({ queryKey: ['habitContrib'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiClient.post('/habits/log', { habitId: id, date: today, completed }),
    onSuccess: () => invalidate(),
  })

  const saveMutation = useMutation({
    mutationFn: (h: Partial<Habit>) =>
      h.id
        ? apiClient.put(`/habits/${h.id}`, h)
        : apiClient.post('/habits', h),
    onSuccess: () => { invalidate(); setModalVisible(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/habits/${id}`),
    onSuccess:  () => { invalidate(); setModalVisible(false) },
  })

  const openAdd  = ()         => { setEditing(null); setModalVisible(true) }
  const openEdit = (h: Habit) => { setEditing(h);    setModalVisible(true) }

  const activeHabits = habits.filter(h => h.active !== false)
  const completed    = logs.filter(l => l.completed).length
  const pct          = activeHabits.length > 0 ? Math.round((completed / activeHabits.length) * 100) : 0

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>

      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Habits</Text>
          <Text style={styles.pageSubtitle}>{todayFmt()}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.card}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>{completed}/{activeHabits.length} completed</Text>
          <Text style={[styles.progressPct, pct === 100 && { color: colors.green }]}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct === 100 ? colors.green : colors.primary }]} />
        </View>
      </View>

      {/* Habit list */}
      {activeHabits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySub}>Tap + Add to create your first habit</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {activeHabits.map((h, i) => (
            <View key={h.id}>
              <HabitRow
                habit={h}
                todayLog={logs.find(l => l.habitId === h.id)}
                onToggle={() => {
                  const existing = logs.find(l => l.habitId === h.id)
                  const done = existing?.completed ?? false
                  toggleMutation.mutate({ id: h.id, completed: !done })
                }}
                onEdit={() => openEdit(h)}
              />
              {i < activeHabits.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}

      {/* Contribution grid */}
      {contribution.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Last {WEEKS} weeks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
            <ContribGrid data={contribution} />
          </ScrollView>
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less</Text>
            {LEVEL_COLORS.map((c, i) => (
              <View key={i} style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: c }} />
            ))}
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>
      )}

      <View style={{ height: spacing.xxxl }} />

      <HabitModal
        visible={modalVisible}
        initial={editing}
        onSave={h => saveMutation.mutate(h)}
        onDelete={editing?.id ? () => deleteMutation.mutate(editing!.id!) : undefined}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  )
}

function todayFmt() {
  return new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl + 8 },
  center:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  pageTitle:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  addBtn:       { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText:   { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  card:  { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },

  progressTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontSize: fontSize.sm, color: colors.text2 },
  progressPct:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  progressBg:    { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },

  habitRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  checkBox:  { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: fontWeight.bold },
  habitIcon: { fontSize: 18 },
  habitName: { flex: 1, fontSize: fontSize.base, color: colors.text1 },
  habitDone: { textDecorationLine: 'line-through', color: colors.text3 },
  editBtn:   { padding: spacing.xs },
  editDot:   { color: colors.text3, fontSize: 14, letterSpacing: 2 },
  divider:   { height: 1, backgroundColor: colors.border, marginVertical: 2 },

  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8 },
  legendRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  legendText:   { fontSize: 10, color: colors.text3 },

  empty:      { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text1 },
  emptySub:   { fontSize: fontSize.sm, color: colors.text3, marginTop: spacing.xs },

  // Modal
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text1, marginBottom: spacing.xl, textAlign: 'center' },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  input:      { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text1, fontSize: fontSize.base, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  iconGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  iconBtn:    { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  freqRow:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  freqBtn:    { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  freqActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  freqText:   { fontSize: 11, color: colors.text2 },
  freqActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  saveBtnText:{ color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  deleteBtn:  { borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  deleteBtnText: { color: colors.red, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  cancelBtn:  { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.text3, fontSize: fontSize.base },
})
