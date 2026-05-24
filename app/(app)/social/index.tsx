import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { SocialConnection } from '@/types/models'

function daysSince(d: string | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number | null): string {
  if (days === null) return colors.text3
  if (days > 30) return colors.rose
  if (days > 14) return colors.amber
  return colors.green
}

function Avatar({ name, colorVar }: { name: string; colorVar: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <View style={[styles.avatar, { borderColor: colorVar || colors.primary }]}>
      <Text style={[styles.avatarText, { color: colorVar || colors.primary }]}>{initials}</Text>
    </View>
  )
}

function ContactCard({ person, onLogContact, onDelete }: {
  person: SocialConnection; onLogContact: () => void; onDelete: () => void
}) {
  const days = daysSince(person.lastContact)
  const urgency = urgencyColor(days)
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Avatar name={person.name} colorVar={person.colorVar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.personRel}>{person.relationship}</Text>
          {person.birthday ? <Text style={styles.birthday}>🎂 {person.birthday}</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.daysAgo, { color: urgency }]}>
            {days === null ? 'Never' : days === 0 ? 'Today' : `${days}d ago`}
          </Text>
          <TouchableOpacity style={styles.contactBtn} onPress={onLogContact}>
            <Text style={styles.contactBtnText}>📞</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      {person.notes ? <Text style={styles.personNotes}>{person.notes}</Text> : null}
    </View>
  )
}

interface NewPerson { name: string; relationship: string; notes: string; birthday: string }
const blankPerson = (): NewPerson => ({ name: '', relationship: 'friend', notes: '', birthday: '' })

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (p: NewPerson) => void }) {
  const [form, setForm] = useState<NewPerson>(blankPerson)
  const set = (k: keyof NewPerson, v: string) => setForm(f => ({ ...f, [k]: v }))
  const RELS = ['friend', 'family', 'colleague', 'mentor', 'acquaintance']
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Add Person</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankPerson()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={t => set('name', t)} placeholderTextColor={colors.text3} placeholder="Full name" />
        <Text style={styles.fieldLabel}>Relationship</Text>
        <View style={styles.chipRow}>
          {RELS.map(r => (
            <TouchableOpacity key={r} style={[styles.chip, form.relationship === r && styles.chipActive]} onPress={() => set('relationship', r)}>
              <Text style={[styles.chipText, form.relationship === r && styles.chipActiveText]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Birthday (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={form.birthday} onChangeText={t => set('birthday', t)} placeholderTextColor={colors.text3} placeholder="1990-01-01" />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.notes} onChangeText={t => set('notes', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function SocialScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<SocialConnection[]>({
    queryKey: ['social'],
    queryFn:  () => apiClient.get('/social').then(r => r.data),
  })
  const createPerson = useMutation({
    mutationFn: (p: NewPerson) => apiClient.post('/social', { ...p, birthday: p.birthday || null }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['social'] }); setModal(false) },
  })
  const logContact = useMutation({
    mutationFn: (id: string) => apiClient.post(`/social/${id}/contact`, {}),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['social'] }),
  })
  const deletePerson = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/social/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['social'] }),
  })

  const sorted = [...data].sort((a, b) => {
    const da = daysSince(a.lastContact) ?? 9999
    const db = daysSince(b.lastContact) ?? 9999
    return db - da
  })

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={p => createPerson.mutate(p)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Social</Text>
              <Text style={styles.pageSubtitle}>{data.length} connection{data.length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load connections</Text>}
        {sorted.map(p => (
          <ContactCard key={p.id} person={p} onLogContact={() => logContact.mutate(p.id)} onDelete={() => deletePerson.mutate(p.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>👥</Text>
            <Text style={styles.emptyText}>No connections yet</Text>
            <Text style={styles.emptySub}>Add people you want to stay in touch with</Text>
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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  avatarText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  personName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  personRel: { fontSize: fontSize.xs, color: colors.text3, textTransform: 'capitalize' },
  birthday: { fontSize: fontSize.xs, color: colors.amber },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  daysAgo: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  contactBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.sm, padding: spacing.xs },
  contactBtnText: { fontSize: 16 },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  personNotes: { fontSize: fontSize.sm, color: colors.text3, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
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
