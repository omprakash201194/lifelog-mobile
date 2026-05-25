import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, FlatList,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useLayout } from '@/hooks/useLayout'
import ScreenWrapper from '@/components/ScreenWrapper'
import ModalForm from '@/components/ModalForm'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Task } from '@/types/models'

// ── Constants ──────────────────────────────────────────────────
const MODES: { label: string; key: string; minutes: number; color: string }[] = [
  { key: 'focus',      label: 'Focus',      minutes: 25, color: colors.primary },
  { key: 'short',      label: 'Short break', minutes: 5,  color: colors.green  },
  { key: 'long',       label: 'Long break',  minutes: 15, color: colors.amber  },
]

const RING_STROKE = 12

// ── SVG-like ring via border trick ─────────────────────────────
function ProgressRing({ pct, color, size }: { pct: number; color: string; size: number }) {
  const rotate1 = pct > 50 ? 180 : pct * 3.6
  const rotate2 = pct > 50 ? (pct - 50) * 3.6 : 0
  const showRight = pct > 50

  const ringStyles = makeRingStyles(size)

  return (
    <View style={[ringStyles.container, { width: size, height: size }]}>
      {/* Track */}
      <View style={[ringStyles.track, { borderColor: colors.border, width: size, height: size, borderRadius: size / 2, borderWidth: RING_STROKE }]} />

      {/* Left half mask */}
      <View style={[ringStyles.halfWrap, ringStyles.leftWrap]}>
        <Animated.View style={[ringStyles.half, ringStyles.leftHalf, { borderColor: color, transform: [{ rotate: `${rotate1}deg` }] }]} />
      </View>

      {/* Right half (only when > 50%) */}
      {showRight && (
        <View style={[ringStyles.halfWrap, ringStyles.rightWrap]}>
          <Animated.View style={[ringStyles.half, ringStyles.rightHalf, { borderColor: color, transform: [{ rotate: `${rotate2}deg` }] }]} />
        </View>
      )}

      {/* Inner content */}
      <View style={ringStyles.inner}>
        <View style={ringStyles.innerContent} />
      </View>
    </View>
  )
}

function makeRingStyles(size: number) {
  const innerSize = size - RING_STROKE * 2 - 8
  return StyleSheet.create({
    container:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
    track:       { position: 'absolute' },
    halfWrap:    { position: 'absolute', width: size / 2, height: size, overflow: 'hidden' },
    leftWrap:    { left: 0 },
    rightWrap:   { right: 0 },
    half:        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: RING_STROKE },
    leftHalf:    { left: 0 },
    rightHalf:   { right: 0 },
    inner:       { position: 'absolute', width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    innerContent:{ width: '100%', height: '100%' },
  })
}

// ── Task picker modal ──────────────────────────────────────────
function TaskPicker({
  visible, tasks, selected, onSelect, onClose,
}: {
  visible:  boolean
  tasks:    Task[]
  selected: string | null
  onSelect: (id: string | null) => void
  onClose:  () => void
}) {
  const items = [{ id: null as string | null, title: 'No task' }, ...tasks.filter(t => !t.completed)]
  return (
    <ModalForm
      visible={visible}
      title="Select task"
      onClose={onClose}
      onSave={onClose}
      saveLabel="Done"
    >
      <FlatList
        data={items}
        keyExtractor={item => item.id ?? 'none'}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pickerRow, selected === item.id && styles.pickerRowActive]}
            onPress={() => { onSelect(item.id); onClose() }}>
            <Text style={[styles.pickerRowText, selected === item.id && styles.pickerRowTextActive]}>
              {item.id ? item.title : '\u2014 No task'}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
      />
    </ModalForm>
  )
}

// ── Main screen ────────────────────────────────────────────────
export default function TimerScreen() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const { timerRingSize } = useLayout()

  const [modeIdx,    setModeIdx]    = useState(0)
  const [running,    setRunning]    = useState(false)
  const [secsLeft,   setSecsLeft]   = useState(MODES[0].minutes * 60)
  const [taskId,     setTaskId]     = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sessions,   setSessions]   = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSecs   = MODES[modeIdx].minutes * 60
  const mode        = MODES[modeIdx]

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => apiClient.get('/tasks').then(r => r.data),
  })

  const logSession = useMutation({
    mutationFn: (data: { taskId: string | null; mode: string; durationMinutes: number }) =>
      apiClient.post('/timer/sessions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      showToast('Session logged!', 'success')
    },
    onError: () => showToast('Failed to log session', 'error'),
  })

  const pct = ((totalSecs - secsLeft) / totalSecs) * 100

  // Change mode resets timer
  const switchMode = useCallback((idx: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setModeIdx(idx)
    setSecsLeft(MODES[idx].minutes * 60)
  }, [])

  // Timer tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setRunning(false)
          // Log the session
          if (mode.key === 'focus') {
            setSessions(n => n + 1)
            logSession.mutate({ taskId, mode: 'focus', durationMinutes: mode.minutes })
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const toggle = () => setRunning(r => !r)
  const reset  = () => { if (intervalRef.current) clearInterval(intervalRef.current); setRunning(false); setSecsLeft(totalSecs) }

  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0')
  const ss = String(secsLeft % 60).padStart(2, '0')

  const selectedTask = tasks.find(t => t.id === taskId)

  return (
    <ScreenWrapper scroll>
      <View style={styles.contentAlign}>
        {/* Header */}
        <Text style={styles.pageTitle}>Pomodoro Timer</Text>
        <Text style={styles.sessionCount}>Sessions today: {sessions}</Text>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {MODES.map((m, i) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeTab, modeIdx === i && { backgroundColor: m.color + '22', borderColor: m.color }]}
              onPress={() => switchMode(i)}>
              <Text style={[styles.modeTabText, modeIdx === i && { color: m.color, fontWeight: fontWeight.semibold }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ring + time display */}
        <View style={[styles.ringWrapper, { width: timerRingSize, height: timerRingSize }]}>
          <ProgressRing pct={pct} color={mode.color} size={timerRingSize} />

          {/* Overlay time on center */}
          <View style={styles.timeOverlay} pointerEvents="none">
            <Text style={[styles.timeText, { color: mode.color }]}>{mm}:{ss}</Text>
            <Text style={styles.modeLabel}>{mode.label}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>{'\u21BA'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: mode.color }]}
            onPress={toggle}>
            <Text style={styles.startBtnText}>{running ? '\u23F8  Pause' : '\u25B6  Start'}</Text>
          </TouchableOpacity>

          <View style={{ width: 52 }} />
        </View>

        {/* Task selector */}
        <TouchableOpacity style={styles.taskSelector} onPress={() => setPickerOpen(true)}>
          <Text style={styles.taskSelectorLabel}>Focus task</Text>
          <Text style={styles.taskSelectorValue} numberOfLines={1}>
            {selectedTask ? selectedTask.title : 'Tap to select\u2026'}
          </Text>
        </TouchableOpacity>

        {/* Pomodoro tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Pomodoro technique</Text>
          <Text style={styles.tipsText}>
            1. Work focused for 25 min{'\n'}
            2. Take a 5 min break{'\n'}
            3. Every 4 sessions \u2192 long break{'\n'}
            4. Track your sessions to spot patterns
          </Text>
        </View>

        <TaskPicker
          visible={pickerOpen}
          tasks={tasks}
          selected={taskId}
          onSelect={setTaskId}
          onClose={() => setPickerOpen(false)}
        />

        <View style={{ height: spacing.xxxl }} />
      </View>
    </ScreenWrapper>
  )
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  contentAlign: { alignItems: 'center' },

  pageTitle:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1, alignSelf: 'flex-start' },
  sessionCount: { fontSize: fontSize.sm, color: colors.text3, alignSelf: 'flex-start', marginBottom: spacing.xl },

  modeTabs:    { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, alignSelf: 'stretch' },
  modeTab:     { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modeTabText: { fontSize: fontSize.xs, color: colors.text2 },

  ringWrapper:  { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  timeOverlay:  { position: 'absolute', alignItems: 'center' },
  timeText:     { fontSize: 52, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  modeLabel:    { fontSize: fontSize.sm, color: colors.text3, marginTop: spacing.xs },

  controls:    { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl, alignSelf: 'stretch', justifyContent: 'center' },
  resetBtn:    { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  resetBtnText:{ fontSize: 24, color: colors.text2 },
  startBtn:    { flex: 1, maxWidth: 200, paddingVertical: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  startBtnText:{ color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.semibold },

  taskSelector:     { alignSelf: 'stretch', backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  taskSelectorLabel:{ fontSize: fontSize.xs, color: colors.text3, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  taskSelectorValue:{ fontSize: fontSize.base, color: colors.text1 },

  tipsCard:  { alignSelf: 'stretch', backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  tipsTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text2, marginBottom: spacing.sm },
  tipsText:  { fontSize: fontSize.sm, color: colors.text3, lineHeight: 20 },

  // Task picker
  pickerRow:          { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  pickerRowActive:    { backgroundColor: colors.primaryDim },
  pickerRowText:      { fontSize: fontSize.base, color: colors.text1 },
  pickerRowTextActive:{ color: colors.primary, fontWeight: fontWeight.semibold },
})
