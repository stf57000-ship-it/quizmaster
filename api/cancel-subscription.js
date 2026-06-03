// api/cancel-subscription.js — Résiliation abonnement Stripe
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

  // Auth : vérifier le token Supabase
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });

  let user;
  try {
    const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !data.user) return res.status(401).json({ error: "Token invalide" });
    user = data.user;
  } catch {
    return res.status(401).json({ error: "Erreur auth" });
  }

  try {
    // Récupérer l'abonnement Stripe depuis Supabase
    const { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError || !sub) return res.status(404).json({ error: "Abonnement introuvable" });
    if (sub.status !== "active") return res.status(400).json({ error: "Abonnement déjà résilié" });
    if (!sub.stripe_subscription_id) return res.status(400).json({ error: "ID abonnement manquant" });

    // Annuler à la fin de la période (pas immédiatement)
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Mettre à jour Supabase
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancel_at_period_end", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    console.log(`✅ Résiliation programmée pour user ${user.id}`);
    return res.status(200).json({ success: true, message: "Résiliation programmée à la fin de la période" });

  } catch (error) {
    console.error("Cancel subscription error:", error.message);
    return res.status(500).json({ error: "Erreur lors de la résiliation" });
  }
}
