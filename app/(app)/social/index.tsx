import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import ScreenWrapper from '@/components/ScreenWrapper'
import ModalForm from '@/components/ModalForm'
import FormField from '@/components/FormField'
import SearchBar from '@/components/SearchBar'
import { useToast } from '@/contexts/ToastContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { confirmAction } from '@/components/ConfirmDialog'
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

function ContactCard({ person, onLogContact, onDelete, onEdit }: {
  person: SocialConnection; onLogContact: () => void; onDelete: () => void; onEdit: () => void
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
          {person.birthday ? <Text style={styles.birthday}>{'\u{1F382}'} {person.birthday}</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.daysAgo, { color: urgency }]}>
            {days === null ? 'Never' : days === 0 ? 'Today' : `${days}d ago`}
          </Text>
          <TouchableOpacity style={styles.contactBtn} onPress={onLogContact} accessibilityRole="button" accessibilityLabel="Log contact">
            <Text style={styles.contactBtnText}>{'\u{1F4DE}'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: spacing.xs }}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {person.notes ? <Text style={styles.personNotes}>{person.notes}</Text> : null}
    </View>
  )
}

interface PersonForm { name: string; relationship: string; notes: string; birthday: string }
const blankForm = (): PersonForm => ({ name: '', relationship: 'friend', notes: '', birthday: '' })
function toForm(p: SocialConnection): PersonForm {
  return { name: p.name, relationship: p.relationship, notes: p.notes ?? '', birthday: p.birthday ?? '' }
}

const RELS = ['friend', 'family', 'colleague', 'mentor', 'acquaintance']

export default function SocialScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<SocialConnection | null>(null)
  const [form, setForm] = useState<PersonForm>(blankForm)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: SocialConnection) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<SocialConnection[]>({
    queryKey: ['social'],
    queryFn: () => apiClient.get('/social').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: PersonForm) => {
      const payload = { ...d, birthday: d.birthday || null }
      return editing
        ? apiClient.put(`/social/${editing.id}`, payload)
        : apiClient.post('/social', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save connection', 'error'),
  })

  const logContact = useMutation({
    mutationFn: (id: string) => apiClient.post(`/social/${id}/contact`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social'] }); showToast('Contact logged!', 'success') },
    onError: () => showToast('Failed to log contact', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/social/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this connection?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof PersonForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const filtered = search
    ? data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : data
  const sorted = [...filtered].sort((a, b) => {
    const da = daysSince(a.lastContact) ?? 9999
    const db = daysSince(b.lastContact) ?? 9999
    return db - da
  })

  const ListHeader = (
    <View style={styles.pageHeader}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Social</Text>
          <Text style={styles.pageSubtitle}>{data.length} connection{data.length === 1 ? '' : 's'}</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new connection">
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search connections..." />
    </View>
  )

  const ListEmpty = !isLoading ? (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>{'\u{1F465}'}</Text>
      <Text style={styles.emptyText}>No connections yet</Text>
      <Text style={styles.emptySub}>Add people you want to stay in touch with</Text>
    </View>
  ) : null

  return (
    <ScreenWrapper scroll={false} padHorizontal={false}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Person' : 'Add Person'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.name.trim()}
      >
        <FormField label="Name *" value={form.name} onChangeText={t => set('name', t)} placeholder="Full name" maxLength={100} />
        <Text style={styles.fieldLabel}>Relationship</Text>
        <View style={styles.chipRow}>
          {RELS.map(r => (
            <TouchableOpacity key={r} style={[styles.chip, form.relationship === r && styles.chipActive]} onPress={() => set('relationship', r)} accessibilityRole="tab" accessibilityState={{ selected: form.relationship === r }}>
              <Text style={[styles.chipText, form.relationship === r && styles.chipActiveText]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Birthday (YYYY-MM-DD)" optional value={form.birthday} onChangeText={t => set('birthday', t)} placeholder="1990-01-01" maxLength={50} />
        <FormField label="Notes" optional value={form.notes} onChangeText={t => set('notes', t)} multiline numberOfLines={3} maxLength={2000} />
      </ModalForm>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load connections</Text>}

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => (
          <ContactCard person={item} onLogContact={() => logContact.mutate(item.id)} onDelete={() => handleDelete(item.id)} onEdit={() => openEdit(item)} />
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
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
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
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  personNotes: { fontSize: fontSize.sm, color: colors.text3, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
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
