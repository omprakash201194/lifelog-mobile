import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Experience } from '@/types/models'

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}</Text>
}

function ExperienceCard({ exp, onDelete }: { exp: Experience; onDelete: () => void }) {
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
            {exp.location ? <Text style={styles.expLocation}>📍 {exp.location}</Text> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <StarRating rating={exp.rating} />
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
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

interface NewExp { title: string; category: string; subCategory: string; expDate: string; rating: number; location: string; note: string }
const blankExp = (): NewExp => ({ title: '', category: 'adventure', subCategory: '', expDate: new Date().toISOString().split('T')[0], rating: 4, location: '', note: '' })

const CATEGORIES = ['adventure', 'food', 'culture', 'music', 'sport', 'nature', 'social', 'creative', 'learning', 'travel']

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (e: NewExp) => void }) {
  const [form, setForm] = useState<NewExp>(blankExp)
  const set = (k: keyof NewExp, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Add Experience</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankExp()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => set('title', t)} placeholderTextColor={colors.text3} placeholder="What did you do?" />
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]} onPress={() => set('category', c)}>
              <Text style={[styles.chipText, form.category === c && styles.chipActiveText]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Sub-category</Text>
        <TextInput style={styles.input} value={form.subCategory} onChangeText={t => set('subCategory', t)} placeholderTextColor={colors.text3} placeholder="e.g. skydiving" />
        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput style={styles.input} value={form.expDate} onChangeText={t => set('expDate', t)} placeholderTextColor={colors.text3} />
        <Text style={styles.fieldLabel}>Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => set('rating', n)}>
              <Text style={{ fontSize: 28, color: n <= form.rating ? colors.amber : colors.border }}>{n <= form.rating ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput style={styles.input} value={form.location} onChangeText={t => set('location', t)} placeholderTextColor={colors.text3} placeholder="City, Country" />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.note} onChangeText={t => set('note', t)} placeholderTextColor={colors.text3} multiline numberOfLines={4} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function ExperiencesScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal]   = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn:  () => apiClient.get('/experiences').then(r => r.data),
  })
  const createExp = useMutation({
    mutationFn: (e: NewExp) => apiClient.post('/experiences', { ...e, subCategory: e.subCategory || null }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['experiences'] }); setModal(false) },
  })
  const deleteExp = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/experiences/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['experiences'] }),
  })

  const categories = ['all', ...Array.from(new Set(data.map(e => e.category)))]
  const shown = filter === 'all' ? data : data.filter(e => e.category === filter)

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={e => createExp.mutate(e)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Experiences</Text>
              <Text style={styles.pageSubtitle}>{data.length} experience{data.length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category filter pills */}
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
          <ExperienceCard key={exp.id} exp={exp} onDelete={() => deleteExp.mutate(exp.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🌟</Text>
            <Text style={styles.emptyText}>No experiences yet</Text>
            <Text style={styles.emptySub}>Log the things that make life worth living</Text>
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
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  noteSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  noteText: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
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
  textAreaSm: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2, textTransform: 'capitalize' },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
})
