import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "Kein aktives Stripe-Abonnement gefunden." }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/profil`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("Stripe portal error:", err)
    return NextResponse.json({ error: "Stripe Portal konnte nicht geöffnet werden." }, { status: 500 })
  }
}
