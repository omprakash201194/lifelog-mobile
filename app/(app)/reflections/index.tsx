import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Reflection } from '@/types/models'

const MOOD_EMOJI = ['', '😞', '😕', '😐', '😊', '😄']
const MOOD_COLOR = ['', colors.rose, colors.amber, colors.text3, colors.green, colors.green]
function moodEmoji(m: number) { return MOOD_EMOJI[m] ?? '?' }
function moodColor(m: number) { return MOOD_COLOR[m] ?? colors.text3 }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function ReflectionCard({ ref_: r, onDelete }: { ref_: Reflection; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{fmt(r.refDate)}</Text>
          <Text style={{ fontSize: 22, color: moodColor(r.mood) }}>{moodEmoji(r.mood)}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      {r.wentWell ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>✅ Went well</Text>
          <Text style={styles.sectionText} numberOfLines={expanded ? undefined : 2}>{r.wentWell}</Text>
        </View>
      ) : null}
      {expanded && r.improve ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔧 Improve</Text>
          <Text style={styles.sectionText}>{r.improve}</Text>
        </View>
      ) : null}
      {expanded && r.gratitude ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🙏 Gratitude</Text>
          <Text style={styles.sectionText}>{r.gratitude}</Text>
        </View>
      ) : null}
      {expanded && r.tomorrow ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🌅 Tomorrow</Text>
          <Text style={styles.sectionText}>{r.tomorrow}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface NewRef { refDate: string; mood: number; wentWell: string; improve: string; gratitude: string; tomorrow: string }
const blankRef = (): NewRef => ({ refDate: new Date().toISOString().split('T')[0], mood: 3, wentWell: '', improve: '', gratitude: '', tomorrow: '' })

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (r: NewRef) => void }) {
  const [form, setForm] = useState<NewRef>(blankRef)
  const set = (k: keyof NewRef, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>New Reflection</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankRef()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Mood</Text>
        <View style={styles.moodRow}>
          {[1, 2, 3, 4, 5].map(m => (
            <TouchableOpacity key={m} style={[styles.moodBtn, form.mood === m && { borderColor: moodColor(m) }]} onPress={() => set('mood', m)}>
              <Text style={{ fontSize: 22 }}>{moodEmoji(m)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>What went well?</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.wentWell} onChangeText={t => set('wentWell', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>What to improve?</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.improve} onChangeText={t => set('improve', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>Gratitude</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.gratitude} onChangeText={t => set('gratitude', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>Tomorrow's focus</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.tomorrow} onChangeText={t => set('tomorrow', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function ReflectionsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Reflection[]>({
    queryKey: ['reflections'],
    queryFn:  () => apiClient.get('/reflections').then(r => r.data),
  })
  const createRef = useMutation({
    mutationFn: (r: NewRef) => apiClient.post('/reflections', r),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['reflections'] }); setModal(false) },
  })
  const deleteRef = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reflections/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['reflections'] }),
  })

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={r => createRef.mutate(r)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Reflections</Text>
              <Text style={styles.pageSubtitle}>{data.length} entr{data.length === 1 ? 'y' : 'ies'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load reflections</Text>}
        {data.map(r => (
          <ReflectionCard key={r.id} ref_={r} onDelete={() => deleteRef.mutate(r.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🪞</Text>
            <Text style={styles.emptyText}>No reflections yet</Text>
            <Text style={styles.emptySub}>Tap + New to start reviewing your days</Text>
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
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDate: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text2, marginBottom: 4 },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  sectionLabel: { fontSize: fontSize.xs, color: colors.text3, fontWeight: fontWeight.semibold },
  sectionText: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
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
  moodRow: { flexDirection: 'row', gap: spacing.sm },
  moodBtn: { flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
})
