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
import type { Book } from '@/types/models'

const STATUS_TABS: Book['status'][] = ['reading', 'want', 'finished']
const STATUS_LABEL = { reading: '\u{1F4D6} Reading', want: '\u{1F4CC} Want to Read', finished: '\u2705 Finished' }

function StarRating({ rating }: { rating: number }) {
  return <Text style={{ color: colors.amber, fontSize: fontSize.sm }}>{Array.from({ length: 5 }, (_, i) => i < rating ? '\u2605' : '\u2606').join('')}</Text>
}

function BookCard({ book, onDelete, onEdit }: { book: Book; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const pct = book.pages > 0 ? Math.min(100, Math.round((book.progress / book.pages) * 100)) : 0
  return (
    <TouchableOpacity style={styles.bookCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.8} accessibilityRole="button" accessibilityHint="Double tap to expand">
      <View style={styles.bookHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {book.status === 'reading' && book.pages > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{pct}% {'\u00B7'} p{book.progress}/{book.pages}</Text>
        </View>
      )}
      {book.status === 'finished' && <StarRating rating={book.rating} />}
      {expanded && book.genre ? <Text style={styles.bookGenre}>{'\u{1F4DA}'} {book.genre}</Text> : null}
      {expanded && book.notes ? <Text style={styles.bookNotes}>{book.notes}</Text> : null}
    </TouchableOpacity>
  )
}

interface BookForm { title: string; author: string; pages: string; status: Book['status']; genre: string; notes: string }
const blankForm = (): BookForm => ({ title: '', author: '', pages: '', status: 'want', genre: '', notes: '' })
function toForm(b: Book): BookForm {
  return { title: b.title, author: b.author, pages: b.pages ? String(b.pages) : '', status: b.status, genre: b.genre ?? '', notes: b.notes ?? '' }
}

export default function ReadingScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [form, setForm] = useState<BookForm>(blankForm)
  const [tab, setTab] = useState<Book['status']>('reading')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Book) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: () => apiClient.get('/books').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (d: BookForm) => {
      const payload = { ...d, pages: parseInt(d.pages) || 0 }
      return editing
        ? apiClient.put(`/reading/${editing.id}`, payload)
        : apiClient.post('/books', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save book', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/books/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this book?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const handleSave = () => {
    if (form.pages && isNaN(Number(form.pages))) {
      showToast('Please enter valid numbers', 'error')
      return
    }
    saveMutation.mutate(form)
  }

  const set = (k: keyof BookForm, v: string) => setForm(f => ({ ...f, [k]: v as any }))
  const filtered = search
    ? data.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || (b.author ?? '').toLowerCase().includes(search.toLowerCase()))
    : data
  const shown = filtered.filter(b => b.status === tab)

  const ListHeader = (
    <View>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Reading</Text>
            <Text style={styles.pageSubtitle}>{data.length} book{data.length === 1 ? '' : 's'}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new book">
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search books..." />

      <View style={styles.tabs}>
        {STATUS_TABS.map(s => (
          <TouchableOpacity key={s} style={[styles.tab, tab === s && styles.tabActive]} onPress={() => setTab(s)}>
            <Text style={[styles.tabText, tab === s && styles.tabActiveText]}>{STATUS_LABEL[s]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const ListEmpty = !isLoading ? (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48 }}>{'\u{1F4DA}'}</Text>
      <Text style={styles.emptyText}>No books here</Text>
      <Text style={styles.emptySub}>Tap + Add to add your first book</Text>
    </View>
  ) : null

  return (
    <ScreenWrapper scroll={false} padHorizontal={false}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Book' : 'Add Book'}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.title.trim()}
      >
        <FormField label="Title *" value={form.title} onChangeText={t => set('title', t)} placeholder="Book title" maxLength={100} />
        <FormField label="Author" optional value={form.author} onChangeText={t => set('author', t)} placeholder="Author name" maxLength={100} />
        <FormField label="Pages" optional value={form.pages} onChangeText={t => set('pages', t)} keyboardType="numeric" placeholder="0" />
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.toggle}>
          {STATUS_TABS.map(s => (
            <TouchableOpacity key={s} style={[styles.toggleBtn, form.status === s && styles.toggleActive]} onPress={() => set('status', s)}>
              <Text style={[styles.toggleText, form.status === s && styles.toggleActiveText]}>{STATUS_LABEL[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Genre" optional value={form.genre} onChangeText={t => set('genre', t)} placeholder="e.g. Fiction, Self-help" maxLength={50} />
        <FormField label="Notes" optional value={form.notes} onChangeText={t => set('notes', t)} multiline numberOfLines={3} maxLength={2000} />
      </ModalForm>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load books</Text>}

      <FlatList
        data={shown}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => (
          <BookCard book={item} onDelete={() => handleDelete(item.id)} onEdit={() => openEdit(item)} />
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
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { fontSize: fontSize.xxs, color: colors.text3 },
  tabActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  bookCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  bookHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bookTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  bookAuthor: { fontSize: fontSize.sm, color: colors.text3 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
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
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  toggle: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  toggleBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  toggleText: { fontSize: fontSize.xs, color: colors.text2 },
  toggleActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
