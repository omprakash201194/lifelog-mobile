import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { auth } from '@/lib/firebase'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
})

interface AuthContextType {
  user:    User | null
  loading: boolean
  signIn:  () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user:    null,
  loading: true,
  signIn:  async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices()
      const response = await GoogleSignin.signIn()
      if (response.type === 'success' && response.data.idToken) {
        const credential = GoogleAuthProvider.credential(response.data.idToken)
        await signInWithCredential(auth, credential)
      }
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error('[AUTH] Google sign-in error:', error)
      }
    }
  }

  const signOut = async () => {
    try {
      await GoogleSignin.signOut()
    } catch (_) {}
    await fbSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
