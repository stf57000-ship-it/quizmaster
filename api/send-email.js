// api/send-email.js
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
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
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px">⭐</div><h1 style="font-size:24px;font-weight:900;color:#0A2342">Bienvenue dans Premium !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6">Bonjour <strong>${name}</strong>, ton abonnement Premium est actif.</p><ul style="color:#445566;font-size:15px;line-height:2"><li>✅ Quiz IA illimités</li><li>✅ Les 14 concours disponibles</li><li>✅ Toutes les difficultés</li><li>✅ Mode examen blanc complet</li></ul><p style="color:#445566;font-size:14px;margin-top:24px">Pour gérer ou résilier ton abonnement, rends-toi dans <strong>Mon compte → Abonnement</strong>.</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#1DB8A4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Accéder à mon espace →</a></div><p style="color:#aab;font-size:12px;text-align:center">ConcoursSanté · Tu reçois cet email car tu viens de souscrire un abonnement.</p></div>`
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
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { type, to, data } = req.body;

  // Validation du type et du destinataire AVANT la vérification de la clé
  if (!type || !to || !templates[type]) {
    return res.status(400).json({ error: "type ou destinataire manquant" });
  }
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: "Email destinataire invalide" });
  }

  // Sécurisation : clé secrète obligatoire sauf pour la résiliation (appelée côté client)
  const isPublicType = type === "cancellation";
  const adminKey = req.headers["x-admin-key"];
  if (!isPublicType && (!adminKey || adminKey !== process.env.ADMIN_KEY)) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const { subject, html } = templates[type](data || {});
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return res.status(200).json({ success: true, id: result.id });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: "Échec envoi email" });
  }
}
