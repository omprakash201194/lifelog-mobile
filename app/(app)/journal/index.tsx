import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
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
import type { JournalEntry } from '@/types/models'

const MOOD_EMOJI = ['', '\u{1F61E}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '\u{1F604}']
const MOOD_COLOR = ['', colors.rose, colors.amber, colors.text3, colors.green, colors.green]

function moodEmoji(m: number) { return MOOD_EMOJI[m] ?? '?' }
function moodColor(m: number) { return MOOD_COLOR[m] ?? colors.text3 }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EntryCard({ entry, onDelete, onEdit }: { entry: JournalEntry; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.entryCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          <Text style={[styles.periodBadge, entry.period === 'morning' ? styles.morning : styles.evening]}>
            {entry.period === 'morning' ? '\u{1F305} Morning' : '\u{1F319} Evening'}
          </Text>
          <Text style={styles.entryDate}>{formatDate(entry.entryDate)}</Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={{ fontSize: 20, color: moodColor(entry.mood) }}>{moodEmoji(entry.mood)}</Text>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entryContent} numberOfLines={expanded ? undefined : 3}>{entry.content}</Text>
      {expanded && entry.gratitude ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>{'\u{1F64F}'} Gratitude</Text>
          <Text style={styles.subText}>{entry.gratitude}</Text>
        </View>
      ) : null}
      {expanded && entry.highlights ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>{'\u2728'} Highlights</Text>
          <Text style={styles.subText}>{entry.highlights}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface EntryForm {
  entryDate: string; period: 'morning' | 'evening'; mood: number
  content: string; gratitude: string; highlights: string
}
function blankForm(): EntryForm {
  const today = new Date().toISOString().split('T')[0]
  return { entryDate: today, period: new Date().getHours() < 14 ? 'morning' : 'evening', mood: 3, content: '', gratitude: '', highlights: '' }
}
function toForm(e: JournalEntry): EntryForm {
  return { entryDate: e.entryDate, period: e.period, mood: e.mood, content: e.content, gratitude: e.gratitude ?? '', highlights: e.highlights ?? '' }
}

export default function JournalScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<JournalEntry | null>(null)
  const [form, setForm] = useState<EntryForm>(blankForm)

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: JournalEntry) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<JournalEntry[]>({
    queryKey: ['journal'],
    queryFn: () => apiClient.get('/journal').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: EntryForm) => editing
      ? apiClient.put(`/journal/${editing.id}`, data)
      : apiClient.post('/journal', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save entry', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/journal/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this journal entry?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof EntryForm, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Entry' : 'New Entry'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.content.trim()}
      >
        <Text style={styles.fieldLabel}>Period</Text>
        <View style={styles.toggle}>
          {(['morning', 'evening'] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.toggleBtn, form.period === p && styles.toggleActive]} onPress={() => set('period', p)}>
              <Text style={[styles.toggleText, form.period === p && styles.toggleActiveText]}>{p === 'morning' ? '\u{1F305} Morning' : '\u{1F319} Evening'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Mood</Text>
        <View style={styles.moodRow}>
          {[1, 2, 3, 4, 5].map(m => (
            <TouchableOpacity key={m} style={[styles.moodBtn, form.mood === m && { borderColor: moodColor(m), backgroundColor: colors.bgDeep }]} onPress={() => set('mood', m)}>
              <Text style={{ fontSize: 22 }}>{moodEmoji(m)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Entry *" value={form.content} onChangeText={t => set('content', t)} placeholder="Write your thoughts..." multiline numberOfLines={6} style={{ height: 140 }} />
        <FormField label="Gratitude" optional value={form.gratitude} onChangeText={t => set('gratitude', t)} placeholder="What are you grateful for?" multiline numberOfLines={3} />
        <FormField label="Highlights" optional value={form.highlights} onChangeText={t => set('highlights', t)} placeholder="Best moments of the day..." multiline numberOfLines={3} />
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Journal</Text>
            <Text style={styles.pageSubtitle}>{data.length} entr{data.length === 1 ? 'y' : 'ies'}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load journal entries</Text>}
      {data.map(entry => (
        <EntryCard key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} onEdit={() => openEdit(entry)} />
      ))}
      {!isLoading && data.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>{'\u{1F4D3}'}</Text>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySub}>Tap + New to write your first entry</Text>
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
  entryCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMeta: { gap: 4 },
  entryDate: { fontSize: fontSize.xs, color: colors.text3 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  periodBadge: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, overflow: 'hidden' },
  morning: { backgroundColor: '#1a1500', color: colors.amber },
  evening: { backgroundColor: '#0a0a20', color: '#8080ff' },
  entryContent: { fontSize: fontSize.base, color: colors.text2, lineHeight: 20 },
  subSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  subLabel: { fontSize: fontSize.xs, color: colors.text3, fontWeight: fontWeight.semibold },
  subText: { fontSize: fontSize.sm, color: colors.text2 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  toggle: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.sm, color: colors.text2 },
  toggleActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  moodRow: { flexDirection: 'row', gap: spacing.sm },
  moodBtn: { flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
})
