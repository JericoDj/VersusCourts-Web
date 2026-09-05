import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

let app = null
let auth = null
let db = null

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  }
} catch (error) {
  console.warn('Firebase initialization failed:', error)
  auth = null
  db = null
}

export { db, app }

function messageForErrorCode(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase sign-in yet.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Console.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address using a different sign-in method.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    default:
      return 'Google sign-in failed. Please try again.'
  }
}

export const firebaseAuth = {
  get isReady() {
    return auth !== null
  },

  onAuthStateChanged(callback) {
    if (!auth) return () => {}
    return onAuthStateChanged(auth, callback)
  },

  async signInWithGoogle() {
    if (!auth) {
      throw new Error('Firebase is not configured. Please set the VITE_FIREBASE_* environment variables.')
    }
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      return idToken
    } catch (error) {
      console.error('Google Sign-In Error:', error)
      const message = messageForErrorCode(error.code)
      throw new Error(message)
    }
  },

  async signOut() {
    if (auth) {
      try {
        await firebaseSignOut(auth)
      } catch {
        /* ignore */
      }
    }
  },
}
