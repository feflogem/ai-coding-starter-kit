"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserContextValue {
  user: SupabaseUser | null
  tier: string
  loading: boolean
  refreshTier: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  tier: "free",
  loading: true,
  refreshTier: async () => {},
})

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tier, setTier] = useState("free")
  const [loading, setLoading] = useState(true)

  async function fetchTier(userId: string) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .single()
    if (sub?.tier) setTier(sub.tier)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u)
      if (u) {
        fetchTier(u.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchTier(u.id)
      } else {
        setTier("free")
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function refreshTier() {
    if (user) await fetchTier(user.id)
  }

  return (
    <UserContext.Provider value={{ user, tier, loading, refreshTier }}>
      {children}
    </UserContext.Provider>
  )
}
