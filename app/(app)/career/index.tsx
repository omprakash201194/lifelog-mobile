import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import apiClient from '@/services/api'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'
import type { CareerRole, CareerSkill, CareerAchievement, CareerSalary } from '@/types/models'

type Tab = 'roles' | 'skills' | 'achievements' | 'salary'
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'roles',        label: 'Timeline',     emoji: '📅' },
  { key: 'skills',       label: 'Skills',       emoji: '🛠️' },
  { key: 'achievements', label: 'Wins',         emoji: '🏆' },
  { key: 'salary',       label: 'Salary',       emoji: '💵' },
]

const SKILL_COLORS = [colors.text3, colors.amber, colors.amber, colors.green, colors.green, colors.primary]
const SKILL_LABELS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐']

function RolesTab({ roles }: { roles: CareerRole[] }) {
  return (
    <View style={styles.timeline}>
      {roles.map((r, i) => (
        <View key={r.id} style={styles.timelineItem}>
          <View style={styles.timelineDot}>
            {r.isCurrent ? <View style={styles.timelineDotActive} /> : <View style={styles.timelineDotInner} />}
          </View>
          {i < roles.length - 1 && <View style={styles.timelineLine} />}
          <View style={styles.timelineContent}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleTitle}>{r.title}</Text>
              {r.isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>}
            </View>
            <Text style={styles.roleCompany}>{r.company}</Text>
            <Text style={styles.roleDates}>{r.startDate} – {r.isCurrent ? 'Present' : r.endDate}</Text>
            {r.highlights ? <Text style={styles.roleHighlights}>{r.highlights}</Text> : null}
            {r.techTags ? (
              <View style={styles.tagRow}>
                {r.techTags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

function SkillsTab({ skills }: { skills: CareerSkill[] }) {
  const byCategory = skills.reduce<Record<string, CareerSkill[]>>((acc, s) => {
    ;(acc[s.category] = acc[s.category] || []).push(s)
    return acc
  }, {})
  return (
    <View style={{ gap: spacing.lg }}>
      {Object.entries(byCategory).map(([cat, items]) => (
        <View key={cat}>
          <Text style={styles.sectionLabel}>{cat}</Text>
          <View style={styles.skillsGrid}>
            {items.map(s => (
              <View key={s.id} style={styles.skillChip}>
                <Text style={styles.skillName}>{s.name}</Text>
                <Text style={{ fontSize: fontSize.xxs, color: SKILL_COLORS[s.level] }}>{SKILL_LABELS[s.level]}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

function AchievementsTab({ achievements }: { achievements: CareerAchievement[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {achievements.map(a => (
        <View key={a.id} style={styles.achCard}>
          <View style={styles.achHeader}>
            <Text style={styles.achTitle}>{a.title}</Text>
            <Text style={styles.achDate}>{a.achDate?.slice(0, 7)}</Text>
          </View>
          <View style={styles.achTag}><Text style={styles.achTagText}>{a.category}</Text></View>
          {a.impact ? <Text style={styles.achImpact}>{a.impact}</Text> : null}
        </View>
      ))}
    </View>
  )
}

function SalaryTab({ salaries }: { salaries: CareerSalary[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {salaries.map(s => (
        <View key={s.id} style={styles.salaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.salaryRole}>{s.role}</Text>
            <Text style={styles.salaryCompany}>{s.company} · {s.years}</Text>
          </View>
          <Text style={styles.salaryAmount}>£{s.salary.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  )
}

export default function CareerScreen() {
  const router = useRouter()
  const qc     = useQueryClient()
  const [tab, setTab] = useState<Tab>('roles')

  const roles = useQuery<CareerRole[]>({ queryKey: ['career', 'roles'], queryFn: () => apiClient.get('/career/roles').then(r => r.data) })
  const skills = useQuery<CareerSkill[]>({ queryKey: ['career', 'skills'], queryFn: () => apiClient.get('/career/skills').then(r => r.data) })
  const achievements = useQuery<CareerAchievement[]>({ queryKey: ['career', 'achievements'], queryFn: () => apiClient.get('/career/achievements').then(r => r.data) })
  const salary = useQuery<CareerSalary[]>({ queryKey: ['career', 'salary'], queryFn: () => apiClient.get('/career/salaries').then(r => r.data) })

  const isLoading = roles.isLoading || skills.isLoading || achievements.isLoading || salary.isLoading
  const refetch = () => { roles.refetch(); skills.refetch(); achievements.refetch(); salary.refetch() }
  const isFetching = roles.isFetching || skills.isFetching

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.pageTitle}>Career</Text>
          <Text style={styles.pageSubtitle}>{roles.data?.length ?? 0} roles · {skills.data?.length ?? 0} skills</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
              <Text style={[styles.tabText, tab === t.key && styles.tabActiveText]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />}

        {tab === 'roles'        && <RolesTab roles={roles.data ?? []} />}
        {tab === 'skills'       && <SkillsTab skills={skills.data ?? []} />}
        {tab === 'achievements' && <AchievementsTab achievements={achievements.data ?? []} />}
        {tab === 'salary'       && <SalaryTab salaries={salary.data ?? []} />}

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
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 2 },
  tabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { fontSize: fontSize.xxs, color: colors.text3 },
  tabActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xxl },
  timelineDot: { width: 16, alignItems: 'center', paddingTop: 4 },
  timelineDotActive: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.primaryDim },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  timelineLine: { position: 'absolute', left: 7, top: 18, bottom: 0, width: 2, backgroundColor: colors.border },
  timelineContent: { flex: 1, gap: spacing.xs },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text1, flex: 1 },
  currentBadge: { backgroundColor: colors.primaryDim, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: colors.primary },
  currentBadgeText: { fontSize: fontSize.xxs, color: colors.primary, fontWeight: fontWeight.semibold },
  roleCompany: { fontSize: fontSize.sm, color: colors.text2 },
  roleDates: { fontSize: fontSize.xs, color: colors.text3 },
  roleHighlights: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontSize: fontSize.xxs, color: colors.text3 },
  // Skills
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillChip: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', gap: 2 },
  skillName: { fontSize: fontSize.sm, color: colors.text1, fontWeight: fontWeight.medium },
  // Achievements
  achCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  achHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  achTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1, flex: 1 },
  achDate: { fontSize: fontSize.xs, color: colors.text3 },
  achTag: { backgroundColor: colors.bgDeep, alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  achTagText: { fontSize: fontSize.xxs, color: colors.text3 },
  achImpact: { fontSize: fontSize.sm, color: colors.text2, lineHeight: 18 },
  // Salary
  salaryRow: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  salaryRole: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  salaryCompany: { fontSize: fontSize.xs, color: colors.text3 },
  salaryAmount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.green },
})
