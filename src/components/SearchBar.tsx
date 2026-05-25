import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { colors, spacing, radius, fontSize } from '@/theme'

interface Props {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{'\u{1F50D}'}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text3}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Clear search">
          <Text style={styles.clear}>{'\u2715'}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  icon: { fontSize: 14 },
  input: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.text1,
  },
  clear: { fontSize: 14, color: colors.text3, padding: spacing.xs },
})
