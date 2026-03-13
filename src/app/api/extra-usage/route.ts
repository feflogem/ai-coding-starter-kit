import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.extra_usage_enabled !== undefined) updates.extra_usage_enabled = body.extra_usage_enabled
  if (body.extra_monthly_limit_cents !== undefined) updates.extra_monthly_limit_cents = body.extra_monthly_limit_cents
  if (body.extra_auto_reload !== undefined) updates.extra_auto_reload = body.extra_auto_reload

  const { error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
