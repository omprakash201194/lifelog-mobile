import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme'

export default function LoginScreen() {
  const { signIn } = useAuth()

  return (
    <View style={styles.container}>
      {/* App branding */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>L</Text>
        </View>
        <Text style={styles.appName}>LifeLog</Text>
        <Text style={styles.tagline}>Your personal life tracker</Text>
      </View>

      {/* Feature highlights */}
      <View style={styles.features}>
        {[
          ['✅', 'Habits & Tasks',       'Track daily habits and priorities'],
          ['⏱️', 'Pomodoro Timer',       'Stay focused with timed sessions'],
          ['📊', 'Health & Finance',     'Monitor your wellbeing and wealth'],
          ['🌍', 'Trips & Experiences',  "Capture life's best moments"],
        ].map(([icon, title, desc]) => (
          <View key={title} style={styles.feature}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sign in button */}
      <TouchableOpacity style={styles.signInBtn} onPress={signIn} activeOpacity={0.85}>
        <Text style={styles.signInText}>Continue with Google</Text>
      </TouchableOpacity>

      <Text style={styles.footnote}>Your data stays on your homelab. Private by design.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xxl,
    paddingTop:      80,
    paddingBottom:   spacing.xxxl,
    alignItems:      'center',
    justifyContent:  'space-between',
  },
  hero: { alignItems: 'center', gap: spacing.md },
  logoBox: {
    width:           72,
    height:          72,
    borderRadius:    radius.xl,
    backgroundColor: colors.primaryDim,
    borderWidth:     1,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.sm,
  },
  logoText:  { fontSize: 36, fontWeight: fontWeight.bold, color: colors.primary },
  appName:   { fontSize: fontSize.xxxl + 4, fontWeight: fontWeight.bold, color: colors.text1 },
  tagline:   { fontSize: fontSize.base, color: colors.text3 },
  features: {
    width: '100%',
    gap:   spacing.lg,
    marginVertical: spacing.xxl,
  },
  feature: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.lg,
    backgroundColor: colors.bgCard,
    padding:        spacing.lg,
    borderRadius:   radius.lg,
    borderWidth:    1,
    borderColor:    colors.border,
  },
  featureIcon:  { fontSize: 24 },
  featureTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text1 },
  featureDesc:  { fontSize: fontSize.sm, color: colors.text3, marginTop: 2 },
  signInBtn: {
    width:           '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius:    radius.lg,
    alignItems:      'center',
  },
  signInText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: '#fff' },
  footnote:   { fontSize: fontSize.xs, color: colors.text3, textAlign: 'center', marginTop: spacing.md },
})
