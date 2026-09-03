import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authService from '@/services/auth.service'
import { setUnauthorizedHandler } from '@/services/api'
import type { User } from '@/types/api'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/utils/token'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: {
    fullName?: string
    email: string
    password: string
    passwordConfirmation: string
    inviteCode: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (fullName: string | null) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const clearSession = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const profile = await authService.fetchProfile()
    setUser(profile)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsBootstrapping(false)
      return
    }

    authService
      .fetchProfile()
      .then(setUser)
      .catch(() => {
        clearStoredToken()
        setUser(null)
      })
      .finally(() => setIsBootstrapping(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login({ email, password })
    setStoredToken(result.token)
    setUser(result.user)
  }, [])

  const signup = useCallback(
    async (input: {
      fullName?: string
      email: string
      password: string
      passwordConfirmation: string
      inviteCode: string
    }) => {
      const result = await authService.signup({
        fullName: input.fullName || null,
        email: input.email,
        password: input.password,
        passwordConfirmation: input.passwordConfirmation,
        inviteCode: input.inviteCode,
      })
      setStoredToken(result.token)
      setUser(result.user)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Always clear local session
    } finally {
      clearSession()
    }
  }, [clearSession])

  const updateProfile = useCallback(async (fullName: string | null) => {
    const profile = await authService.updateProfile({ fullName })
    setUser(profile)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      signup,
      logout,
      refreshProfile,
      updateProfile,
    }),
    [user, isBootstrapping, login, signup, logout, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
