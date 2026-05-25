import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import ScreenWrapper from '@/components/ScreenWrapper'
import ModalForm from '@/components/ModalForm'
import FormField from '@/components/FormField'
import { useToast } from '@/contexts/ToastContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { confirmAction } from '@/components/ConfirmDialog'
import type { Goal } from '@/types/models'

const STATUS_COLOR: Record<string, string> = {
  in_progress: colors.blue, completed: colors.green, paused: colors.amber, cancelled: colors.text3,
}
const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress', completed: 'Completed', paused: 'Paused', cancelled: 'Cancelled',
}

function GoalCard({ goal, onToggleMilestone, onDelete, onEdit }: {
  goal: Goal; onToggleMilestone: (goalId: string, milestoneId: string, done: boolean) => void; onDelete: () => void; onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const done = goal.milestones.filter(m => m.done).length
  const total = goal.milestones.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
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
                {m.done && <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>{'\u2713'}</Text>}
              </View>
              <Text style={[styles.mLabel, m.done && styles.mDone]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

interface GoalForm { title: string; description: string; category: string; timeframe: string; status: string }
const blankForm = (): GoalForm => ({ title: '', description: '', category: 'personal', timeframe: 'yearly', status: 'in_progress' })
function toForm(g: Goal): GoalForm {
  return { title: g.title, description: g.description ?? '', category: g.category, timeframe: g.timeframe, status: g.status }
}

const CATEGORIES = ['personal', 'career', 'health', 'finance', 'learning', 'relationships', 'travel']
const TIMEFRAMES = ['weekly', 'monthly', 'quarterly', 'yearly', '5-year', 'lifetime']

export default function GoalsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalForm>(blankForm)

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Goal) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => apiClient.get('/goals').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: GoalForm) => editing
      ? apiClient.put(`/goals/${editing.id}`, data)
      : apiClient.post('/goals', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save goal', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const toggleMilestone = useMutation({
    mutationFn: ({ goalId, milestoneId, done }: { goalId: string; milestoneId: string; done: boolean }) =>
      apiClient.patch(`/goals/${goalId}/milestones/${milestoneId}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => showToast('Failed to update milestone', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this goal?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof GoalForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const active = data.filter(g => g.status === 'in_progress')
  const completed = data.filter(g => g.status === 'completed')
  const other = data.filter(g => g.status !== 'in_progress' && g.status !== 'completed')

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Goal' : 'New Goal'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.title.trim()}
      >
        <FormField label="Title *" value={form.title} onChangeText={t => set('title', t)} placeholder="What do you want to achieve?" />
        <FormField label="Description" optional value={form.description} onChangeText={t => set('description', t)} placeholder="Why does this matter?" multiline numberOfLines={3} />
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
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Goals</Text>
            <Text style={styles.pageSubtitle}>{active.length} active {'\u00B7'} {completed.length} done</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load goals</Text>}
      {active.length > 0 && <Text style={styles.sectionLabel}>{'\u{1F535}'} In Progress</Text>}
      {active.map(g => (
        <GoalCard key={g.id} goal={g} onDelete={() => handleDelete(g.id)} onEdit={() => openEdit(g)}
          onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
      ))}
      {completed.length > 0 && <Text style={styles.sectionLabel}>{'\u2705'} Completed</Text>}
      {completed.map(g => (
        <GoalCard key={g.id} goal={g} onDelete={() => handleDelete(g.id)} onEdit={() => openEdit(g)}
          onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
      ))}
      {other.length > 0 && <Text style={styles.sectionLabel}>{'\u23F8'} Other</Text>}
      {other.map(g => (
        <GoalCard key={g.id} goal={g} onDelete={() => handleDelete(g.id)} onEdit={() => openEdit(g)}
          onToggleMilestone={(gid, mid, done) => toggleMilestone.mutate({ goalId: gid, milestoneId: mid, done })} />
      ))}
      {!isLoading && data.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>{'\u{1F3AF}'}</Text>
          <Text style={styles.emptyText}>No goals yet</Text>
          <Text style={styles.emptySub}>Tap + New to set your first goal</Text>
        </View>
      )}
      <View style={{ height: spacing.xxxl }} />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  pageHeader: { marginBottom: spacing.xl },
  backText: { fontSize: fontSize.base, color: colors.primary, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pageTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  addBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  btnDisabled: { opacity: 0.4 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  goalCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  goalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  statusBadge: { fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  categoryTag: { fontSize: fontSize.xxs, color: colors.text3, backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  goalTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
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
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
