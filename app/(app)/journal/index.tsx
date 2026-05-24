import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { JournalEntry } from '@/types/models'

const MOOD_EMOJI = ['', '😞', '😕', '😐', '😊', '😄']
const MOOD_COLOR = ['', colors.rose, colors.amber, colors.text3, colors.green, colors.green]

function moodEmoji(m: number) { return MOOD_EMOJI[m] ?? '?' }
function moodColor(m: number) { return MOOD_COLOR[m] ?? colors.text3 }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EntryCard({ entry, onDelete }: { entry: JournalEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.entryCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          <Text style={[styles.periodBadge, entry.period === 'morning' ? styles.morning : styles.evening]}>
            {entry.period === 'morning' ? '🌅 Morning' : '🌙 Evening'}
          </Text>
          <Text style={styles.entryDate}>{formatDate(entry.entryDate)}</Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={{ fontSize: 20, color: moodColor(entry.mood) }}>{moodEmoji(entry.mood)}</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entryContent} numberOfLines={expanded ? undefined : 3}>{entry.content}</Text>
      {expanded && entry.gratitude ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>🙏 Gratitude</Text>
          <Text style={styles.subText}>{entry.gratitude}</Text>
        </View>
      ) : null}
      {expanded && entry.highlights ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>✨ Highlights</Text>
          <Text style={styles.subText}>{entry.highlights}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface NewEntry {
  entryDate: string; period: 'morning' | 'evening'; mood: number
  content: string; gratitude: string; highlights: string
}
function blank(): NewEntry {
  const today = new Date().toISOString().split('T')[0]
  return { entryDate: today, period: new Date().getHours() < 14 ? 'morning' : 'evening', mood: 3, content: '', gratitude: '', highlights: '' }
}

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (e: NewEntry) => void }) {
  const [form, setForm] = useState<NewEntry>(blank)
  const set = (k: keyof NewEntry, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>New Entry</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blank()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Period</Text>
        <View style={styles.toggle}>
          {(['morning', 'evening'] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.toggleBtn, form.period === p && styles.toggleActive]} onPress={() => set('period', p)}>
              <Text style={[styles.toggleText, form.period === p && styles.toggleActiveText]}>{p === 'morning' ? '🌅 Morning' : '🌙 Evening'}</Text>
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
        <Text style={styles.fieldLabel}>Entry *</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.content} onChangeText={t => set('content', t)} placeholder="Write your thoughts…" placeholderTextColor={colors.text3} multiline numberOfLines={6} />
        <Text style={styles.fieldLabel}>Gratitude</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.gratitude} onChangeText={t => set('gratitude', t)} placeholder="What are you grateful for?" placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>Highlights</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.highlights} onChangeText={t => set('highlights', t)} placeholder="Best moments of the day…" placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function JournalScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<JournalEntry[]>({
    queryKey: ['journal'],
    queryFn:  () => apiClient.get('/journal').then(r => r.data),
  })
  const createEntry = useMutation({
    mutationFn: (e: NewEntry) => apiClient.post('/journal', e),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['journal'] }); setModal(false) },
  })
  const deleteEntry = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/journal/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={e => createEntry.mutate(e)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Journal</Text>
              <Text style={styles.pageSubtitle}>{data.length} entr{data.length === 1 ? 'y' : 'ies'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load journal entries</Text>}
        {data.map(entry => (
          <EntryCard key={entry.id} entry={entry} onDelete={() => deleteEntry.mutate(entry.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📓</Text>
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptySub}>Tap + New to write your first entry</Text>
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
  entryCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMeta: { gap: 4 },
  entryDate: { fontSize: fontSize.xs, color: colors.text3 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  modal: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text1 },
  modalCancel: { fontSize: fontSize.base, color: colors.text3 },
  modalSave: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text1, fontSize: fontSize.base },
  textArea: { height: 140, textAlignVertical: 'top' },
  textAreaSm: { height: 80, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.sm, color: colors.text2 },
  toggleActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  moodRow: { flexDirection: 'row', gap: spacing.sm },
  moodBtn: { flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
})
