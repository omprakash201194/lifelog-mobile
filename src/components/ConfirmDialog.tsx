import { Alert } from 'react-native'

interface Options {
  title?: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function confirmAction({
  title = 'Confirm',
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
}: Options) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ])
}
