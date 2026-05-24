import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Goal } from '@/types/models'

const STATUS_COLOR: Record<string, string> = {
  in_progress: colors.blue,
  completed:   colors.green,
  paused:      colors.amber,
  cancelled:   colors.text3,
}
const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  completed:   'Completed',
  paused:      'Paused',
  cancelled:   'Cancelled',
}

function GoalCard({ goal, onToggleMilestone, onDelete }: {
  goal: Goal
  onToggleMilestone: (goalId: string, milestoneId: string, done: boolean) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const done  = goal.milestones.filter(m => m.done).length
  const total = goal.milestones.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const color = STATUS_COLOR[goal.status] ?? colors.text3

  return (
    <TouchableOpacity style={styles.goalCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.goalHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.goalTags}>
            <Text style={[styles.statusBadge, { borderColor: color, color }]}>{STATUS_LABEL[goal.status] ?? goal.status}</Text>
            <Text style={styles.categoryTag}>{goal.category}</Text>
            <Text style={styles.categoryTag}>{goal.timeframe}</Text>
          </View>
          <Text style={styles.goalTitle}>{goal.title}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      {total > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={styles.progressLabel}>{done}/{total} milestones</Text>
        </View>
      )}
      {expanded && goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
      {expanded && goal.milestones.length > 0 && (
        <View style={styles.milestoneList}>
          {goal.milestones.sort((a, b) => a.sortOrder - b.sortOrder).map(m => (
            <TouchableOpacity key={m.id} style={styles.milestoneRow} onPress={() => onToggleMilestone(goal.id, m.id, !m.done)}>
              <View style={[styles.mCheck, m.done && { backgroundColor: colors.green, borderColor: colors.green }]}>
                {m.done && <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={[styles.mLabel, m.done && styles.mDone]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

interface NewGoal { title: string; description: string; category: string; timeframe: string; status: string }
const blankGoal = (): NewGoal => ({ title: '', description: '', category: 'personal', timeframe: 'yearly', status: 'in_progress' })

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (g: NewGoal) => void }) {
  const [form, setForm] = useState<NewGoal>(blankGoal)
  const set = (k: keyof NewGoal, v: string) => setForm(f => ({ ...f, [k]: v }))
  const CATEGORIES = ['personal', 'career', 'health', 'finance', 'learning', 'relationships', 'travel']
  const TIMEFRAMES  = ['weekly', 'monthly', 'quarterly', 'yearly', '5-year', 'lifetime']

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>New Goal</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankGoal()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => set('title', t)} placeholder="What do you want to achieve?" placeholderTextColor={colors.text3} />
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.description} onChangeText={t => set('description', t)} placeholder="Why does this matter?" placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => set('category', c)}>
              <Text style={[styles.chipText, form.category === c && styles.chipActiveText]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Timeframe</Text>
        <View style={styles.chipRow}>
          {TIMEFRAMES.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, form.timeframe === t && styles.chipActive]} onPress={() => set('timeframe', t)}>
              <Text style={[styles.chipText, form.timeframe === t && styles.chipActiveText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function GoalsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn:  () => apiClient.get('/goals').then(r => r.data),
  })
  const createGoal = useMutation({
    mutationFn: (g: NewGoal) => apiClient.post('/goals', g),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['goals'] }); setModal(false) },
  })
  const deleteGoal = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
  const toggleMilestone = useMutation({
    mutationFn: ({ goalId, milestoneId, done }: { goalId: string; milestoneId: string; done: boolean }) =>
      apiClient.patch(`/goals/${goalId}/milestones/${milestoneId}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  const active    = data.filter(g => g.status === 'in_progress')
  const completed = data.filter(g => g.status === 'completed')
  const other     = data.filter(g => g.status !== 'in_progress' && g.status !== 'completed')

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={g => createGoal.mutate(g)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Goals</Text>
              <Text style={styles.pageSubtitle}>{active.length} active · {completed.length} done</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load goals</Text>}
        {active.length > 0 && <Text style={styles.sectionLabel}>🔵 In Progress</Text>}
        {active.map(g => (
          <GoalCard key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)}
            onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
        ))}
        {completed.length > 0 && <Text style={styles.sectionLabel}>✅ Completed</Text>}
        {completed.map(g => (
          <GoalCard key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)}
            onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
        ))}
        {other.length > 0 && <Text style={styles.sectionLabel}>⏸ Other</Text>}
        {other.map(g => (
          <GoalCard key={g.id} goal={g} onDelete={() => deleteGoal.mutate(g.id)}
            onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🎯</Text>
            <Text style={styles.emptyText}>No goals yet</Text>
            <Text style={styles.emptySub}>Tap + New to set your first goal</Text>
          </View>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl + 8 },
  pageHeader: { marginBottom: spacing.xl },
  backText: { fontSize: fontSize.base, color: colors.primary, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pageTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  addBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  goalCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  goalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  statusBadge: { fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  categoryTag: { fontSize: fontSize.xxs, color: colors.text3, backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  goalTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  goalDesc: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: fontSize.xs, color: colors.text3, minWidth: 80 },
  milestoneList: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mCheck: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  mLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text2 },
  mDone: { textDecorationLine: 'line-through', color: colors.text3 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text1 },
  modalCancel: { fontSize: fontSize.base, color: colors.text3 },
  modalSave: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text1, fontSize: fontSize.base },
  textAreaSm: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
