import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Book } from '@/types/models'

const STATUS_TABS: Book['status'][] = ['reading', 'want', 'finished']
const STATUS_LABEL = { reading: '📖 Reading', want: '📌 Want to Read', finished: '✅ Finished' }

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}</Text>
}

function BookCard({ book, onDelete }: { book: Book; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const pct = book.pages > 0 ? Math.min(100, Math.round((book.progress / book.pages) * 100)) : 0
  return (
    <TouchableOpacity style={styles.bookCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
      <View style={styles.bookHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
      {book.status === 'reading' && book.pages > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{pct}% · p{book.progress}/{book.pages}</Text>
        </View>
      )}
      {book.status === 'finished' && <StarRating rating={book.rating} />}
      {expanded && book.genre ? <Text style={styles.bookGenre}>📚 {book.genre}</Text> : null}
      {expanded && book.notes ? <Text style={styles.bookNotes}>{book.notes}</Text> : null}
    </TouchableOpacity>
  )
}

interface NewBook { title: string; author: string; pages: string; status: Book['status']; genre: string; notes: string }
const blankBook = (): NewBook => ({ title: '', author: '', pages: '', status: 'want', genre: '', notes: '' })

function AddModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (b: NewBook) => void }) {
  const [form, setForm] = useState<NewBook>(blankBook)
  const set = (k: keyof NewBook, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>Add Book</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankBook()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => set('title', t)} placeholderTextColor={colors.text3} placeholder="Book title" />
        <Text style={styles.fieldLabel}>Author</Text>
        <TextInput style={styles.input} value={form.author} onChangeText={t => set('author', t)} placeholderTextColor={colors.text3} placeholder="Author name" />
        <Text style={styles.fieldLabel}>Pages</Text>
        <TextInput style={styles.input} value={form.pages} onChangeText={t => set('pages', t)} keyboardType="number-pad" placeholderTextColor={colors.text3} placeholder="0" />
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.toggle}>
          {STATUS_TABS.map(s => (
            <TouchableOpacity key={s} style={[styles.toggleBtn, form.status === s && styles.toggleActive]} onPress={() => set('status', s)}>
              <Text style={[styles.toggleText, form.status === s && styles.toggleActiveText]}>{STATUS_LABEL[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Genre</Text>
        <TextInput style={styles.input} value={form.genre} onChangeText={t => set('genre', t)} placeholderTextColor={colors.text3} placeholder="e.g. Fiction, Self-help" />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput style={[styles.input, styles.textAreaSm]} value={form.notes} onChangeText={t => set('notes', t)} placeholderTextColor={colors.text3} multiline numberOfLines={3} />
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function ReadingScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal]     = useState(false)
  const [tab, setTab]         = useState<Book['status']>('reading')

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn:  () => apiClient.get('/books').then(r => r.data),
  })
  const createBook = useMutation({
    mutationFn: (b: NewBook) => apiClient.post('/books', { ...b, pages: parseInt(b.pages) || 0 }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['books'] }); setModal(false) },
  })
  const deleteBook = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/books/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['books'] }),
  })

  const shown = data.filter(b => b.status === tab)

  return (
    <View style={styles.root}>
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={b => createBook.mutate(b)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Reading</Text>
              <Text style={styles.pageSubtitle}>{data.length} book{data.length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {STATUS_TABS.map(s => (
            <TouchableOpacity key={s} style={[styles.tab, tab === s && styles.tabActive]} onPress={() => setTab(s)}>
              <Text style={[styles.tabText, tab === s && styles.tabActiveText]}>{STATUS_LABEL[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load books</Text>}
        {shown.map(book => (
          <BookCard key={book.id} book={book} onDelete={() => deleteBook.mutate(book.id)} />
        ))}
        {!isLoading && shown.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📚</Text>
            <Text style={styles.emptyText}>No books here</Text>
            <Text style={styles.emptySub}>Tap + Add to add your first book</Text>
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
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { fontSize: fontSize.xxs, color: colors.text3 },
  tabActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  bookCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  bookHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bookTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  bookAuthor: { fontSize: fontSize.sm, color: colors.text3 },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  progressLabel: { fontSize: fontSize.xs, color: colors.text3, minWidth: 80 },
  bookGenre: { fontSize: fontSize.sm, color: colors.text3 },
  bookNotes: { fontSize: fontSize.sm, color: colors.text2, fontStyle: 'italic' },
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
  toggle: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  toggleBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.xs, color: colors.text2 },
  toggleActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
