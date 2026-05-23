import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Task } from '@/types/models'

// ── Quadrant config ────────────────────────────────────────────
// Backend enum values: DO, SCHEDULE, DELEGATE, ELIMINATE
const QUADRANTS: {
  key:    Task['quadrant']
  label:  string
  accent: string
  emoji:  string
  desc:   string
}[] = [
  { key: 'DO',        label: 'Do',        accent: colors.red,   emoji: '🔴', desc: 'Urgent & Important'     },
  { key: 'SCHEDULE',  label: 'Schedule',  accent: colors.blue,  emoji: '🔵', desc: 'Important, not Urgent'  },
  { key: 'DELEGATE',  label: 'Delegate',  accent: colors.amber, emoji: '🟡', desc: 'Urgent, not Important'  },
  { key: 'ELIMINATE', label: 'Eliminate', accent: colors.text3, emoji: '⚪', desc: 'Neither Urgent nor Important' },
]

// ── Task item ──────────────────────────────────────────────────
function TaskItem({
  task, onToggle, onDelete,
}: {
  task:     Task
  onToggle: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
      <View style={styles.taskRow}>
        <TouchableOpacity style={[styles.checkBox, task.completed && styles.checkDone]} onPress={onToggle}>
          {task.completed && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>
        <Text style={[styles.taskTitle, task.completed && styles.taskDone]} numberOfLines={expanded ? undefined : 2}>
          {task.title}
        </Text>
        <TouchableOpacity onPress={onDelete} style={styles.deleteIcon}>
          <Text style={styles.deleteIconText}>✕</Text>
        </TouchableOpacity>
      </View>
      {expanded && task.description ? (
        <Text style={styles.taskNotes}>{task.description}</Text>
      ) : null}
    </TouchableOpacity>
  )
}

// ── Add task modal ─────────────────────────────────────────────
function AddTaskModal({
  visible, defaultQuadrant, onSave, onClose,
}: {
  visible:          boolean
  defaultQuadrant:  Task['quadrant']
  onSave:           (t: Partial<Task>) => void
  onClose:          () => void
}) {
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [quadrant, setQuadrant] = useState<Task['quadrant']>(defaultQuadrant)

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ title: title.trim(), description: desc.trim() || undefined, quadrant })
    setTitle(''); setDesc('')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Add task</Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor={colors.text3}
            autoFocus
          />

          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.text3}
            multiline
          />

          <Text style={styles.fieldLabel}>Quadrant</Text>
          <View style={styles.quadrantPicker}>
            <View style={styles.qRow}>
              {[QUADRANTS[0], QUADRANTS[1]].map(q => (
                <TouchableOpacity
                  key={q.key}
                  style={[styles.qBtn, quadrant === q.key && { borderColor: q.accent, backgroundColor: q.accent + '22' }]}
                  onPress={() => setQuadrant(q.key)}>
                  <Text style={styles.qBtnEmoji}>{q.emoji}</Text>
                  <Text style={styles.qBtnLabel}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.qRow}>
              {[QUADRANTS[2], QUADRANTS[3]].map(q => (
                <TouchableOpacity
                  key={q.key}
                  style={[styles.qBtn, quadrant === q.key && { borderColor: q.accent, backgroundColor: q.accent + '22' }]}
                  onPress={() => setQuadrant(q.key)}>
                  <Text style={styles.qBtnEmoji}>{q.emoji}</Text>
                  <Text style={styles.qBtnLabel}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && { opacity: 0.4 }]}
            disabled={!title.trim()}
            onPress={handleSave}>
            <Text style={styles.saveBtnText}>Add task</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Quadrant card ──────────────────────────────────────────────
function QuadrantCard({
  quadrant, tasks, onAdd, onToggle, onDelete,
}: {
  quadrant: typeof QUADRANTS[number]
  tasks:    Task[]
  onAdd:    () => void
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const activeTasks    = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  return (
    <View style={[styles.quadCard, { borderColor: quadrant.accent + '55' }]}>
      <View style={styles.quadHeader}>
        <View style={styles.quadHeaderLeft}>
          <Text style={styles.quadEmoji}>{quadrant.emoji}</Text>
          <View>
            <Text style={[styles.quadLabel, { color: quadrant.accent }]}>{quadrant.label}</Text>
            <Text style={styles.quadDesc}>{quadrant.desc}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.addSmallBtn, { borderColor: quadrant.accent }]} onPress={onAdd}>
          <Text style={[styles.addSmallText, { color: quadrant.accent }]}>+</Text>
        </TouchableOpacity>
      </View>

      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <Text style={styles.emptyQuad}>No tasks</Text>
      ) : (
        <View style={styles.taskList}>
          {activeTasks.map((t, i) => (
            <View key={t.id}>
              <TaskItem task={t} onToggle={() => onToggle(t.id, !t.completed)} onDelete={() => onDelete(t.id)} />
              {i < activeTasks.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          {completedTasks.length > 0 && activeTasks.length > 0 && <View style={styles.divider} />}
          {completedTasks.map((t, i) => (
            <View key={t.id}>
              <TaskItem task={t} onToggle={() => onToggle(t.id, !t.completed)} onDelete={() => onDelete(t.id)} />
              {i < completedTasks.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────
export default function TasksScreen() {
  const qc = useQueryClient()
  const [modal,          setModal]          = useState(false)
  const [addForQuadrant, setAddForQuadrant] = useState<Task['quadrant']>('DO')

  const { data: tasks = [], isLoading, refetch, isFetching } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => apiClient.get('/tasks').then(r => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createTask = useMutation({
    mutationFn: (t: Partial<Task>) => apiClient.post('/tasks', t),
    onSuccess:  () => { invalidate(); setModal(false) },
  })

  const updateTask = useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: string }) => apiClient.put(`/tasks/${id}`, data),
    onSuccess:  () => invalidate(),
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess:  () => invalidate(),
  })

  const openAdd = (q: Task['quadrant']) => {
    setAddForQuadrant(q)
    setModal(true)
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
  }

  const totalActive    = tasks.filter(t => !t.completed).length
  const totalCompleted = tasks.filter(t => t.completed).length

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>

      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Tasks</Text>
          <Text style={styles.pageSubtitle}>{totalActive} active · {totalCompleted} done</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openAdd('DO')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Eisenhower grid — 2 columns */}
      <View style={styles.eisenhowerGrid}>
        <View style={styles.gridRow}>
          {[QUADRANTS[0], QUADRANTS[1]].map(q => (
            <View key={q.key} style={{ flex: 1 }}>
              <QuadrantCard
                quadrant={q}
                tasks={tasks.filter(t => t.quadrant === q.key)}
                onAdd={() => openAdd(q.key)}
                onToggle={(id, completed) => updateTask.mutate({ id, completed })}
                onDelete={(id) => deleteTask.mutate(id)}
              />
            </View>
          ))}
        </View>
        <View style={styles.gridRow}>
          {[QUADRANTS[2], QUADRANTS[3]].map(q => (
            <View key={q.key} style={{ flex: 1 }}>
              <QuadrantCard
                quadrant={q}
                tasks={tasks.filter(t => t.quadrant === q.key)}
                onAdd={() => openAdd(q.key)}
                onToggle={(id, completed) => updateTask.mutate({ id, completed })}
                onDelete={(id) => deleteTask.mutate(id)}
              />
            </View>
          ))}
        </View>
      </View>

      <AddTaskModal
        visible={modal}
        defaultQuadrant={addForQuadrant}
        onSave={t => createTask.mutate(t)}
        onClose={() => setModal(false)}
      />

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.xxl + 8 },
  center:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  pageHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  pageTitle:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  addBtn:       { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText:   { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  eisenhowerGrid: { gap: spacing.sm },
  gridRow:        { flexDirection: 'row', gap: spacing.sm },

  quadCard:   { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.sm, minHeight: 120 },
  quadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  quadHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  quadEmoji:  { fontSize: 16 },
  quadLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  quadDesc:   { fontSize: 9, color: colors.text3 },

  addSmallBtn:  { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addSmallText: { fontSize: 16, lineHeight: 20, fontWeight: fontWeight.bold },

  taskList: {},
  taskRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingVertical: spacing.xs },
  checkBox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkDone:{ backgroundColor: colors.primary },
  checkMark:{ color: '#fff', fontSize: 10, fontWeight: fontWeight.bold },
  taskTitle:{ flex: 1, fontSize: fontSize.xs, color: colors.text1 },
  taskDone: { textDecorationLine: 'line-through', color: colors.text3 },
  taskNotes:{ fontSize: 10, color: colors.text3, paddingLeft: spacing.lg, paddingBottom: spacing.xs },
  deleteIcon:    { padding: 2 },
  deleteIconText:{ fontSize: 10, color: colors.text3 },
  divider:  { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  emptyQuad:{ fontSize: fontSize.xs, color: colors.text3, textAlign: 'center', paddingVertical: spacing.sm },

  // Modal
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text1, marginBottom: spacing.xl, textAlign: 'center' },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  input:      { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text1, fontSize: fontSize.base, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  quadrantPicker: { gap: spacing.sm, marginBottom: spacing.xl },
  qRow:       { flexDirection: 'row', gap: spacing.sm },
  qBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  qBtnEmoji:  { fontSize: 16 },
  qBtnLabel:  { fontSize: fontSize.sm, color: colors.text2 },
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  saveBtnText:{ color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  cancelBtn:  { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.text3, fontSize: fontSize.base },
})
