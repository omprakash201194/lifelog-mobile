import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Trip } from '@/types/models'

function fmtRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}</Text>
}

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <TouchableOpacity style={styles.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <Text style={styles.flag}>{trip.flag ?? '🌍'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripCity}>{trip.city}, {trip.country}</Text>
          <Text style={styles.tripDates}>{fmtRange(trip.startDate, trip.endDate)}</Text>
          {trip.days ? <Text style={styles.tripDays}>{trip.days} days</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <StarRating rating={trip.rating} />
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      {expanded && trip.highlights ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>✨ Highlights</Text>
          <Text style={styles.subText}>{trip.highlights}</Text>
        </View>
      ) : null}
      {expanded && trip.notes ? (
        <View style={styles.subSection}>
          <Text style={styles.subLabel}>📝 Notes</Text>
          <Text style={styles.subText}>{trip.notes}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

interface NewTrip { city: string; country: string; flag: string; startDate: string; endDate: string; rating: number; highlights: string; notes: string }
const blankTrip = (): NewTrip => {
  const today = new Date().toISOString().split('T')[0]
  return { city: '', country: '', flag: '', startDate: today, endDate: today, rating: 4, highlights: '', notes: '' }
}

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (t: NewTrip) => void }) {
  const [form, setForm] = useState<NewTrip>(blankTrip)
  const set = (k: keyof NewTrip, v: any) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Add Trip</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankTrip()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>City *</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={t => set('city', t)} placeholderTextColor={colors.text3} placeholder="Paris" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Country *</Text>
            <TextInput style={styles.input} value={form.country} onChangeText={t => set('country', t)} placeholderTextColor={colors.text3} placeholder="France" />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Flag emoji</Text>
        <TextInput style={styles.input} value={form.flag} onChangeText={t => set('flag', t)} placeholderTextColor={colors.text3} placeholder="🇫🇷" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Start date</Text>
            <TextInput style={styles.input} value={form.startDate} onChangeText={t => set('startDate', t)} placeholderTextColor={colors.text3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>End date</Text>
            <TextInput style={styles.input} value={form.endDate} onChangeText={t => set('endDate', t)} placeholderTextColor={colors.text3} />
          </View>
        </View>
        <Text style={styles.fieldLabel}>Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => set('rating', n)}>
              <Text style={{ fontSize: 28, color: n <= form.rating ? colors.amber : colors.border }}>{n <= form.rating ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Highlights</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.highlights} onChangeText={t => set('highlights', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.notes} onChangeText={t => set('notes', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function TripsScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn:  () => apiClient.get('/trips').then(r => r.data),
  })
  const createTrip = useMutation({
    mutationFn: (t: NewTrip) => apiClient.post('/trips', { ...t, flag: t.flag || null }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['trips'] }); setModal(false) },
  })
  const deleteTrip = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/trips/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })

  const countries = new Set(data.map(t => t.country)).size

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={t => createTrip.mutate(t)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Trips</Text>
              <Text style={styles.pageSubtitle}>{data.length} trips · {countries} countr{countries === 1 ? 'y' : 'ies'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load trips</Text>}
        {data.map(trip => (
          <TripCard key={trip.id} trip={trip} onDelete={() => deleteTrip.mutate(trip.id)} />
        ))}
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>✈️</Text>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySub}>Add your travel memories</Text>
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
  flag: { fontSize: 32 },
  tripCity: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  tripDates: { fontSize: fontSize.xs, color: colors.text3 },
  tripDays: { fontSize: fontSize.xs, color: colors.primary },
  cardRight: { alignItems: 'flex-end' },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
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
  textAreaSm: { height: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
})
