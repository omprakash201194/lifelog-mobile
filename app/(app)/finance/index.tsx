import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { formatCurrency } from '@/lib/currency'
import { usePreferences } from '@/contexts/PreferencesContext'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { Asset, Liability, NetWorthData, FinGoal } from '@/types/models'

const PRIORITY_COLOR = { high: colors.rose, medium: colors.amber, low: colors.green }

export default function FinanceScreen() {
  const router     = useRouter()
  const qc         = useQueryClient()
  const { currency } = usePreferences()
  const [tab, setTab] = useState<'overview' | 'assets' | 'liabilities' | 'goals'>('overview')

  const nw      = useQuery<NetWorthData>({ queryKey: ['finance', 'networth'],    queryFn: () => apiClient.get('/finance/net-worth').then(r => r.data) })
  const assets  = useQuery<Asset[]>     ({ queryKey: ['finance', 'assets'],      queryFn: () => apiClient.get('/finance/assets').then(r => r.data) })
  const liabs   = useQuery<Liability[]> ({ queryKey: ['finance', 'liabilities'], queryFn: () => apiClient.get('/finance/liabilities').then(r => r.data) })
  const goals   = useQuery<FinGoal[]>   ({ queryKey: ['finance', 'goals'],       queryFn: () => apiClient.get('/finance/goals').then(r => r.data) })

  const isLoading = nw.isLoading || assets.isLoading || liabs.isLoading || goals.isLoading
  const refetch = () => { nw.refetch(); assets.refetch(); liabs.refetch(); goals.refetch() }
  const isFetching = nw.isFetching || assets.isFetching

  const fmt = (n: number) => formatCurrency(n, currency, true)

  const TABS = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'assets' as const, label: '💰 Assets' },
    { key: 'liabilities' as const, label: '📉 Debts' },
    { key: 'goals' as const, label: '🎯 Goals' },
  ]

  const byCategory = <T extends { category: string }>(items: T[]) =>
    items.reduce<Record<string, T[]>>((acc, x) => { (acc[x.category] = acc[x.category] || []).push(x); return acc }, {})

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.pageTitle}>Finance</Text>
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
          {TABS.map(t => (
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
                      <View>
                        <Text style={styles.lineLabel}>{a.name}</Text>
                        {a.notes ? <Text style={styles.lineSub}>{a.notes}</Text> : null}
                      </View>
                      <Text style={[styles.lineValue, { color: colors.green }]}>{fmt(a.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
                      <View>
                        <Text style={styles.lineLabel}>{l.name}</Text>
                        <Text style={styles.lineSub}>{l.rate}% · {fmt(l.monthly)}/mo</Text>
                      </View>
                      <Text style={[styles.lineValue, { color: colors.rose }]}>{fmt(l.balance)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
                      <Text style={styles.goalDeadline}>{g.deadline} · {fmt(g.monthly)}/mo</Text>
                    </View>
                    <View style={[styles.priorityBadge, { borderColor: color }]}>
                      <Text style={[styles.priorityText, { color }]}>{g.priority}</Text>
                    </View>
                  </View>
                  <View style={styles.goalProgress}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={styles.goalPct}>{fmt(g.saved)} / {fmt(g.target)} ({pct}%)</Text>
                  </View>
                </View>
              )
            })}
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
  pageTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },
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
})
