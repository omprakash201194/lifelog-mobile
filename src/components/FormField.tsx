import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'

interface Props extends TextInputProps {
  label: string
  optional?: boolean
}

export default function FormField({ label, optional, style, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <TextInput
        style={[styles.input, inputProps.multiline && styles.multiline, style]}
        placeholderTextColor={colors.text3}
        accessibilityLabel={label}
        {...inputProps}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text2,
  },
  optional: {
    color: colors.text3,
    fontWeight: fontWeight.normal,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.text1,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm + 2,
  },
})
