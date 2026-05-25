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
import type { Reflection } from '@/types/models'

const MOOD_EMOJI = ['', '\u{1F61E}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '\u{1F604}']
const MOOD_COLOR = ['', colors.rose, colors.amber, colors.text3, colors.green, colors.green]
function moodEmoji(m: number) { return MOOD_EMOJI[m] ?? '?' }
function moodColor(m: number) { return MOOD_COLOR[m] ?? colors.text3 }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function ReflectionCard({ ref_: r, onDelete, onEdit }: { ref_: Reflection; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{fmt(r.refDate)}</Text>
          <Text style={{ fontSize: 22, color: moodColor(r.mood) }}>{moodEmoji(r.mood)}</Text>
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
      {r.wentWell ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'\u2705'} Went well</Text>
          <Text style={styles.sectionText} numberOfLines={expanded ? undefined : 2}>{r.wentWell}</Text>
        </View>
      ) : null}
      {expanded && r.improve ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'\u{1F527}'} Improve</Text>
          <Text style={styles.sectionText}>{r.improve}</Text>
        </View>
      ) : null}
      {expanded && r.gratitude ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'\u{1F64F}'} Gratitude</Text>
          <Text style={styles.sectionText}>{r.gratitude}</Text>
        </View>
      ) : null}
      {expanded && r.tomorrow ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{'\u{1F305}'} Tomorrow</Text>
          <Text style={styles.sectionText}>{r.tomorrow}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface RefForm { refDate: string; mood: number; wentWell: string; improve: string; gratitude: string; tomorrow: string }
const blankForm = (): RefForm => ({ refDate: new Date().toISOString().split('T')[0], mood: 3, wentWell: '', improve: '', gratitude: '', tomorrow: '' })
function toForm(r: Reflection): RefForm {
  return { refDate: r.refDate, mood: r.mood, wentWell: r.wentWell ?? '', improve: r.improve ?? '', gratitude: r.gratitude ?? '', tomorrow: r.tomorrow ?? '' }
}

export default function ReflectionsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Reflection | null>(null)
  const [form, setForm] = useState<RefForm>(blankForm)

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Reflection) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Reflection[]>({
    queryKey: ['reflections'],
    queryFn: () => apiClient.get('/reflections').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: RefForm) => editing
      ? apiClient.put(`/reflections/${editing.id}`, d)
      : apiClient.post('/reflections', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reflections'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save reflection', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reflections/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reflections'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this reflection?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof RefForm, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Reflection' : 'New Reflection'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline}
      >
        <Text style={styles.fieldLabel}>Mood</Text>
        <View style={styles.moodRow}>
          {[1, 2, 3, 4, 5].map(m => (
            <TouchableOpacity key={m} style={[styles.moodBtn, form.mood === m && { borderColor: moodColor(m) }]} onPress={() => set('mood', m)}>
              <Text style={{ fontSize: 22 }}>{moodEmoji(m)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="What went well?" optional value={form.wentWell} onChangeText={t => set('wentWell', t)} multiline numberOfLines={3} />
        <FormField label="What to improve?" optional value={form.improve} onChangeText={t => set('improve', t)} multiline numberOfLines={3} />
        <FormField label="Gratitude" optional value={form.gratitude} onChangeText={t => set('gratitude', t)} multiline numberOfLines={3} />
        <FormField label="Tomorrow's focus" optional value={form.tomorrow} onChangeText={t => set('tomorrow', t)} multiline numberOfLines={3} />
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Reflections</Text>
            <Text style={styles.pageSubtitle}>{data.length} entr{data.length === 1 ? 'y' : 'ies'}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load reflections</Text>}
      {data.map(r => (
        <ReflectionCard key={r.id} ref_={r} onDelete={() => handleDelete(r.id)} onEdit={() => openEdit(r)} />
      ))}
      {!isLoading && data.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>{'\u{1FA9E}'}</Text>
          <Text style={styles.emptyText}>No reflections yet</Text>
          <Text style={styles.emptySub}>Tap + New to start reviewing your days</Text>
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
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDate: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text2, marginBottom: 4 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  sectionLabel: { fontSize: fontSize.xs, color: colors.text3, fontWeight: fontWeight.semibold },
  sectionText: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  moodRow: { flexDirection: 'row', gap: spacing.sm },
  moodBtn: { flex: 1, aspectRatio: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
})
