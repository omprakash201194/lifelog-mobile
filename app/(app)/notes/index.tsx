import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Note } from '@/types/models'

function NoteRow({ note, depth, onSelect, onDelete }: {
  note: Note; depth: number; onSelect: (n: Note) => void; onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = note.children && note.children.length > 0
  return (
    <View>
      <TouchableOpacity style={[styles.noteRow, { paddingLeft: spacing.lg + depth * 16 }]} onPress={() => onSelect(note)}>
        <TouchableOpacity onPress={() => setOpen(o => !o)} disabled={!hasChildren} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={[styles.chevron, !hasChildren && styles.chevronHidden]}>{open ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        <Text style={styles.noteIcon}>🗒️</Text>
        <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
        {hasChildren && <Text style={styles.childCount}>{note.children.length}</Text>}
        <TouchableOpacity onPress={() => onDelete(note.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {open && hasChildren && note.children.map(child => (
        <NoteRow key={child.id} note={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} />
      ))}
    </View>
  )
}

function NoteViewModal({ note, onClose }: { note: Note | null; onClose: () => void }) {
  return (
    <Modal visible={!!note} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>{note?.title}</Text>
          <View style={{ width: 50 }} />
        </View>
        <Text style={styles.notePath}>{note?.path}</Text>
        <Text style={styles.noteContent}>{note?.content || 'No content'}</Text>
      </ScrollView>
    </Modal>
  )
}

interface NewNote { title: string; content: string; parentId: string }
const blankNote = (): NewNote => ({ title: '', content: '', parentId: '' })

function AddModal({ visible, onClose, onSave, roots }: { visible: boolean; onClose: () => void; onSave: (n: NewNote) => void; roots: Note[] }) {
  const [form, setForm] = useState<NewNote>(blankNote)
  const set = (k: keyof NewNote, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>New Note</Text>
          <TouchableOpacity onPress={() => { onSave(form); setForm(blankNote()) }}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => set('title', t)} placeholderTextColor={colors.text3} placeholder="Note title" />
        <Text style={styles.fieldLabel}>Content</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.content} onChangeText={t => set('content', t)} placeholderTextColor={colors.text3} placeholder="Write your note…" multiline numberOfLines={8} />
        {roots.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Parent (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
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
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Modal>
  )
}

export default function NotesScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [modal, setModal]       = useState(false)
  const [selected, setSelected] = useState<Note | null>(null)

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn:  () => apiClient.get('/notes').then(r => r.data),
  })
  const createNote = useMutation({
    mutationFn: (n: NewNote) => apiClient.post('/notes', { ...n, parentId: n.parentId || null }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['notes'] }); setModal(false) },
  })
  const deleteNote = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  const roots = data.filter(n => !n.parentId)

  return (
    <View style={styles.root}>
      <NoteViewModal note={selected} onClose={() => setSelected(null)} />
      <AddModal visible={modal} onClose={() => setModal(false)} onSave={n => createNote.mutate(n)} roots={roots} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Notes</Text>
              <Text style={styles.pageSubtitle}>{data.length} note{data.length === 1 ? '' : 's'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}
        {isError && <Text style={styles.errorText}>Could not load notes</Text>}
        <View style={styles.treeContainer}>
          {roots.map(note => (
            <NoteRow key={note.id} note={note} depth={0} onSelect={setSelected} onDelete={id => deleteNote.mutate(id)} />
          ))}
        </View>
        {!isLoading && data.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🗒️</Text>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySub}>Tap + New to write your first note</Text>
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
  treeContainer: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  noteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingRight: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  chevron: { fontSize: fontSize.xs, color: colors.text3, width: 14 },
  chevronHidden: { opacity: 0 },
  noteIcon: { fontSize: 16 },
  noteTitle: { flex: 1, fontSize: fontSize.base, color: colors.text1 },
  childCount: { fontSize: fontSize.xxs, color: colors.text3, backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  notePath: { fontSize: fontSize.xs, color: colors.text3, marginBottom: spacing.lg, fontFamily: 'monospace' },
  noteContent: { fontSize: fontSize.base, color: colors.text2, lineHeight: 22 },
  errorText: { color: colors.rose, textAlign: 'center', marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text1, flex: 1, textAlign: 'center' },
  modalCancel: { fontSize: fontSize.base, color: colors.text3, minWidth: 50 },
  modalSave: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold, textAlign: 'right', minWidth: 50 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text1, fontSize: fontSize.base },
  textArea: { height: 180, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
})
