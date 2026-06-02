// api/stripe-webhook.js — Version corrigée avec meilleure gestion des erreurs
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// IMPORTANT : utiliser createClient avec serviceRoleKey pour bypasser RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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

async function setUserPremium(userId, customerId, subscriptionId) {
  console.log(`Setting premium for user: ${userId}`);
  
  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: "active",
      plan: "premium",
      updated_at: new Date().toISOString()
    }, { 
      onConflict: "user_id",
      ignoreDuplicates: false 
    });

  if (error) {
    console.error("Supabase upsert error:", JSON.stringify(error));
    throw error;
  }

  console.log(`✅ Premium set for user ${userId}`);
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("getRawBody error:", err);
    return res.status(400).json({ error: "Could not read body" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).json({ error: "Missing stripe-signature" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Event: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Session metadata:", JSON.stringify(session.metadata));
      const userId = session.metadata?.user_id;
      if (userId) {
        await setUserPremium(userId, session.customer, session.subscription);
      } else {
        console.error("No user_id in session metadata!");
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      // Chercher user_id dans les métadonnées de la ligne de facture
      const lineItem = invoice.lines?.data?.[0];
      const userId = lineItem?.metadata?.user_id || invoice.parent?.subscription_details?.metadata?.user_id;
      console.log("Invoice user_id:", userId);
      if (userId) {
        await supabase.from("user_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("user_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Handler error:", error.message, JSON.stringify(error));
    return res.status(500).json({ error: error.message });
  }
}
