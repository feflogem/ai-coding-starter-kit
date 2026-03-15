import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all users from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Fetch subscriptions + profiles + scans + token usage
  const [{ data: subs }, { data: profiles }, { data: scanCounts }, { data: tokenRows }] = await Promise.all([
    supabase.from("subscriptions").select("user_id, tier"),
    supabase.from("profiles").select("id, youtube_channel_id"),
    supabase.from("scans").select("user_id"),
    supabase.from("token_usage").select("user_id, input_tokens, output_tokens"),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s.tier]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.youtube_channel_id]))
  const scanCountMap = new Map<string, number>()
  for (const s of scanCounts ?? []) {
    scanCountMap.set(s.user_id, (scanCountMap.get(s.user_id) ?? 0) + 1)
  }
  const tokenMap = new Map<string, number>()
  for (const t of tokenRows ?? []) {
    tokenMap.set(t.user_id, (tokenMap.get(t.user_id) ?? 0) + t.input_tokens + t.output_tokens)
  }

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    tier: subMap.get(u.id) ?? "free",
    youtubeChannel: profileMap.get(u.id) ?? null,
    totalScans: scanCountMap.get(u.id) ?? 0,
    totalTokens: tokenMap.get(u.id) ?? 0,
  }))

  return NextResponse.json({ users })
}
