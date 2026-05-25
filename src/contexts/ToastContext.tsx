import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { Animated, Text, StyleSheet, Platform } from 'react-native'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  message: string
  variant: ToastVariant
  id: number
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counter = useRef(0)

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    if (timeout.current) clearTimeout(timeout.current)

    counter.current += 1
    setToast({ message, variant, id: counter.current })

    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()

    timeout.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setToast(null)
      })
    }, 3000)
  }, [opacity])

  const bgColor = toast?.variant === 'error' ? colors.rose
    : toast?.variant === 'success' ? colors.green
    : colors.primary

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[styles.container, { opacity, backgroundColor: bgColor }]}
          pointerEvents="none"
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: spacing.lg,
    right: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
})
