// api/chat.js — Proxy sécurisé — Claude Haiku 4.5
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Liste blanche des concours autorisés
const ALLOWED_CONCOURS = new Set([
  "infirmier", "aidesoignant", "auxiliaire", "ambulancier", "atsem",
  "sapeurpompier", "policemunicipal", "gardedeprison", "surveillant",
  "agentdesecurite", "ssiap", "bpjeps", "crfpe", "moniteuresclade",
  "educateurspecialise"
]);

// Liste blanche des modes autorisés
const ALLOWED_MODES = new Set(["quiz", "exam", "express", "errors", "flashcards"]);

const rateLimitMap = new Map();
function checkRateLimit(ip, isPremium) {
  if (isPremium) return true;
  const today = new Date().toDateString();
  const key = `${ip}:${today}`;
  const count = rateLimitMap.get(key) || 0;
  if (count >= 3) return false;
  rateLimitMap.set(key, count + 1);
  for (const [k] of rateLimitMap) if (!k.endsWith(today)) rateLimitMap.delete(k);
  return true;
}

async function checkPremium(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return false;
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status,plan,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!sub || sub.status !== "active" || sub.plan !== "premium") return false;
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
    return true;
  } catch { return false; }
}

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return { valid: false, reason: "Prompt invalide" };
  if (prompt.length > 3000) return { valid: false, reason: "Prompt trop long" };

  // Détection d'injection de prompt basique
  const forbidden = [
    "ignore previous instructions",
    "ignore les instructions",
    "oublie tes instructions",
    "system prompt",
    "jailbreak",
    "act as",
    "tu es maintenant",
    "you are now",
  ];
  const lower = prompt.toLowerCase();
  for (const f of forbidden) {
    if (lower.includes(f)) return { valid: false, reason: "Contenu non autorisé" };
  }

  return { valid: true };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL || "https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { prompt, concours, mode } = req.body;

    // Validation du prompt
    const check = validatePrompt(prompt);
    if (!check.valid) return res.status(400).json({ error: check.reason });

    // Validation liste blanche concours
    if (concours && !ALLOWED_CONCOURS.has(concours)) {
      return res.status(400).json({ error: "Concours non reconnu" });
    }

    // Validation liste blanche mode
    if (mode && !ALLOWED_MODES.has(mode)) {
      return res.status(400).json({ error: "Mode non reconnu" });
    }

    const isPremium = await checkPremium(req.headers["authorization"]);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

    if (!checkRateLimit(ip, isPremium)) {
      return res.status(429).json({
        error: "Limite quotidienne atteinte",
        code: "RATE_LIMIT_EXCEEDED",
        message: "3 quiz/jour en version gratuite. Passez Premium pour un accès illimité !"
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const response = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://concourssante.fr",
        "X-Title": "ConcoursSanté"
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenRouter error:", response.status, errBody);
      return res.status(502).json({ error: "Erreur IA. Réessayez." });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return res.status(502).json({ error: "Réponse IA vide." });
    return res.status(200).json({ content: text, isPremium });

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}
