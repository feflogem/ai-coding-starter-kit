import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const MONTHLY_LIMITS: Record<string, { scans: number; competitor: number }> = {
  free: { scans: 3, competitor: 1 },
  basic: { scans: 10, competitor: 5 },
  premium: { scans: Infinity, competitor: 25 },
}

/** Validates the Bearer token from the Authorization header and returns the user, or null. */
export async function getAuthUser(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim()
  if (!token) return null
  const supabase = createClient(url, anonKey)
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

/** Returns the channel limit per scan for a user based on their subscription tier. */
export async function getChannelLimit(userId: string, token: string): Promise<number> {
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .single()
  const tier = data?.tier ?? "free"
  if (tier === "premium") return 40
  if (tier === "basic") return 10
  return 3
}

/** Returns the user's tier and current month's usage counts. */
export async function getTierAndMonthlyUsage(userId: string, token: string) {
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [subResult, scanResult, competitorResult] = await Promise.all([
    supabase.from("subscriptions").select("tier").eq("user_id", userId).single(),
    supabase.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
    supabase.from("competitor_analyses").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
  ])

  const tier = subResult.data?.tier ?? "free"
  const scansThisMonth = scanResult.count ?? 0
  const competitorThisMonth = competitorResult.count ?? 0

  return { tier, scansThisMonth, competitorThisMonth }
}
