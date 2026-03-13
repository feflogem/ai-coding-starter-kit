import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Use service role key here — webhook runs without a user session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Fehlende Signatur" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const tier = session.metadata?.tier
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

    if (!userId || !tier) {
      console.error("Missing metadata in checkout session:", session.id)
      return NextResponse.json({ error: "Fehlende Metadaten" }, { status: 400 })
    }

    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          tier,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

    if (error) {
      console.error("Failed to update subscription:", error)
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 })
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription
    const priceId = subscription.items.data[0]?.price?.id
    const stripeSubscriptionId = subscription.id

    const tierByPrice: Record<string, string> = {
      [process.env.STRIPE_PRICE_BASIC!]: "basic",
      [process.env.STRIPE_PRICE_PREMIUM!]: "premium",
    }
    const newTier = priceId ? (tierByPrice[priceId] ?? "free") : "free"

    await supabase
      .from("subscriptions")
      .update({ tier: newTier, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", stripeSubscriptionId)
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const stripeSubscriptionId = subscription.id

    const { error } = await supabase
      .from("subscriptions")
      .update({ tier: "free", stripe_subscription_id: null, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", stripeSubscriptionId)

    if (error) {
      console.error("Failed to downgrade subscription:", error)
    }
  }

  return NextResponse.json({ received: true })
}
