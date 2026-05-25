import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native'
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
import type { HealthLog } from '@/types/models'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatPill({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value ?? '\u2014'}{unit && value ? <Text style={styles.statUnit}> {unit}</Text> : null}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function LogCard({ log, onDelete, onEdit }: { log: HealthLog; onDelete: () => void; onEdit: () => void }) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{fmt(log.logDate)}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.logStats}>
        {log.weight ? <StatPill label="Weight" value={log.weight} unit="kg" /> : null}
        {log.sleep ? <StatPill label="Sleep" value={log.sleep} unit="h" /> : null}
        {log.steps ? <StatPill label="Steps" value={log.steps.toLocaleString()} /> : null}
        {log.heartRate ? <StatPill label="Heart Rate" value={log.heartRate} unit="bpm" /> : null}
      </View>
      {log.workout ? <Text style={styles.workout}>{'\u{1F3CB}\uFE0F'} {log.workout}</Text> : null}
      {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
    </View>
  )
}

interface LogForm { logDate: string; weight: string; sleep: string; heartRate: string; steps: string; workout: string; notes: string }
const blankForm = (): LogForm => ({ logDate: new Date().toISOString().split('T')[0], weight: '', sleep: '', heartRate: '', steps: '', workout: '', notes: '' })
function toForm(l: HealthLog): LogForm {
  return {
    logDate: l.logDate, weight: l.weight ? String(l.weight) : '', sleep: l.sleep ? String(l.sleep) : '',
    heartRate: l.heartRate ? String(l.heartRate) : '', steps: l.steps ? String(l.steps) : '',
    workout: l.workout ?? '', notes: l.notes ?? '',
  }
}

export default function HealthScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<HealthLog | null>(null)
  const [form, setForm] = useState<LogForm>(blankForm)

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: HealthLog) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<HealthLog[]>({
    queryKey: ['health'],
    queryFn: () => apiClient.get('/health').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: LogForm) => {
      const payload = {
        ...d,
        weight: d.weight ? parseFloat(d.weight) : null,
        sleep: d.sleep ? parseFloat(d.sleep) : null,
        heartRate: d.heartRate ? parseInt(d.heartRate) : null,
        steps: d.steps ? parseInt(d.steps) : null,
      }
      return editing
        ? apiClient.put(`/health/${editing.id}`, payload)
        : apiClient.post('/health', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save log', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/health/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this health log?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof LogForm, v: string) => setForm(f => ({ ...f, [k]: v }))
  const latest = data[0]

  return (
    <ScreenWrapper scroll={false} padHorizontal={false}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Log' : 'Log Health'}
        onClose={() => setModalVisible(false)}
        onSave={() => {
          const nums = [form.weight, form.sleep, form.heartRate, form.steps].filter(v => v)
          if (nums.some(v => isNaN(Number(v)))) {
            showToast('Please enter valid numbers', 'error')
            return
          }
          if (!form.weight && !form.sleep && !form.heartRate && !form.steps && !form.workout.trim()) {
            showToast('Please fill at least one field', 'error')
            return
          }
          saveMutation.mutate(form)
        }}
        saving={saveMutation.isPending}
        disabled={isOffline}
      >
        <FormField label="Date" value={form.logDate} onChangeText={t => set('logDate', t)} />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField label="Weight (kg)" value={form.weight} onChangeText={t => set('weight', t)} keyboardType="numeric" placeholder="0.0" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Sleep (h)" value={form.sleep} onChangeText={t => set('sleep', t)} keyboardType="numeric" placeholder="0.0" />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField label="Heart Rate (bpm)" value={form.heartRate} onChangeText={t => set('heartRate', t)} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Steps" value={form.steps} onChangeText={t => set('steps', t)} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <FormField label="Workout" optional value={form.workout} onChangeText={t => set('workout', t)} placeholder="e.g. 30min run, gym..." maxLength={100} />
        <FormField label="Notes" optional value={form.notes} onChangeText={t => set('notes', t)} placeholder="How do you feel?" multiline numberOfLines={3} maxLength={2000} />
      </ModalForm>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load health logs</Text>}

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.pageTitle}>Health</Text>
                  <Text style={styles.pageSubtitle}>{data.length} log{data.length === 1 ? '' : 's'}</Text>
                </View>
                <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new health log">
                  <Text style={styles.addBtnText}>+ Log</Text>
                </TouchableOpacity>
              </View>
            </View>
            {latest && (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionLabel}>Latest {'\u00B7'} {fmt(latest.logDate)}</Text>
                <View style={styles.summaryRow}>
                  <StatPill label="Weight" value={latest.weight} unit="kg" />
                  <StatPill label="Sleep" value={latest.sleep} unit="h" />
                  <StatPill label="Steps" value={latest.steps ? latest.steps.toLocaleString() : null} />
                  <StatPill label="HR" value={latest.heartRate} unit="bpm" />
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>{'\u{1F4AA}'}</Text>
            <Text style={styles.emptyText}>No logs yet</Text>
            <Text style={styles.emptySub}>Tap + Log to track your first day</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <LogCard log={item} onDelete={() => handleDelete(item.id)} onEdit={() => openEdit(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
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
  summaryCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8 },
  statPill: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', minWidth: 72 },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text1 },
  statUnit: { fontSize: fontSize.xs, color: colors.text3, fontWeight: fontWeight.normal },
  statLabel: { fontSize: fontSize.xxs, color: colors.text3, marginTop: 2 },
  logCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text2 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  logStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  workout: { fontSize: fontSize.sm, color: colors.green },
  logNotes: { fontSize: fontSize.sm, color: colors.text3, fontStyle: 'italic' },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  row2: { flexDirection: 'row', gap: spacing.sm },
})
