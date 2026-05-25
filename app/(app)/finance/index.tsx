import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { formatCurrency } from '@/lib/currency'
import { usePreferences } from '@/contexts/PreferencesContext'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import ScreenWrapper from '@/components/ScreenWrapper'
import ModalForm from '@/components/ModalForm'
import FormField from '@/components/FormField'
import { useToast } from '@/contexts/ToastContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { confirmAction } from '@/components/ConfirmDialog'
import type { Asset, Liability, NetWorthData, FinGoal } from '@/types/models'

const PRIORITY_COLOR = { high: colors.rose, medium: colors.amber, low: colors.green }

// ── Form types ───────────────────────────────────────────────────
interface AssetForm { category: string; name: string; value: string; acquired: string; notes: string }
const blankAsset = (): AssetForm => ({ category: 'cash', name: '', value: '', acquired: '', notes: '' })
function assetToForm(a: Asset): AssetForm {
  return { category: a.category, name: a.name, value: String(a.value), acquired: a.acquired ?? '', notes: a.notes ?? '' }
}

interface LiabForm { category: string; name: string; balance: string; rate: string; monthly: string; notes: string }
const blankLiab = (): LiabForm => ({ category: 'loan', name: '', balance: '', rate: '', monthly: '', notes: '' })
function liabToForm(l: Liability): LiabForm {
  return { category: l.category, name: l.name, balance: String(l.balance), rate: String(l.rate), monthly: String(l.monthly), notes: l.notes ?? '' }
}

interface GoalForm { emoji: string; name: string; target: string; saved: string; monthly: string; deadline: string; category: string; priority: 'high' | 'medium' | 'low'; notes: string }
const blankGoal = (): GoalForm => ({ emoji: '\u{1F3AF}', name: '', target: '', saved: '', monthly: '', deadline: '', category: 'savings', priority: 'medium', notes: '' })
function goalToForm(g: FinGoal): GoalForm {
  return { emoji: g.emoji, name: g.name, target: String(g.target), saved: String(g.saved), monthly: String(g.monthly), deadline: g.deadline, category: g.category, priority: g.priority, notes: g.notes ?? '' }
}

const ASSET_CATS = ['cash', 'investment', 'property', 'crypto', 'retirement', 'other']
const LIAB_CATS = ['mortgage', 'loan', 'credit-card', 'student-loan', 'other']
const GOAL_CATS = ['savings', 'investment', 'debt-payoff', 'purchase', 'emergency', 'other']

type ActiveTab = 'overview' | 'assets' | 'liabilities' | 'goals'
type ModalType = 'asset' | 'liability' | 'goal' | null

export default function FinanceScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { currency } = usePreferences()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [tab, setTab] = useState<ActiveTab>('overview')

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiab, setEditingLiab] = useState<Liability | null>(null)
  const [editingGoal, setEditingGoal] = useState<FinGoal | null>(null)

  const [assetForm, setAssetForm] = useState<AssetForm>(blankAsset)
  const [liabForm, setLiabForm] = useState<LiabForm>(blankLiab)
  const [goalForm, setGoalForm] = useState<GoalForm>(blankGoal)

  useEffect(() => {
    if (!modalType) return
    if (modalType === 'asset') setAssetForm(editingAsset ? assetToForm(editingAsset) : blankAsset())
    if (modalType === 'liability') setLiabForm(editingLiab ? liabToForm(editingLiab) : blankLiab())
    if (modalType === 'goal') setGoalForm(editingGoal ? goalToForm(editingGoal) : blankGoal())
  }, [modalType, editingAsset, editingLiab, editingGoal])

  const openCreate = () => {
    setEditingAsset(null); setEditingLiab(null); setEditingGoal(null)
    if (tab === 'assets') setModalType('asset')
    else if (tab === 'liabilities') setModalType('liability')
    else if (tab === 'goals') setModalType('goal')
    else setModalType('asset') // default from overview
  }

  // Queries
  const nw = useQuery<NetWorthData>({ queryKey: ['finance', 'networth'], queryFn: () => apiClient.get('/finance/net-worth').then(r => r.data) })
  const assets = useQuery<Asset[]>({ queryKey: ['finance', 'assets'], queryFn: () => apiClient.get('/finance/assets').then(r => r.data) })
  const liabs = useQuery<Liability[]>({ queryKey: ['finance', 'liabilities'], queryFn: () => apiClient.get('/finance/liabilities').then(r => r.data) })
  const goals = useQuery<FinGoal[]>({ queryKey: ['finance', 'goals'], queryFn: () => apiClient.get('/finance/goals').then(r => r.data) })

  const isLoading = nw.isLoading || assets.isLoading || liabs.isLoading || goals.isLoading
  const refetchAll = () => { nw.refetch(); assets.refetch(); liabs.refetch(); goals.refetch() }
  const isFetching = nw.isFetching || assets.isFetching

  const fmt = (n: number) => formatCurrency(n, currency, true)

  // Mutations
  const saveAsset = useMutation({
    mutationFn: (d: AssetForm) => {
      const payload = { ...d, value: parseFloat(d.value) || 0 }
      return editingAsset ? apiClient.put(`/finance/assets/${editingAsset.id}`, payload) : apiClient.post('/finance/assets', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); setModalType(null); showToast(editingAsset ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save asset', 'error'),
  })
  const deleteAsset = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/finance/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })
  const saveLiab = useMutation({
    mutationFn: (d: LiabForm) => {
      const payload = { ...d, balance: parseFloat(d.balance) || 0, rate: parseFloat(d.rate) || 0, monthly: parseFloat(d.monthly) || 0 }
      return editingLiab ? apiClient.put(`/finance/liabilities/${editingLiab.id}`, payload) : apiClient.post('/finance/liabilities', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); setModalType(null); showToast(editingLiab ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save liability', 'error'),
  })
  const deleteLiab = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/finance/liabilities/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })
  const saveGoalMut = useMutation({
    mutationFn: (d: GoalForm) => {
      const payload = { ...d, target: parseFloat(d.target) || 0, saved: parseFloat(d.saved) || 0, monthly: parseFloat(d.monthly) || 0 }
      return editingGoal ? apiClient.put(`/finance/goals/${editingGoal.id}`, payload) : apiClient.post('/finance/goals', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); setModalType(null); showToast(editingGoal ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save goal', 'error'),
  })
  const deleteGoalMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/finance/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleSave = () => {
    if (modalType === 'asset' && assetForm.value && isNaN(Number(assetForm.value))) {
      showToast('Please enter valid numbers', 'error'); return
    }
    if (modalType === 'liability') {
      const nums = [liabForm.balance, liabForm.rate, liabForm.monthly].filter(v => v)
      if (nums.some(v => isNaN(Number(v)))) { showToast('Please enter valid numbers', 'error'); return }
    }
    if (modalType === 'goal') {
      const nums = [goalForm.target, goalForm.saved, goalForm.monthly].filter(v => v)
      if (nums.some(v => isNaN(Number(v)))) { showToast('Please enter valid numbers', 'error'); return }
    }
    if (modalType === 'asset') saveAsset.mutate(assetForm)
    else if (modalType === 'liability') saveLiab.mutate(liabForm)
    else if (modalType === 'goal') saveGoalMut.mutate(goalForm)
  }

  const isSaving = saveAsset.isPending || saveLiab.isPending || saveGoalMut.isPending

  const modalTitle = () => {
    if (modalType === 'asset') return editingAsset ? 'Edit Asset' : 'Add Asset'
    if (modalType === 'liability') return editingLiab ? 'Edit Liability' : 'Add Liability'
    if (modalType === 'goal') return editingGoal ? 'Edit Goal' : 'Add Goal'
    return ''
  }

  const TAB_ITEMS = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'assets' as const, label: '\u{1F4B0} Assets' },
    { key: 'liabilities' as const, label: '\u{1F4C9} Debts' },
    { key: 'goals' as const, label: '\u{1F3AF} Goals' },
  ]

  const byCategory = <T extends { category: string }>(items: T[]) =>
    items.reduce<Record<string, T[]>>((acc, x) => { (acc[x.category] = acc[x.category] || []).push(x); return acc }, {})

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetchAll}>
      <ModalForm
        visible={!!modalType}
        title={modalTitle()}
        onClose={() => setModalType(null)}
        onSave={handleSave}
        saving={isSaving}
        disabled={isOffline || (modalType === 'asset' && !assetForm.name.trim()) || (modalType === 'liability' && !liabForm.name.trim()) || (modalType === 'goal' && !goalForm.name.trim())}
      >
        {modalType === 'asset' && (
          <>
            <FormField label="Name *" value={assetForm.name} onChangeText={t => setAssetForm(f => ({ ...f, name: t }))} placeholder="Savings account" maxLength={100} />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {ASSET_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, assetForm.category === c && styles.chipActive]} onPress={() => setAssetForm(f => ({ ...f, category: c }))}>
                  <Text style={[styles.chipText, assetForm.category === c && styles.chipActiveText]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormField label="Value" value={assetForm.value} onChangeText={t => setAssetForm(f => ({ ...f, value: t }))} keyboardType="numeric" placeholder="0" />
            <FormField label="Acquired" optional value={assetForm.acquired} onChangeText={t => setAssetForm(f => ({ ...f, acquired: t }))} placeholder="YYYY-MM-DD" />
            <FormField label="Notes" optional value={assetForm.notes} onChangeText={t => setAssetForm(f => ({ ...f, notes: t }))} multiline numberOfLines={2} maxLength={2000} />
          </>
        )}
        {modalType === 'liability' && (
          <>
            <FormField label="Name *" value={liabForm.name} onChangeText={t => setLiabForm(f => ({ ...f, name: t }))} placeholder="Car loan" maxLength={100} />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {LIAB_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, liabForm.category === c && styles.chipActive]} onPress={() => setLiabForm(f => ({ ...f, category: c }))}>
                  <Text style={[styles.chipText, liabForm.category === c && styles.chipActiveText]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormField label="Balance" value={liabForm.balance} onChangeText={t => setLiabForm(f => ({ ...f, balance: t }))} keyboardType="numeric" placeholder="0" />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField label="Rate (%)" value={liabForm.rate} onChangeText={t => setLiabForm(f => ({ ...f, rate: t }))} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Monthly" value={liabForm.monthly} onChangeText={t => setLiabForm(f => ({ ...f, monthly: t }))} keyboardType="numeric" placeholder="0" />
              </View>
            </View>
            <FormField label="Notes" optional value={liabForm.notes} onChangeText={t => setLiabForm(f => ({ ...f, notes: t }))} multiline numberOfLines={2} maxLength={2000} />
          </>
        )}
        {modalType === 'goal' && (
          <>
            <View style={styles.row2}>
              <View style={{ width: 60 }}>
                <FormField label="Emoji" value={goalForm.emoji} onChangeText={t => setGoalForm(f => ({ ...f, emoji: t }))} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Name *" value={goalForm.name} onChangeText={t => setGoalForm(f => ({ ...f, name: t }))} placeholder="Emergency fund" maxLength={100} />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField label="Target" value={goalForm.target} onChangeText={t => setGoalForm(f => ({ ...f, target: t }))} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Saved" value={goalForm.saved} onChangeText={t => setGoalForm(f => ({ ...f, saved: t }))} keyboardType="numeric" placeholder="0" />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField label="Monthly" value={goalForm.monthly} onChangeText={t => setGoalForm(f => ({ ...f, monthly: t }))} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Deadline" value={goalForm.deadline} onChangeText={t => setGoalForm(f => ({ ...f, deadline: t }))} placeholder="YYYY-MM" />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {GOAL_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, goalForm.category === c && styles.chipActive]} onPress={() => setGoalForm(f => ({ ...f, category: c }))}>
                  <Text style={[styles.chipText, goalForm.category === c && styles.chipActiveText]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {(['high', 'medium', 'low'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.chip, goalForm.priority === p && styles.chipActive]} onPress={() => setGoalForm(f => ({ ...f, priority: p }))}>
                  <Text style={[styles.chipText, goalForm.priority === p && styles.chipActiveText]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormField label="Notes" optional value={goalForm.notes} onChangeText={t => setGoalForm(f => ({ ...f, notes: t }))} multiline numberOfLines={2} maxLength={2000} />
          </>
        )}
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Finance</Text>
          {tab !== 'overview' && (
            <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new entry">
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Net Worth Hero */}
      {nw.data && (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Net Worth</Text>
          <Text style={[styles.heroValue, { color: nw.data.netWorth >= 0 ? colors.green : colors.rose }]}>
            {fmt(nw.data.netWorth)}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Assets</Text>
              <Text style={[styles.heroStatValue, { color: colors.green }]}>{fmt(nw.data.totalAssets)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Liabilities</Text>
              <Text style={[styles.heroStatValue, { color: colors.rose }]}>{fmt(nw.data.totalLiabilities)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {TAB_ITEMS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabActiveText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}

      {/* Overview */}
      {tab === 'overview' && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>Top Assets</Text>
          {(assets.data ?? []).slice(0, 5).map(a => (
            <View key={a.id} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{a.name}</Text>
              <Text style={[styles.lineValue, { color: colors.green }]}>{fmt(a.value)}</Text>
            </View>
          ))}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Top Liabilities</Text>
          {(liabs.data ?? []).slice(0, 5).map(l => (
            <View key={l.id} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{l.name}</Text>
              <Text style={[styles.lineValue, { color: colors.rose }]}>{fmt(l.balance)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Assets by category */}
      {tab === 'assets' && (
        <View style={{ gap: spacing.lg }}>
          {Object.entries(byCategory(assets.data ?? [])).map(([cat, items]) => (
            <View key={cat}>
              <Text style={styles.sectionLabel}>{cat}</Text>
              <View style={styles.card}>
                {items.map(a => (
                  <View key={a.id} style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineLabel}>{a.name}</Text>
                      {a.notes ? <Text style={styles.lineSub}>{a.notes}</Text> : null}
                    </View>
                    <Text style={[styles.lineValue, { color: colors.green }]}>{fmt(a.value)}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm }}>
                      <TouchableOpacity onPress={() => { setEditingAsset(a); setModalType('asset') }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                        <Text style={styles.editIcon}>{'\u270E'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmAction({ message: `Delete "${a.name}"?`, onConfirm: () => deleteAsset.mutate(a.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                        <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {(assets.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F4B0}'}</Text>
              <Text style={styles.emptyTitle}>No assets yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first assets</Text>
            </View>
          )}
        </View>
      )}

      {/* Liabilities by category */}
      {tab === 'liabilities' && (
        <View style={{ gap: spacing.lg }}>
          {Object.entries(byCategory(liabs.data ?? [])).map(([cat, items]) => (
            <View key={cat}>
              <Text style={styles.sectionLabel}>{cat}</Text>
              <View style={styles.card}>
                {items.map(l => (
                  <View key={l.id} style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineLabel}>{l.name}</Text>
                      <Text style={styles.lineSub}>{l.rate}% {'\u00B7'} {fmt(l.monthly)}/mo</Text>
                    </View>
                    <Text style={[styles.lineValue, { color: colors.rose }]}>{fmt(l.balance)}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm }}>
                      <TouchableOpacity onPress={() => { setEditingLiab(l); setModalType('liability') }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                        <Text style={styles.editIcon}>{'\u270E'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmAction({ message: `Delete "${l.name}"?`, onConfirm: () => deleteLiab.mutate(l.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                        <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {(liabs.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F4C9}'}</Text>
              <Text style={styles.emptyTitle}>No liabilities yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first liabilities</Text>
            </View>
          )}
        </View>
      )}

      {/* Financial goals */}
      {tab === 'goals' && (
        <View style={{ gap: spacing.sm }}>
          {(goals.data ?? []).sort((a, b) => {
            const p = { high: 0, medium: 1, low: 2 }
            return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
          }).map(g => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
            const color = PRIORITY_COLOR[g.priority] ?? colors.text3
            return (
              <View key={g.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalEmoji}>{g.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>{g.name}</Text>
                    <Text style={styles.goalDeadline}>{g.deadline} {'\u00B7'} {fmt(g.monthly)}/mo</Text>
                  </View>
                  <View style={[styles.priorityBadge, { borderColor: color }]}>
                    <Text style={[styles.priorityText, { color }]}>{g.priority}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm }}>
                    <TouchableOpacity onPress={() => { setEditingGoal(g); setModalType('goal') }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                      <Text style={styles.editIcon}>{'\u270E'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmAction({ message: `Delete "${g.name}"?`, onConfirm: () => deleteGoalMut.mutate(g.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                      <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.goalProgress}>
                  <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={styles.goalPct}>{fmt(g.saved)} / {fmt(g.target)} ({pct}%)</Text>
                </View>
              </View>
            )
          })}
          {(goals.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F3AF}'}</Text>
              <Text style={styles.emptyTitle}>No goals yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first goals</Text>
            </View>
          )}
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
  addBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  btnDisabled: { opacity: 0.4 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  heroCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg, alignItems: 'center', gap: spacing.sm },
  heroLabel: { fontSize: fontSize.xs, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue: { fontSize: fontSize.hero, fontWeight: fontWeight.bold },
  heroRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  heroStat: { alignItems: 'center' },
  heroStatLabel: { fontSize: fontSize.xs, color: colors.text3 },
  heroStatValue: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold },
  heroStatDivider: { width: 1, backgroundColor: colors.border },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { fontSize: fontSize.xxs, color: colors.text3 },
  tabActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineLabel: { fontSize: fontSize.base, color: colors.text1 },
  lineSub: { fontSize: fontSize.xs, color: colors.text3 },
  lineValue: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  goalCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalEmoji: { fontSize: 24 },
  goalName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  goalDeadline: { fontSize: fontSize.xs, color: colors.text3 },
  priorityBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  priorityText: { fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  goalProgress: { gap: spacing.xs },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  goalPct: { fontSize: fontSize.xs, color: colors.text3 },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Empty states
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
})
