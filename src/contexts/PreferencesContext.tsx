import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Preferences {
  currency:        string
  baseCurrency:    string
  theme:           'dark' | 'light'
  enabledSections: string[]
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'CAD' | 'AUD' | string

export const ALL_MODULE_IDS = [
  'habits', 'tasks', 'timer', 'journal',
  'goals', 'notes', 'reflections', 'experiences',
  'trips', 'social', 'reading', 'health',
  'career', 'finance', 'assets', 'fingoals',
]

const DEFAULTS: Preferences = {
  currency:        'GBP',
  baseCurrency:    'GBP',
  theme:           'dark',
  enabledSections: ALL_MODULE_IDS,
}

const STORAGE_KEY = 'lifelog-prefs'

interface PreferencesContextType {
  prefs:        Preferences
  setPrefs:     (p: Partial<Preferences>) => void
  // Convenience
  currency:     string
  setCurrency:  (c: CurrencyCode) => void
  isEnabled:    (id: string) => boolean
  features:     Record<string, boolean>
  setFeatures:  (f: Record<string, boolean>) => void
}

const PreferencesContext = createContext<PreferencesContextType>({
  prefs:       DEFAULTS,
  setPrefs:    () => {},
  currency:    DEFAULTS.currency,
  setCurrency: () => {},
  isEnabled:   () => true,
  features:    {},
  setFeatures: () => {},
})

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULTS)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) setPrefsState(prev => ({ ...prev, ...JSON.parse(raw) }))
      })
      .catch(console.error)
  }, [])

  const setPrefs = (patch: Partial<Preferences>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(console.error)
      return next
    })
  }

  const setCurrency = (c: CurrencyCode) => setPrefs({ currency: c, baseCurrency: c })

  const isEnabled = (id: string) => prefs.enabledSections.includes(id)

  // features: Record<string, boolean> keyed by module id
  const features: Record<string, boolean> = Object.fromEntries(
    ALL_MODULE_IDS.map(id => [id, prefs.enabledSections.includes(id)])
  )

  const setFeatures = (f: Record<string, boolean>) => {
    const enabled = ALL_MODULE_IDS.filter(id => f[id] !== false)
    setPrefs({ enabledSections: enabled })
  }

  return (
    <PreferencesContext.Provider
      value={{ prefs, setPrefs, currency: prefs.currency, setCurrency, isEnabled, features, setFeatures }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export const usePreferences = () => useContext(PreferencesContext)

export function useFeatures() {
  const { isEnabled, setFeatures, features, prefs, setPrefs } = useContext(PreferencesContext)
  return {
    isEnabled,
    toggle: (id: string) => {
      const enabled = prefs.enabledSections.includes(id)
      setPrefs({
        enabledSections: enabled
          ? prefs.enabledSections.filter(s => s !== id)
          : [...prefs.enabledSections, id],
      })
    },
    enabledSections: prefs.enabledSections,
    features,
    setFeatures,
  }
}
