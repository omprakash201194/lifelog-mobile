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
import type { Note } from '@/types/models'

function NoteRow({ note, depth, onSelect, onDelete, onEdit }: {
  note: Note; depth: number; onSelect: (n: Note) => void; onDelete: (id: string) => void; onEdit: (n: Note) => void
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = note.children && note.children.length > 0
  return (
    <View>
      <TouchableOpacity style={[styles.noteRow, { paddingLeft: spacing.lg + depth * 16 }]} onPress={() => onSelect(note)}>
        <TouchableOpacity onPress={() => setOpen(o => !o)} disabled={!hasChildren} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={[styles.chevron, !hasChildren && styles.chevronHidden]}>{open ? '\u25BE' : '\u25B8'}</Text>
        </TouchableOpacity>
        <Text style={styles.noteIcon}>{'\u{1F5D2}\uFE0F'}</Text>
        <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
        {hasChildren && <Text style={styles.childCount}>{note.children.length}</Text>}
        <TouchableOpacity onPress={() => onEdit(note)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.editIcon}>{'\u270E'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(note.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {open && hasChildren && note.children.map(child => (
        <NoteRow key={child.id} note={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </View>
  )
}

interface NoteForm { title: string; content: string; parentId: string }
const blankForm = (): NoteForm => ({ title: '', content: '', parentId: '' })
function toForm(n: Note): NoteForm {
  return { title: n.title, content: n.content ?? '', parentId: n.parentId ?? '' }
}

export default function NotesScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [form, setForm] = useState<NoteForm>(blankForm)
  const [selected, setSelected] = useState<Note | null>(null)

  useEffect(() => {
    if (modalVisible) {
      setForm(editing ? toForm(editing) : blankForm())
    }
  }, [editing, modalVisible])

  const openCreate = () => { setEditing(null); setModalVisible(true) }
  const openEdit = (item: Note) => { setEditing(item); setModalVisible(true) }

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: () => apiClient.get('/notes').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: NoteForm) => editing
      ? apiClient.put(`/notes/${editing.id}`, { ...data, parentId: data.parentId || null })
      : apiClient.post('/notes', { ...data, parentId: data.parentId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setModalVisible(false)
      showToast(editing ? 'Updated!' : 'Created!', 'success')
    },
    onError: () => showToast('Failed to save note', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleDelete = (id: string) => {
    confirmAction({ message: 'Delete this note?', onConfirm: () => deleteMutation.mutate(id) })
  }

  const set = (k: keyof NoteForm, v: string) => setForm(f => ({ ...f, [k]: v }))
  const roots = data.filter(n => !n.parentId)

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetch}>
      <ModalForm
        visible={modalVisible}
        title={editing ? 'Edit Note' : 'New Note'}
        onClose={() => setModalVisible(false)}
        onSave={() => saveMutation.mutate(form)}
        saving={saveMutation.isPending}
        disabled={isOffline || !form.title.trim()}
      >
        <FormField label="Title *" value={form.title} onChangeText={t => set('title', t)} placeholder="Note title" />
        <FormField label="Content" optional value={form.content} onChangeText={t => set('content', t)} placeholder="Write your note..." multiline numberOfLines={8} style={{ height: 180 }} />
        {roots.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Parent (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, !form.parentId && styles.chipActive]} onPress={() => set('parentId', '')}>
                  <Text style={[styles.chipText, !form.parentId && styles.chipActiveText]}>Root</Text>
                </TouchableOpacity>
                {roots.map(r => (
                  <TouchableOpacity key={r.id} style={[styles.chip, form.parentId === r.id && styles.chipActive]} onPress={() => set('parentId', r.id)}>
                    <Text style={[styles.chipText, form.parentId === r.id && styles.chipActiveText]}>{r.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Notes</Text>
            <Text style={styles.pageSubtitle}>{data.length} note{data.length === 1 ? '' : 's'}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
      {isError && <Text style={styles.errorText}>Could not load notes</Text>}
      <View style={styles.treeContainer}>
        {roots.map(note => (
          <NoteRow key={note.id} note={note} depth={0} onSelect={setSelected} onDelete={handleDelete} onEdit={openEdit} />
        ))}
      </View>
      {!isLoading && data.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>{'\u{1F5D2}\uFE0F'}</Text>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptySub}>Tap + New to write your first note</Text>
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
  treeContainer: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  noteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingRight: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  chevron: { fontSize: fontSize.xs, color: colors.text3, width: 14 },
  chevronHidden: { opacity: 0 },
  noteIcon: { fontSize: 16 },
  noteTitle: { flex: 1, fontSize: fontSize.base, color: colors.text1 },
  childCount: { fontSize: fontSize.xxs, color: colors.text3, backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
