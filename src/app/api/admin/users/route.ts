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

  // Fetch subscriptions + profiles
  const [{ data: subs }, { data: profiles }, { data: scanCounts }] = await Promise.all([
    supabase.from("subscriptions").select("user_id, tier"),
    supabase.from("profiles").select("id, youtube_channel_id"),
    supabase.from("scans").select("user_id"),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s.tier]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.youtube_channel_id]))
  const scanCountMap = new Map<string, number>()
  for (const s of scanCounts ?? []) {
    scanCountMap.set(s.user_id, (scanCountMap.get(s.user_id) ?? 0) + 1)
  }

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    tier: subMap.get(u.id) ?? "free",
    youtubeChannel: profileMap.get(u.id) ?? null,
    totalScans: scanCountMap.get(u.id) ?? 0,
  }))

  return NextResponse.json({ users })
}
