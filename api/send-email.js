// api/send-email.js
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// E-mails déclenchés par l'utilisateur connecté : envoyés UNIQUEMENT à l'adresse de son compte.
// Tous les autres types sont réservés au serveur (clé x-admin-key).
const USER_TYPES = new Set(["welcome", "cancellation"]);

const esc = (v) => String(v ?? "").slice(0, 80)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function getUserFromAuth(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    return error || !data?.user ? null : data.user;
  } catch { return null; }
}
const FROM = "ConcoursSanté <noreply@concourssante.fr>";

// Validation email basique
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 200;
}

const templates = {
  welcome: ({ name }) => ({
    subject: "Bienvenue sur ConcoursSanté 🎉",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px">🩺</div><h1 style="font-size:24px;font-weight:900;color:#0A2342">Bienvenue sur ConcoursSanté !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6">Bonjour <strong>${name}</strong>, ton compte est créé. Commence dès maintenant !</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#1DB8A4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Commencer à réviser →</a></div></div>`
  }),
  premium: ({ name }) => ({
    subject: "Tu es Premium sur ConcoursSanté ⭐",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px">⭐</div><h1 style="font-size:24px;font-weight:900;color:#0A2342">Bienvenue dans Premium !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6">Bonjour <strong>${name}</strong>, ton abonnement Premium est actif.</p><ul style="color:#445566;font-size:15px;line-height:2"><li>✅ Quiz IA illimités</li><li>✅ Les 13 concours disponibles</li><li>✅ Toutes les difficultés</li><li>✅ Mode examen blanc complet</li></ul><p style="color:#445566;font-size:14px;margin-top:24px">Pour gérer ou résilier ton abonnement, rends-toi dans <strong>Mon compte → Abonnement</strong>.</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#1DB8A4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Accéder à mon espace →</a></div><p style="color:#aab;font-size:12px;text-align:center">ConcoursSanté · Tu reçois cet email car tu viens de souscrire un abonnement.</p></div>`
  }),
  cancellation: ({ name }) => ({
    subject: "Résiliation confirmée — À bientôt 👋",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px">👋</div><h1 style="font-size:24px;font-weight:900;color:#0A2342">Résiliation confirmée</h1></div><p style="color:#445566;font-size:16px;line-height:1.6">Bonjour <strong>${name}</strong>,</p><p style="color:#445566;font-size:15px;line-height:1.6">Ta résiliation a bien été prise en compte. Ton accès Premium reste actif jusqu'à la fin de ta période en cours.</p><div style="background:#f7f9fc;border-radius:12px;padding:20px;margin:24px 0"><div style="font-size:14px;color:#445566;line-height:1.8">✓ Résiliation confirmée<br/>✓ Accès maintenu jusqu'à fin de période<br/>✓ Aucun frais supplémentaire<br/>✓ Réabonnement possible à tout moment</div></div><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#1DB8A4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Revenir sur ConcoursSanté</a></div><p style="color:#aab;font-size:12px;text-align:center">ConcoursSanté · Bonne chance pour la suite 🍀</p></div>`
  }),
  inactivity: ({ name, daysSince }) => ({
    subject: `${name}, tu n'as pas révisé depuis ${daysSince} jours 👀`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center"><div style="font-size:48px">🔥</div><h1 style="font-size:22px;font-weight:900;color:#0A2342">Ton streak est en danger !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6;margin-top:20px">Bonjour <strong>${name}</strong>, ${daysSince} jours sans réviser... Reprends dès maintenant !</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#FF6B35;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Reprendre la révision →</a></div></div>`
  }),
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL || "https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body || {};
  if (!type || !templates[type]) {
    return res.status(400).json({ error: "type inconnu" });
  }

  let to;
  if (USER_TYPES.has(type)) {
    // Utilisateur connecté obligatoire ; le destinataire est FORCÉ à l'adresse de son compte
    const user = await getUserFromAuth(req.headers["authorization"]);
    if (!user?.email) return res.status(401).json({ error: "Non autorisé" });
    to = user.email;
  } else {
    // Réservé au serveur (webhook Stripe, tâches planifiées)
    const adminKey = req.headers["x-admin-key"];
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    to = req.body?.to;
    if (!isValidEmail(to)) return res.status(400).json({ error: "Email destinataire invalide" });
  }

  try {
    const safe = { ...(data || {}), name: esc(data?.name), daysSince: Number(data?.daysSince) || 0 };
    const { subject, html } = templates[type](safe);
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return res.status(200).json({ success: true, id: result?.id });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: "Échec envoi email" });
  }
}
