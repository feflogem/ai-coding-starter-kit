import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAuthUser } from "@/lib/auth-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert. Bitte einloggen." }, { status: 401 })
  }

  const body = await req.json()
  const { tier } = body

  if (!tier || !PRICE_IDS[tier]) {
    return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 })
  }

  const priceId = PRICE_IDS[tier]
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, tier },
      success_url: `${baseUrl}/profil?upgrade=success`,
      cancel_url: `${baseUrl}/profil?upgrade=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Stripe checkout error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
