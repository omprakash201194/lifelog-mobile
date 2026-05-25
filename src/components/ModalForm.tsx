import { ReactNode } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'
import { useLayout } from '@/hooks/useLayout'

interface Props {
  visible: boolean
  title: string
  onClose: () => void
  onSave: () => void
  saving?: boolean
  disabled?: boolean
  saveLabel?: string
  children: ReactNode
}

export default function ModalForm({
  visible,
  title,
  onClose,
  onSave,
  saving = false,
  disabled = false,
  saveLabel = 'Save',
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const { modalMaxHeight } = useLayout()

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { maxHeight: modalMaxHeight, paddingBottom: insets.bottom + spacing.lg }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity
              onPress={onSave}
              disabled={saving || disabled}
              hitSlop={12}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveText, (disabled) && styles.saveDisabled]}>
                  {saveLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    fontSize: fontSize.base,
    color: colors.text2,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text1,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  saveText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  saveDisabled: {
    opacity: 0.4,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
})
