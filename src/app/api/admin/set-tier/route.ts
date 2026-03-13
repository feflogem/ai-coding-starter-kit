import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function POST(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 })
  }

  let body: { userId: string; tier: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })
  }

  const { userId, tier } = body
  if (!userId || !["free", "basic", "premium"].includes(tier)) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ensure profile row exists (subscriptions FK references profiles.id)
  await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true })

  const { error } = await supabase
    .from("subscriptions")
    .upsert({ user_id: userId, tier }, { onConflict: "user_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
