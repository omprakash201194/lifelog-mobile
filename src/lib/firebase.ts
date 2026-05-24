import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const isFirstInit = getApps().length === 0
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp()

// reason: getAuth() uses browser persistence which fails silently on React Native.
// initializeAuth with getReactNativePersistence(AsyncStorage) is required.
// Can only call initializeAuth once — on fast-refresh re-runs, use getAuth.
const auth = isFirstInit && Platform.OS !== 'web'
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app)

export { auth }
export default app
