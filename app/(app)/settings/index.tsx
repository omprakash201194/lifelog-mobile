import { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']

const FEATURE_LABELS: Record<string, string> = {
  journal:     '📓  Journal',
  goals:       '🎯  Goals',
  health:      '💪  Health',
  reading:     '📚  Reading',
  notes:       '🗒️  Notes',
  reflections: '🪞  Reflections',
  social:      '👥  Social',
  trips:       '✈️  Trips',
  career:      '💼  Career',
  finance:     '💰  Finance',
  experiences: '🌟  Experiences',
}

export default function SettingsScreen() {
  const router                    = useRouter()
  const { signOut, user }         = useAuth()
  const { currency, setCurrency, features, setFeatures } = usePreferences()
  const [currencyOpen, setCurrencyOpen] = useState(false)

  const toggleFeature = (key: string) => {
    setFeatures({ ...features, [key]: !features[key] })
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* Profile */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.displayName ?? 'Unknown'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Currency */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <TouchableOpacity style={styles.row} onPress={() => setCurrencyOpen(o => !o)}>
          <Text style={styles.rowLabel}>Currency</Text>
          <Text style={styles.rowValue}>{currency} ›</Text>
        </TouchableOpacity>
        {currencyOpen && (
          <View style={styles.currencyList}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyBtn, currency === c && styles.currencyActive]}
                onPress={() => { setCurrency(c as any); setCurrencyOpen(false) }}>
                <Text style={[styles.currencyText, currency === c && styles.currencyActiveText]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Module visibility */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Visible modules</Text>
        {Object.entries(FEATURE_LABELS).map(([key, label]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Switch
              value={features[key] !== false}
              onValueChange={() => toggleFeature(key)}
              trackColor={{ false: colors.border, true: colors.primaryDim }}
              thumbColor={features[key] !== false ? colors.primary : colors.text3}
            />
          </View>
        ))}
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoTitle}>LifeLog Mobile</Text>
        <Text style={styles.appInfoSub}>Self-hosted · Firebase Auth · Your data stays on your homelab</Text>
      </View>

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl + 8 },

  pageHeader: { marginBottom: spacing.xl },
  backText:   { fontSize: fontSize.base, color: colors.primary, marginBottom: spacing.sm },
  pageTitle:  { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text1 },

  card:         { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },

  profileRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  profileEmail:{ fontSize: fontSize.sm, color: colors.text3 },

  signOutBtn:  { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  signOutText: { color: colors.red, fontWeight: fontWeight.semibold },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rowLabel: { fontSize: fontSize.base, color: colors.text1 },
  rowValue: { fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold },

  currencyList:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm },
  currencyBtn:        { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  currencyActive:     { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  currencyText:       { fontSize: fontSize.sm, color: colors.text2 },
  currencyActiveText: { color: colors.primary, fontWeight: fontWeight.semibold },

  appInfo:      { alignItems: 'center', paddingVertical: spacing.xl, gap: 4, marginTop: spacing.lg },
  appInfoTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text2 },
  appInfoSub:   { fontSize: fontSize.xs, color: colors.text3, textAlign: 'center' },
})
