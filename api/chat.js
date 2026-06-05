// api/chat.js — Proxy sécurisé v2 — Claude Haiku 4.5
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Listes blanches ───────────────────────────────────────────
const ALLOWED_CONCOURS = new Set([
  "infirmier","aide_soignant","auxiliaire","ambulancier","atsem","ash",
  "pompier","gendarmerie","police_nationale","armee","cap_aepe","bac_assp",
  "aidesoignant","sapeurpompier","policemunicipal","gardedeprison",
  "surveillant","agentdesecurite","ssiap","bpjeps","crfpe"
]);
const ALLOWED_MODES = new Set(["quiz","exam","express","errors","flashcards"]);
const ALLOWED_DIFFICULTIES = new Set([1, 2, 3]);

// ── Construction du prompt côté serveur ──────────────────────
// Le client envoie des PARAMÈTRES, pas un prompt libre
function buildPrompt(concours, mode, difficulty, theme, errorQuestions) {
  const concoursLabels = {
    infirmier:"Infirmier (IFSI)", aide_soignant:"Aide-soignant", aidesoignant:"Aide-soignant",
    auxiliaire:"Auxiliaire de puériculture", ambulancier:"Ambulancier", atsem:"ATSEM",
    ash:"Agent de service hospitalier", pompier:"Sapeur-pompier", gendarmerie:"Gendarme",
    police_nationale:"Police nationale", armee:"Armée de Terre",
    cap_aepe:"CAP AEPE", bac_assp:"Bac Pro ASSP"
  };
  const label = concoursLabels[concours] || concours;
  const diffLabel = difficulty===1?"débutant (questions simples, vocabulaire de base)":difficulty===3?"expert (questions pointues, cas cliniques complexes)":"intermédiaire";
  const themeText = theme ? `Thème : "${theme}".` : "Varie les thèmes du programme officiel.";
  const count = mode === "exam" ? 20 : 10;

  if (mode === "errors" && errorQuestions?.length) {
    const sample = errorQuestions.slice(-5).map(e => e.q || e.question).filter(Boolean).join("\n- ");
    return `Expert concours paramédicaux français. L'étudiant a raté ces questions :\n- ${sample}\nGénère ${count} QCM DIFFÉRENTS pour "${label}" niveau ${diffLabel} ciblant ces lacunes.\nRéponds UNIQUEMENT avec ce JSON valide, sans markdown:\n{"questions":[{"q":"...","options":["A...","B...","C...","D..."],"answer":0,"explanation":"...","theme":"..."}]}`;
  }

  if (mode === "flashcards") {
    return `Expert concours paramédicaux français. Génère 8 flashcards pour "${label}". ${themeText}\nRéponds UNIQUEMENT avec ce JSON valide, sans markdown:\n{"flashcards":[{"question":"...","answer":"...","theme":"..."}]}`;
  }

  return `Expert concours paramédicaux français. Génère ${count} QCM ORIGINAUX pour "${label}", niveau ${diffLabel}. ${themeText} Questions précises sur le programme officiel du concours. IMPORTANT: varie la position de la bonne réponse (answer doit être 0, 1, 2 ou 3 de façon équilibrée, pas toujours 0).\nRéponds UNIQUEMENT avec ce JSON valide, sans markdown:\n{"questions":[{"q":"...","options":["A...","B...","C...","D..."],"answer":0,"explanation":"...","theme":"..."}]}`;
}

// ── Rate limiting via Supabase ────────────────────────────────
async function checkRateLimit(ip, isPremium) {
  if (isPremium) return true;
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  try {
    const { data } = await supabase.from("rate_limits").select("count").eq("key", key).maybeSingle();
    const count = data?.count || 0;
    if (count >= 3) return false;
    await supabase.from("rate_limits").upsert({ key, count: count + 1, updated_at: new Date().toISOString() }, { onConflict: "key" });
    return true;
  } catch { return true; }
}

// ── Vérification Premium côté serveur ────────────────────────
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

// ── Parse JSON propre (strip markdown) ───────────────────────
function parseAIResponse(text) {
  let clean = text.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse IA non JSON");
  return JSON.parse(match[0]);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL || "https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    // Le client envoie des paramètres structurés, pas un prompt libre
    const { concours, mode, difficulty, theme, errorQuestions } = req.body;

    // Validation paramètres
    if (!concours || !ALLOWED_CONCOURS.has(concours))
      return res.status(400).json({ error: "Concours non reconnu" });
    if (!mode || !ALLOWED_MODES.has(mode))
      return res.status(400).json({ error: "Mode non reconnu" });
    if (difficulty !== undefined && !ALLOWED_DIFFICULTIES.has(Number(difficulty)))
      return res.status(400).json({ error: "Difficulté invalide" });
    if (theme && (typeof theme !== "string" || theme.length > 100))
      return res.status(400).json({ error: "Thème invalide" });

    const isPremium = await checkPremium(req.headers["authorization"]);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";

    if (!await checkRateLimit(ip, isPremium)) {
      return res.status(429).json({
        error: "Limite quotidienne atteinte",
        code: "RATE_LIMIT_EXCEEDED",
        message: "3 quiz/jour en version gratuite. Passez Premium pour un accès illimité !"
      });
    }

    // Construction du prompt côté serveur — le client ne contrôle pas le prompt
    const prompt = buildPrompt(concours, mode, Number(difficulty) || 2, theme, errorQuestions);

    const response = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

    // Parser et retourner du JSON propre (plus de markdown)
    try {
      const parsed = parseAIResponse(text);
      return res.status(200).json({ ...parsed, isPremium });
    } catch {
      // Fallback : retourner le texte brut si parsing échoue
      return res.status(200).json({ content: text, isPremium });
    }

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}
