import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { HealthLog } from '@/types/models'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatPill({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value ?? '—'}{unit && value ? <Text style={styles.statUnit}> {unit}</Text> : null}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function LogCard({ log, onDelete }: { log: HealthLog; onDelete: () => void }) {
  return (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{fmt(log.logDate)}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.logStats}>
        {log.weight    ? <StatPill label="Weight"     value={log.weight}    unit="kg" /> : null}
        {log.sleep     ? <StatPill label="Sleep"      value={log.sleep}     unit="h"  /> : null}
        {log.steps     ? <StatPill label="Steps"      value={log.steps.toLocaleString()} /> : null}
        {log.heartRate ? <StatPill label="Heart Rate" value={log.heartRate} unit="bpm"/> : null}
      </View>
      {log.workout ? <Text style={styles.workout}>🏋️ {log.workout}</Text> : null}
      {log.notes   ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
    </View>
  )
}

interface NewLog { logDate: string; weight: string; sleep: string; heartRate: string; steps: string; workout: string; notes: string }
const blankLog = (): NewLog => ({ logDate: new Date().toISOString().split('T')[0], weight: '', sleep: '', heartRate: '', steps: '', workout: '', notes: '' })

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (l: NewLog) => void }) {
  const [form, setForm] = useState<NewLog>(blankLog)
  const set = (k: keyof NewLog, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Log Health</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankLog()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput style={styles.input} value={form.logDate} onChangeText={t => set('logDate', t)} placeholderTextColor={colors.text3} />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput style={styles.input} value={form.weight} onChangeText={t => set('weight', t)} keyboardType="decimal-pad" placeholderTextColor={colors.text3} placeholder="0.0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Sleep (h)</Text>
            <TextInput style={styles.input} value={form.sleep} onChangeText={t => set('sleep', t)} keyboardType="decimal-pad" placeholderTextColor={colors.text3} placeholder="0.0" />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Heart Rate (bpm)</Text>
            <TextInput style={styles.input} value={form.heartRate} onChangeText={t => set('heartRate', t)} keyboardType="number-pad" placeholderTextColor={colors.text3} placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Steps</Text>
            <TextInput style={styles.input} value={form.steps} onChangeText={t => set('steps', t)} keyboardType="number-pad" placeholderTextColor={colors.text3} placeholder="0" />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Workout</Text>
        <TextInput style={styles.input} value={form.workout} onChangeText={t => set('workout', t)} placeholderTextColor={colors.text3} placeholder="e.g. 30min run, gym…" />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.notes} onChangeText={t => set('notes', t)} placeholderTextColor={colors.text3} placeholder="How do you feel?" multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function HealthScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<HealthLog[]>({
    queryKey: ['health'],
    queryFn:  () => apiClient.get('/health').then(r => r.data),
  })
  const createLog = useMutation({
    mutationFn: (l: NewLog) => apiClient.post('/health', {
      ...l,
      weight:    l.weight    ? parseFloat(l.weight)    : null,
      sleep:     l.sleep     ? parseFloat(l.sleep)     : null,
      heartRate: l.heartRate ? parseInt(l.heartRate)   : null,
      steps:     l.steps     ? parseInt(l.steps)       : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health'] }); setModal(false) },
  })
  const deleteLog = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/health/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['health'] }),
  })

  const latest = data[0]

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={l => createLog.mutate(l)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Health</Text>
              <Text style={styles.pageSubtitle}>{data.length} log{data.length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        {latest && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionLabel}>Latest · {fmt(latest.logDate)}</Text>
            <View style={styles.summaryRow}>
              <StatPill label="Weight"  value={latest.weight}    unit="kg"  />
              <StatPill label="Sleep"   value={latest.sleep}     unit="h"   />
              <StatPill label="Steps"   value={latest.steps ? latest.steps.toLocaleString() : null} />
              <StatPill label="HR"      value={latest.heartRate} unit="bpm" />
            </View>
          </View>
        )}

        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load health logs</Text>}

        {data.map(log => (
          <LogCard key={log.id} log={log} onDelete={() => deleteLog.mutate(log.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>💪</Text>
            <Text style={styles.emptyText}>No logs yet</Text>
            <Text style={styles.emptySub}>Tap + Log to track your first day</Text>
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
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  logStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  workout: { fontSize: fontSize.sm, color: colors.green },
  logNotes: { fontSize: fontSize.sm, color: colors.text3, fontStyle: 'italic' },
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
  row2: { flexDirection: 'row', gap: spacing.sm },
})
