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
import type { Trip } from '@/types/models'

function fmtRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} \u2013 ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} \u2013 ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '\u2605' : '\u2606').join('')}</Text>
}

function TripCard({ trip, onDelete, onEdit }: { trip: Trip; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.8} accessibilityRole="button" accessibilityHint="Double tap to expand">
      <View style={styles.cardRow}>
        <Text style={styles.flag}>{trip.flag ?? '\u{1F30D}'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripCity}>{trip.city}, {trip.country}</Text>
          <Text style={styles.tripDates}>{fmtRange(trip.startDate, trip.endDate)}</Text>
          {trip.days ? <Text style={styles.tripDays}>{trip.days} days</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <StarRating rating={trip.rating} />
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
      {expanded && trip.highlights ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>{'\u2728'} Highlights</Text>
          <Text style={styles.subText}>{trip.highlights}</Text>
        </View>
      ) : null}
      {expanded && trip.notes ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>{'\u{1F4DD}'} Notes</Text>
          <Text style={styles.subText}>{trip.notes}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface TripForm { city: string; country: string; flag: string; startDate: string; endDate: string; rating: number; highlights: string; notes: string }
const blankForm = (): TripForm => {
  const today = new Date().toISOString().split('T')[0]
  return { city: '', country: '', flag: '', startDate: today, endDate: today, rating: 4, highlights: '', notes: '' }
}
function toForm(t: Trip): TripForm {
  return { city: t.city, country: t.country, flag: t.flag ?? '', startDate: t.startDate, endDate: t.endDate, rating: t.rating, highlights: t.highlights ?? '', notes: t.notes ?? '' }
}

export default function TripsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [form, setForm] = useState<TripForm>(blankForm)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Trip) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => apiClient.get('/trips').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: TripForm) => {
      const payload = { ...d, flag: d.flag || null }
      return editing
        ? apiClient.put(`/trips/${editing.id}`, payload)
        : apiClient.post('/trips', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save trip', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/trips/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this trip?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof TripForm, v: any) => setForm(f => ({ ...f, [k]: v }))
  const filtered = search
    ? data.filter(t => t.city.toLowerCase().includes(search.toLowerCase()) || t.country.toLowerCase().includes(search.toLowerCase()))
    : data
  const countries = new Set(data.map(t => t.country)).size

  return (
    <ScreenWrapper scroll={false} padHorizontal={false}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Trip' : 'Add Trip'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.city.trim() || !form.country.trim()}
      >
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField label="City *" value={form.city} onChangeText={t => set('city', t)} placeholder="Paris" maxLength={100} />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Country *" value={form.country} onChangeText={t => set('country', t)} placeholder="France" maxLength={100} />
          </View>
        </View>
        <FormField label="Flag emoji" optional value={form.flag} onChangeText={t => set('flag', t)} placeholder="\u{1F1EB}\u{1F1F7}" maxLength={50} />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField label="Start date" value={form.startDate} onChangeText={t => set('startDate', t)} />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="End date" value={form.endDate} onChangeText={t => set('endDate', t)} />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => set('rating', n)}>
              <Text style={{ fontSize: 28, color: n <= form.rating ? colors.amber : colors.border }}>{n <= form.rating ? '\u2605' : '\u2606'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Highlights" optional value={form.highlights} onChangeText={t => set('highlights', t)} multiline numberOfLines={3} maxLength={2000} />
        <FormField label="Notes" optional value={form.notes} onChangeText={t => set('notes', t)} multiline numberOfLines={3} maxLength={2000} />
      </ModalForm>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load trips</Text>}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.pageTitle}>Trips</Text>
                <Text style={styles.pageSubtitle}>{data.length} trips {'\u00B7'} {countries} countr{countries === 1 ? 'y' : 'ies'}</Text>
              </View>
              <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new trip">
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search trips..." />
          </View>
        }
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>{'\u2708\uFE0F'}</Text>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySub}>Add your travel memories</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <TripCard trip={item} onDelete={() => handleDelete(item.id)} onEdit={() => openEdit(item)} />
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
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flag: { fontSize: 32 },
  tripCity: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  tripDates: { fontSize: fontSize.xs, color: colors.text3 },
  tripDays: { fontSize: fontSize.xs, color: colors.primary },
  cardRight: { alignItems: 'flex-end' },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  subSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  subLabel: { fontSize: fontSize.xs, color: colors.text3, fontWeight: fontWeight.semibold },
  subText: { fontSize: fontSize.sm, color: colors.text2 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
})
