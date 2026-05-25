import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
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
import type { CareerRole, CareerSkill, CareerAchievement, CareerSalary } from '@/types/models'

type Tab = 'roles' | 'skills' | 'achievements' | 'salary'
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'roles', label: 'Timeline', emoji: '\u{1F4C5}' },
  { key: 'skills', label: 'Skills', emoji: '\u{1F6E0}\uFE0F' },
  { key: 'achievements', label: 'Wins', emoji: '\u{1F3C6}' },
  { key: 'salary', label: 'Salary', emoji: '\u{1F4B5}' },
]

const SKILL_COLORS = [colors.text3, colors.amber, colors.amber, colors.green, colors.green, colors.primary]
const SKILL_LABELS = ['', '\u2B50', '\u2B50\u2B50', '\u2B50\u2B50\u2B50', '\u2B50\u2B50\u2B50\u2B50', '\u2B50\u2B50\u2B50\u2B50\u2B50']

// ── Role form ────────────────────────────────────────────────────
interface RoleForm { title: string; company: string; startDate: string; endDate: string; isCurrent: boolean; highlights: string; techTags: string }
const blankRole = (): RoleForm => ({ title: '', company: '', startDate: new Date().toISOString().split('T')[0], endDate: '', isCurrent: false, highlights: '', techTags: '' })
function roleToForm(r: CareerRole): RoleForm {
  return { title: r.title, company: r.company, startDate: r.startDate, endDate: r.endDate ?? '', isCurrent: r.isCurrent, highlights: r.highlights ?? '', techTags: r.techTags ?? '' }
}

// ── Skill form ───────────────────────────────────────────────────
interface SkillForm { name: string; level: number; category: string }
const blankSkill = (): SkillForm => ({ name: '', level: 3, category: 'technical' })
function skillToForm(s: CareerSkill): SkillForm {
  return { name: s.name, level: s.level, category: s.category }
}

// ── Achievement form ─────────────────────────────────────────────
interface AchForm { title: string; achDate: string; impact: string; category: string }
const blankAch = (): AchForm => ({ title: '', achDate: new Date().toISOString().split('T')[0], impact: '', category: 'work' })
function achToForm(a: CareerAchievement): AchForm {
  return { title: a.title, achDate: a.achDate ?? '', impact: a.impact ?? '', category: a.category }
}

// ── Salary form ──────────────────────────────────────────────────
interface SalaryForm { role: string; company: string; years: string; salary: string }
const blankSalary = (): SalaryForm => ({ role: '', company: '', years: '', salary: '' })
function salaryToForm(s: CareerSalary): SalaryForm {
  return { role: s.role, company: s.company, years: s.years, salary: String(s.salary) }
}

const SKILL_CATS = ['technical', 'soft', 'tools', 'languages', 'frameworks', 'other']
const ACH_CATS = ['work', 'certification', 'award', 'open-source', 'speaking', 'other']

export default function CareerScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { isOffline } = useNetworkStatus()
  const [tab, setTab] = useState<Tab>('roles')

  // ── Modal state ────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<CareerRole | null>(null)
  const [editingSkill, setEditingSkill] = useState<CareerSkill | null>(null)
  const [editingAch, setEditingAch] = useState<CareerAchievement | null>(null)
  const [editingSalary, setEditingSalary] = useState<CareerSalary | null>(null)

  const [roleForm, setRoleForm] = useState<RoleForm>(blankRole)
  const [skillForm, setSkillForm] = useState<SkillForm>(blankSkill)
  const [achForm, setAchForm] = useState<AchForm>(blankAch)
  const [salaryForm, setSalaryForm] = useState<SalaryForm>(blankSalary)

  useEffect(() => {
    if (!modalVisible) return
    if (tab === 'roles') setRoleForm(editingRole ? roleToForm(editingRole) : blankRole())
    if (tab === 'skills') setSkillForm(editingSkill ? skillToForm(editingSkill) : blankSkill())
    if (tab === 'achievements') setAchForm(editingAch ? achToForm(editingAch) : blankAch())
    if (tab === 'salary') setSalaryForm(editingSalary ? salaryToForm(editingSalary) : blankSalary())
  }, [modalVisible, editingRole, editingSkill, editingAch, editingSalary])

  const openCreate = () => {
    setEditingRole(null); setEditingSkill(null); setEditingAch(null); setEditingSalary(null)
    setModalVisible(true)
  }

  // ── Queries ────────────────────────────────────────────────
  const roles = useQuery<CareerRole[]>({ queryKey: ['career', 'roles'], queryFn: () => apiClient.get('/career/roles').then(r => r.data) })
  const skills = useQuery<CareerSkill[]>({ queryKey: ['career', 'skills'], queryFn: () => apiClient.get('/career/skills').then(r => r.data) })
  const achievements = useQuery<CareerAchievement[]>({ queryKey: ['career', 'achievements'], queryFn: () => apiClient.get('/career/achievements').then(r => r.data) })
  const salary = useQuery<CareerSalary[]>({ queryKey: ['career', 'salary'], queryFn: () => apiClient.get('/career/salaries').then(r => r.data) })

  const isLoading = roles.isLoading || skills.isLoading || achievements.isLoading || salary.isLoading
  const refetchAll = () => { roles.refetch(); skills.refetch(); achievements.refetch(); salary.refetch() }
  const isFetching = roles.isFetching || skills.isFetching

  // ── Mutations ──────────────────────────────────────────────
  const saveRole = useMutation({
    mutationFn: (d: RoleForm) => editingRole
      ? apiClient.put(`/career/roles/${editingRole.id}`, d)
      : apiClient.post('/career/roles', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'roles'] }); setModalVisible(false); showToast(editingRole ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save role', 'error'),
  })
  const deleteRole = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/career/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'roles'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })
  const saveSkill = useMutation({
    mutationFn: (d: SkillForm) => editingSkill
      ? apiClient.put(`/career/skills/${editingSkill.id}`, d)
      : apiClient.post('/career/skills', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'skills'] }); setModalVisible(false); showToast(editingSkill ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save skill', 'error'),
  })
  const deleteSkill = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/career/skills/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'skills'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })
  const saveAch = useMutation({
    mutationFn: (d: AchForm) => editingAch
      ? apiClient.put(`/career/achievements/${editingAch.id}`, d)
      : apiClient.post('/career/achievements', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'achievements'] }); setModalVisible(false); showToast(editingAch ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save achievement', 'error'),
  })
  const deleteAch = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/career/achievements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'achievements'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })
  const saveSalary = useMutation({
    mutationFn: (d: SalaryForm) => {
      const payload = { ...d, salary: parseFloat(d.salary) || 0 }
      return editingSalary
        ? apiClient.put(`/career/salary/${editingSalary.id}`, payload)
        : apiClient.post('/career/salary', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'salary'] }); setModalVisible(false); showToast(editingSalary ? 'Updated!' : 'Created!', 'success') },
    onError: () => showToast('Failed to save salary', 'error'),
  })
  const deleteSalaryMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/career/salary/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['career', 'salary'] }); showToast('Deleted!', 'success') },
    onError: () => showToast('Failed to delete', 'error'),
  })

  const handleSave = () => {
    if (tab === 'salary' && salaryForm.salary && isNaN(Number(salaryForm.salary))) {
      showToast('Please enter valid numbers', 'error')
      return
    }
    if (tab === 'roles') saveRole.mutate(roleForm)
    if (tab === 'skills') saveSkill.mutate(skillForm)
    if (tab === 'achievements') saveAch.mutate(achForm)
    if (tab === 'salary') saveSalary.mutate(salaryForm)
  }

  const isSaving = saveRole.isPending || saveSkill.isPending || saveAch.isPending || saveSalary.isPending

  const modalTitle = () => {
    const editing = tab === 'roles' ? editingRole : tab === 'skills' ? editingSkill : tab === 'achievements' ? editingAch : editingSalary
    const prefix = editing ? 'Edit' : 'Add'
    const noun = tab === 'roles' ? 'Role' : tab === 'skills' ? 'Skill' : tab === 'achievements' ? 'Achievement' : 'Salary'
    return `${prefix} ${noun}`
  }

  return (
    <ScreenWrapper scroll refreshing={isFetching} onRefresh={refetchAll}>
      <ModalForm
        visible={modalVisible}
        title={modalTitle()}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={isSaving}
        disabled={isOffline || (tab === 'roles' && !roleForm.title.trim()) || (tab === 'skills' && !skillForm.name.trim()) || (tab === 'achievements' && !achForm.title.trim()) || (tab === 'salary' && !salaryForm.role.trim())}
      >
        {tab === 'roles' && (
          <>
            <FormField label="Title *" value={roleForm.title} onChangeText={t => setRoleForm(f => ({ ...f, title: t }))} placeholder="Software Engineer" maxLength={100} />
            <FormField label="Company *" value={roleForm.company} onChangeText={t => setRoleForm(f => ({ ...f, company: t }))} placeholder="Acme Inc." maxLength={100} />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField label="Start date" value={roleForm.startDate} onChangeText={t => setRoleForm(f => ({ ...f, startDate: t }))} placeholder="YYYY-MM" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="End date" value={roleForm.endDate} onChangeText={t => setRoleForm(f => ({ ...f, endDate: t }))} placeholder="YYYY-MM" />
              </View>
            </View>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setRoleForm(f => ({ ...f, isCurrent: !f.isCurrent }))} accessibilityRole="checkbox" accessibilityState={{ checked: roleForm.isCurrent }}>
              <View style={[styles.checkbox, roleForm.isCurrent && styles.checkboxActive]}>
                {roleForm.isCurrent && <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>{'\u2713'}</Text>}
              </View>
              <Text style={styles.toggleLabel}>Current role</Text>
            </TouchableOpacity>
            <FormField label="Highlights" optional value={roleForm.highlights} onChangeText={t => setRoleForm(f => ({ ...f, highlights: t }))} multiline numberOfLines={3} maxLength={2000} />
            <FormField label="Tech tags (comma-separated)" optional value={roleForm.techTags} onChangeText={t => setRoleForm(f => ({ ...f, techTags: t }))} placeholder="React, Node.js, AWS" maxLength={200} />
          </>
        )}
        {tab === 'skills' && (
          <>
            <FormField label="Skill name *" value={skillForm.name} onChangeText={t => setSkillForm(f => ({ ...f, name: t }))} placeholder="TypeScript" maxLength={100} />
            <Text style={styles.fieldLabel}>Level</Text>
            <View style={styles.levelRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} style={[styles.levelBtn, skillForm.level === n && styles.levelActive]} onPress={() => setSkillForm(f => ({ ...f, level: n }))}>
                  <Text style={{ fontSize: fontSize.sm, color: skillForm.level === n ? colors.primary : colors.text3 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {SKILL_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, skillForm.category === c && styles.chipActive]} onPress={() => setSkillForm(f => ({ ...f, category: c }))}>
                  <Text style={[styles.chipText, skillForm.category === c && styles.chipActiveText]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {tab === 'achievements' && (
          <>
            <FormField label="Title *" value={achForm.title} onChangeText={t => setAchForm(f => ({ ...f, title: t }))} placeholder="Led migration to microservices" maxLength={100} />
            <FormField label="Date" value={achForm.achDate} onChangeText={t => setAchForm(f => ({ ...f, achDate: t }))} placeholder="YYYY-MM-DD" />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {ACH_CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, achForm.category === c && styles.chipActive]} onPress={() => setAchForm(f => ({ ...f, category: c }))}>
                  <Text style={[styles.chipText, achForm.category === c && styles.chipActiveText]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormField label="Impact" optional value={achForm.impact} onChangeText={t => setAchForm(f => ({ ...f, impact: t }))} multiline numberOfLines={3} placeholder="Describe the impact..." maxLength={2000} />
          </>
        )}
        {tab === 'salary' && (
          <>
            <FormField label="Role *" value={salaryForm.role} onChangeText={t => setSalaryForm(f => ({ ...f, role: t }))} placeholder="Senior Engineer" maxLength={100} />
            <FormField label="Company *" value={salaryForm.company} onChangeText={t => setSalaryForm(f => ({ ...f, company: t }))} placeholder="Acme Inc." maxLength={100} />
            <FormField label="Years" value={salaryForm.years} onChangeText={t => setSalaryForm(f => ({ ...f, years: t }))} placeholder="2023-2024" maxLength={50} />
            <FormField label="Salary" value={salaryForm.salary} onChangeText={t => setSalaryForm(f => ({ ...f, salary: t }))} keyboardType="numeric" placeholder="0" />
          </>
        )}
      </ModalForm>

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><Text style={styles.backText}>{'\u2039'} Back</Text></TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Career</Text>
            <Text style={styles.pageSubtitle}>{roles.data?.length ?? 0} roles {'\u00B7'} {skills.data?.length ?? 0} skills</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isOffline && styles.btnDisabled]} onPress={openCreate} disabled={isOffline} accessibilityRole="button" accessibilityLabel="Add new entry">
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
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

      {/* Roles tab */}
      {tab === 'roles' && (
        <View style={styles.timeline}>
          {(roles.data ?? []).map((r, i, arr) => (
            <View key={r.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                {r.isCurrent ? <View style={styles.timelineDotActive} /> : <View style={styles.timelineDotInner} />}
              </View>
              {i < arr.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{r.title}</Text>
                  {r.isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>}
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <TouchableOpacity onPress={() => { setEditingRole(r); setModalVisible(true) }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                      <Text style={styles.editIcon}>{'\u270E'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmAction({ message: 'Delete this role?', onConfirm: () => deleteRole.mutate(r.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                      <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.roleCompany}>{r.company}</Text>
                <Text style={styles.roleDates}>{r.startDate} \u2013 {r.isCurrent ? 'Present' : r.endDate}</Text>
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
          {(roles.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F4C5}'}</Text>
              <Text style={styles.emptyTitle}>No roles yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first roles</Text>
            </View>
          )}
        </View>
      )}

      {/* Skills tab */}
      {tab === 'skills' && (
        <View style={{ gap: spacing.lg }}>
          {Object.entries((skills.data ?? []).reduce<Record<string, CareerSkill[]>>((acc, s) => {
            ;(acc[s.category] = acc[s.category] || []).push(s); return acc
          }, {})).map(([cat, items]) => (
            <View key={cat}>
              <Text style={styles.sectionLabel}>{cat}</Text>
              <View style={styles.skillsGrid}>
                {items.map(s => (
                  <View key={s.id} style={styles.skillChip}>
                    <Text style={styles.skillName}>{s.name}</Text>
                    <Text style={{ fontSize: fontSize.xxs, color: SKILL_COLORS[s.level] }}>{SKILL_LABELS[s.level]}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 2 }}>
                      <TouchableOpacity onPress={() => { setEditingSkill(s); setModalVisible(true) }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                        <Text style={styles.editIconSm}>{'\u270E'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmAction({ message: `Delete skill "${s.name}"?`, onConfirm: () => deleteSkill.mutate(s.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                        <Text style={styles.deleteIconSm}>{'\u2715'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {(skills.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F6E0}\uFE0F'}</Text>
              <Text style={styles.emptyTitle}>No skills yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first skills</Text>
            </View>
          )}
        </View>
      )}

      {/* Achievements tab */}
      {tab === 'achievements' && (
        <View style={{ gap: spacing.sm }}>
          {(achievements.data ?? []).map(a => (
            <View key={a.id} style={styles.achCard}>
              <View style={styles.achHeader}>
                <Text style={styles.achTitle}>{a.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.achDate}>{a.achDate?.slice(0, 7)}</Text>
                  <TouchableOpacity onPress={() => { setEditingAch(a); setModalVisible(true) }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                    <Text style={styles.editIcon}>{'\u270E'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmAction({ message: 'Delete this achievement?', onConfirm: () => deleteAch.mutate(a.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                    <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.achTag}><Text style={styles.achTagText}>{a.category}</Text></View>
              {a.impact ? <Text style={styles.achImpact}>{a.impact}</Text> : null}
            </View>
          ))}
          {(achievements.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F3C6}'}</Text>
              <Text style={styles.emptyTitle}>No achievements yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first achievements</Text>
            </View>
          )}
        </View>
      )}

      {/* Salary tab */}
      {tab === 'salary' && (
        <View style={{ gap: spacing.sm }}>
          {(salary.data ?? []).map(s => (
            <View key={s.id} style={styles.salaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.salaryRole}>{s.role}</Text>
                <Text style={styles.salaryCompany}>{s.company} {'\u00B7'} {s.years}</Text>
              </View>
              <Text style={styles.salaryAmount}>{'\u00A3'}{s.salary.toLocaleString()}</Text>
              <View style={{ gap: spacing.xs, marginLeft: spacing.sm }}>
                <TouchableOpacity onPress={() => { setEditingSalary(s); setModalVisible(true) }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit" accessibilityHint="Double tap to edit">
                  <Text style={styles.editIcon}>{'\u270E'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmAction({ message: 'Delete this salary entry?', onConfirm: () => deleteSalaryMut.mutate(s.id) })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete" accessibilityHint="Double tap to delete this item">
                  <Text style={styles.deleteIcon}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {(salary.data ?? []).length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{'\u{1F4B5}'}</Text>
              <Text style={styles.emptyTitle}>No salary records yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first salary</Text>
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
  pageSubtitle: { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  addBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  btnDisabled: { opacity: 0.4 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 2 },
  tabActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  tabText: { fontSize: fontSize.xxs, color: colors.text3 },
  tabActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  editIcon: { fontSize: fontSize.sm, color: colors.primary },
  deleteIcon: { fontSize: fontSize.sm, color: colors.text3 },
  editIconSm: { fontSize: fontSize.xxs, color: colors.primary },
  deleteIconSm: { fontSize: fontSize.xxs, color: colors.text3 },
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
  // Form-specific
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text2 },
  chipActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  toggleLabel: { fontSize: fontSize.sm, color: colors.text2 },
  levelRow: { flexDirection: 'row', gap: spacing.sm },
  levelBtn: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  levelActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  // Empty states
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text2 },
  emptySub: { fontSize: fontSize.sm, color: colors.text3 },
})
