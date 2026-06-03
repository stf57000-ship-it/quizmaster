// api/create-checkout.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL || "https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // Vérification auth Supabase obligatoire
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  let user;
  try {
    const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !data.user) return res.status(401).json({ error: "Token invalide" });
    user = data.user;
  } catch {
    return res.status(401).json({ error: "Erreur auth" });
  }

  // Vérifier que l'utilisateur n'est pas déjà Premium
  try {
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status,plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub?.status === "active" && sub?.plan === "premium") {
      return res.status(400).json({ error: "Vous êtes déjà abonné Premium" });
    }
  } catch {}

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${process.env.VITE_APP_URL}?payment=success`,
      cancel_url: `${process.env.VITE_APP_URL}?payment=canceled`,
      locale: "fr",
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error.message);
    return res.status(500).json({ error: "Impossible de créer la session de paiement" });
  }
}
