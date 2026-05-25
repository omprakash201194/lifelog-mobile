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
import type { Experience } from '@/types/models'

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '\u2605' : '\u2606').join('')}</Text>
}

function ExperienceCard({ exp, onDelete, onEdit }: { exp: Experience; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.tags}>
            <Text style={styles.catTag}>{exp.category}</Text>
            {exp.subCategory ? <Text style={styles.catTag}>{exp.subCategory}</Text> : null}
          </View>
          <Text style={styles.expTitle}>{exp.title}</Text>
          <View style={styles.expMeta}>
            <Text style={styles.expDate}>{exp.expDate?.slice(0, 10)}</Text>
            {exp.location ? <Text style={styles.expLocation}>{'\u{1F4CD}'} {exp.location}</Text> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <StarRating rating={exp.rating} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.editIcon}>{'\u270E'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.deleteIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {expanded && exp.note ? (
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>{exp.note}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface ExpForm { title: string; category: string; subCategory: string; expDate: string; rating: number; location: string; note: string }
const blankForm = (): ExpForm => ({ title: '', category: 'adventure', subCategory: '', expDate: new Date().toISOString().split('T')[0], rating: 4, location: '', note: '' })
function toForm(e: Experience): ExpForm {
  return { title: e.title, category: e.category, subCategory: e.subCategory ?? '', expDate: e.expDate, rating: e.rating, location: e.location ?? '', note: e.note ?? '' }
}

const CATEGORIES = ['adventure', 'food', 'culture', 'music', 'sport', 'nature', 'social', 'creative', 'learning', 'travel']

export default function ExperiencesScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Experience | null>(null)
  const [form, setForm] = useState<ExpForm>(blankForm)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Experience) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn: () => apiClient.get('/experiences').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: ExpForm) => {
      const payload = { ...d, subCategory: d.subCategory || null }
      return editing
        ? apiClient.put(`/experiences/${editing.id}`, payload)
        : apiClient.post('/experiences', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save experience', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/experiences/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['experiences'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this experience?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof ExpForm, v: any) => setForm(f => ({ ...f, [k]: v }))
  const categories = ['all', ...Array.from(new Set(data.map(e => e.category)))]
  const shown = filter === 'all' ? data : data.filter(e => e.category === filter)

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Experience' : 'Add Experience'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.title.trim()}
      >
        <FormField label="Title *" value={form.title} onChangeText={t => set('title', t)} placeholder="What did you do?" />
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => set('category', c)}>
              <Text style={[styles.chipText, form.category === c && styles.chipActiveText]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Sub-category" optional value={form.subCategory} onChangeText={t => set('subCategory', t)} placeholder="e.g. skydiving" />
        <FormField label="Date" value={form.expDate} onChangeText={t => set('expDate', t)} />
        <Text style={styles.fieldLabel}>Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => set('rating', n)}>
              <Text style={{ fontSize: 28, color: n <= form.rating ? colors.amber : colors.border }}>{n <= form.rating ? '\u2605' : '\u2606'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Location" optional value={form.location} onChangeText={t => set('location', t)} placeholder="City, Country" />
        <FormField label="Notes" optional value={form.note} onChangeText={t => set('note', t)} multiline numberOfLines={4} />
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Experiences</Text>
            <Text style={styles.pageSubtitle}>{data.length} experience{data.length === 1 ? '' : 's'}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        <View style={styles.filterRow}>
          {categories.map(c => (
            <TouchableOpacity key={c} style={[styles.filterChip, filter === c && styles.filterChipActive]} onPress={() => setFilter(c)}>
              <Text style={[styles.filterText, filter === c && styles.filterTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load experiences</Text>}
      {shown.map(exp => (
        <ExperienceCard key={exp.id} exp={exp} onDelete={() => handleDelete(exp.id)} onEdit={() => openEdit(exp)} />
      ))}
      {!isLoading && data.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>{'\u{1F31F}'}</Text>
          <Text style={styles.emptyText}>No experiences yet</Text>
          <Text style={styles.emptySub}>Log the things that make life worth living</Text>
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
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 2 },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs, color: colors.text3, textTransform: 'capitalize' },
  filterTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  catTag: { fontSize: fontSize.xxs, color: colors.text3, backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, textTransform: 'capitalize' },
  expTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  expMeta: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  expDate: { fontSize: fontSize.xs, color: colors.text3 },
  expLocation: { fontSize: fontSize.xs, color: colors.text3 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  noteSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  noteText: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2, textTransform: 'capitalize' },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
})
