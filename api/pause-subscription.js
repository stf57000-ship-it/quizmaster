// api/pause-subscription.js — Pause de 30 jours d'un abonnement Stripe (sans frais, une seule fois)
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PAUSE_DAYS = 30;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL || "https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

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
    const { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError || !sub) return res.status(404).json({ error: "Abonnement introuvable" });
    if (sub.status !== "active") return res.status(400).json({ error: "Aucun abonnement actif à mettre en pause" });
    if (!sub.stripe_subscription_id) return res.status(400).json({ error: "ID abonnement manquant" });

    const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    if (current.pause_collection) return res.status(400).json({ error: "Ton abonnement est déjà en pause" });
    if (current.cancel_at_period_end) return res.status(400).json({ error: "Ton abonnement est déjà résilié" });
    if (current.metadata?.pause_used === "1") {
      return res.status(400).json({ error: "La pause de 30 jours a déjà été utilisée sur cet abonnement" });
    }

    const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DAYS * 86400;
    // Les factures émises pendant la pause sont annulées : aucun prélèvement jusqu'à la reprise.
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      pause_collection: { behavior: "void", resumes_at: resumesAt },
      metadata: { pause_used: "1" }
    });

    console.log(`✅ Pause de ${PAUSE_DAYS} jours pour user ${user.id}`);
    return res.status(200).json({ success: true, resumesAt });
  } catch (error) {
    console.error("Pause subscription error:", error.message);
    return res.status(500).json({ error: "Erreur lors de la mise en pause" });
  }
}
