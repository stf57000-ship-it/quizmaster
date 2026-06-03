// api/stripe-webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(typeof c === "string" ? Buffer.from(c) : c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function sendPremiumEmail(email, name) {
  try {
    await fetch(`${process.env.VITE_APP_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": process.env.ADMIN_KEY },
      body: JSON.stringify({ type: "premium", to: email, data: { name: name || "toi" } })
    });
    console.log(`✅ Email Premium envoyé à ${email}`);
  } catch (err) {
    console.error("Email Premium error:", err.message);
  }
}

async function setUserPremium(userId, customerId, subscriptionId, periodEnd) {
  console.log(`Setting premium for user: ${userId}`);
  const { error } = await supabase.from("user_subscriptions").upsert({
    user_id:                userId,
    stripe_customer_id:     customerId,
    stripe_subscription_id: subscriptionId,
    status:                 "active",
    plan:                   "premium",
    current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at:             new Date().toISOString()
  }, { onConflict: "user_id", ignoreDuplicates: false });
  if (error) { console.error("Supabase upsert error:", JSON.stringify(error)); throw error; }
  console.log(`✅ Premium set for user ${userId}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  let rawBody;
  try { rawBody = await getRawBody(req); }
  catch (err) { console.error("getRawBody error:", err); return res.status(400).json({ error: "Could not read body" }); }

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature" });

  let event;
  try { event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (err) { console.error("Webhook signature error:", err.message); return res.status(400).json({ error: `Webhook Error: ${err.message}` }); }

  console.log(`Event: ${event.type}`);

  try {
    // ── Paiement initial checkout ──────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.metadata?.user_id;
      if (userId) {
        // Récupérer les détails de l'abonnement pour avoir current_period_end
        let periodEnd = null;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          periodEnd = sub.current_period_end;
        }
        await setUserPremium(userId, session.customer, session.subscription, periodEnd);
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName  = session.customer_details?.name;
        if (customerEmail) await sendPremiumEmail(customerEmail, customerName);
      } else {
        console.error("No user_id in session metadata!");
      }
    }

    // ── Renouvellement mensuel ─────────────────────────────────
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      // Récupérer user_id depuis les métadonnées de l'abonnement Stripe
      let userId = null;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        userId = sub.metadata?.user_id;
        if (userId) {
          await supabase.from("user_subscriptions").update({
            status:             "active",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at:         new Date().toISOString()
          }).eq("user_id", userId);
          console.log(`✅ Renouvellement enregistré pour user ${userId}, fin: ${new Date(sub.current_period_end * 1000).toISOString()}`);
        }
      }
    }

    // ── Résiliation ────────────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const sub    = event.data.object;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("user_subscriptions").update({
          status:     "canceled",
          updated_at: new Date().toISOString()
        }).eq("user_id", userId);
        console.log(`✅ Abonnement annulé pour user ${userId}`);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Handler error:", error.message, JSON.stringify(error));
    return res.status(500).json({ error: error.message });
  }
}
