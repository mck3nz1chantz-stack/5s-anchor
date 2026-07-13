import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, UserRole } from '../types/domain'

interface AuthState {
  session: Session | null
  setSession: (session: Session | null) => void
  hasPower: (powers: UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      hasPower: (roles) => {
        const s = get().session
        if (!s) return false
        if (s.role === 'admin') return true
        return roles.includes(s.role)
      },
    }),
    { name: '5s-anchor-session' },
  ),
)
