// generate-questions.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Lire le .env.local automatiquement
for (const envFile of [".env.local", ".env"]) {
  try {
    const env = readFileSync(resolve(envFile), "utf8");
    env.split("\n").forEach(line => {
      const [key, ...vals] = line.split("=");
      if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
    });
    break;
  } catch {}
}

const SUPABASE_URL   = "https://xmtvzcngscamhkylxuwp.supabase.co";
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL          = "anthropic/claude-haiku-4-5";

if (!SUPABASE_KEY) { console.error("❌ SUPABASE_SERVICE_ROLE_KEY manquante"); process.exit(1); }
if (!OPENROUTER_KEY) { console.error("❌ OPENROUTER_API_KEY manquante"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONCOURS = {
  infirmier:        { label: "Infirmier (IFSI)",            themes: ["Biologie", "Anatomie", "Soins infirmiers", "Pharmacologie", "Psychologie"] },
  aide_soignant:    { label: "Aide-soignant",               themes: ["Hygiène", "Soins de base", "Anatomie", "Communication", "Éthique"] },
  auxiliaire:       { label: "Auxiliaire de puériculture",  themes: ["Pédiatrie", "Nutrition", "Développement enfant", "Soins", "Hygiène"] },
  ambulancier:      { label: "Ambulancier",                 themes: ["Secourisme", "Anatomie", "Transport sanitaire", "Réglementation", "Urgences"] },
  atsem:            { label: "ATSEM",                       themes: ["Petite enfance", "Hygiène", "Développement enfant", "Travail en équipe", "Sécurité"] },
  ash:              { label: "Agent de service hospitalier",themes: ["Hygiène hospitalière", "Nettoyage", "Sécurité", "Communication", "Éthique"] },
  pompier:          { label: "Sapeur-pompier",              themes: ["Secourisme", "Lutte incendie", "Réglementation", "Organisation", "Physique"] },
  gendarmerie:      { label: "Gendarme",                    themes: ["Droit pénal", "Procédure pénale", "Institutions", "Culture générale", "Sport"] },
  police_nationale: { label: "Police nationale",            themes: ["Droit", "Procédure", "Institutions", "Culture générale", "Éthique"] },
  armee:            { label: "Armée de Terre",              themes: ["Histoire militaire", "Géographie", "Physique", "Culture générale", "Citoyenneté"] },
  cap_aepe:         { label: "CAP AEPE",                    themes: ["Développement enfant", "Nutrition", "Hygiène", "Jeux éducatifs", "Famille"] },
  bac_assp:         { label: "Bac Pro ASSP",                themes: ["Biologie", "Soins", "Nutrition", "Ergonomie", "Éthique"] },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJSON(raw) {
  let text = raw.trim().replace(/```json/g, "").replace(/```/g, "").trim();
  // Trouver le tableau questions directement
  const match = text.match(/\{[\s\S]*"questions"\s*:\s*\[[\s\S]*\]/);
  if (!match) throw new Error("Pas de JSON valide trouvé");
  let jsonText = match[0];
  // Fermer le JSON proprement
  if (!jsonText.endsWith("}")) jsonText += "}";
  try {
    return JSON.parse(jsonText);
  } catch {
    // Réparer le JSON tronqué : trouver le dernier objet complet
    const questionsMatch = jsonText.match(/\{[\s\S]*"questions"\s*:\s*\[/);
    if (!questionsMatch) throw new Error("Structure JSON invalide");
    const start = questionsMatch[0];
    const itemsText = jsonText.slice(start.length);
    // Extraire les objets complets
    const items = [];
    let depth = 0, current = "", inString = false, escape = false;
    for (const ch of itemsText) {
      if (escape) { current += ch; escape = false; continue; }
      if (ch === "\\") { current += ch; escape = true; continue; }
      if (ch === '"') inString = !inString;
      if (!inString) {
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) { current += ch; try { items.push(JSON.parse(current)); } catch {} current = ""; continue; }
        }
      }
      if (depth > 0 || ch === "{") current += ch;
    }
    if (!items.length) throw new Error("Aucun objet JSON valide");
    return { questions: items };
  }
}

async function callAI(prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://concourssante.fr",
      "X-Title": "ConcoursSanté"
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 5000 })
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseJSON(data.choices[0].message.content);
}

async function generateAndInsert(concoursKey, label, themes, difficulty) {
  const diffLabel = difficulty === 1
    ? "DÉBUTANT — questions simples, notions fondamentales, vocabulaire de base"
    : "EXPERT — questions pointues, cas pratiques complexes, détails techniques avancés";

  const prompt = `Expert concours professionnels français. Génère exactement 20 QCM pour "${label}".
Niveau : ${diffLabel}
Thèmes à varier : ${themes.join(", ")}
IMPORTANT : Génère exactement 20 questions complètes. JSON uniquement, pas de texte avant ou après.
{"questions":[{"q":"...","options":["A...","B...","C...","D..."],"answer":0,"explanation":"...","theme":"..."}]}`;

  const data = await callAI(prompt);
  const questions = data.questions;
  if (!questions?.length) throw new Error("Aucune question générée");

  const rows = questions.map(q => ({
    concours: concoursKey, difficulty,
    theme: q.theme || "Général",
    question: q.q, options: q.options,
    answer: q.answer ?? 0, explanation: q.explanation
  }));

  const { error } = await supabase.from("question_bank").insert(rows);
  if (error) throw new Error(`Supabase: ${JSON.stringify(error)}`);
  return rows.length;
}

async function main() {
  console.log("🚀 Génération 20 questions par concours par difficulté\n");
  let total = 0, errors = [];

  for (const [key, { label, themes }] of Object.entries(CONCOURS)) {
    for (const diff of [1, 2, 3]) {
      process.stdout.write(`⏳ ${label} — ${diff === 1 ? "Facile" : "Difficile"}... `);
      try {
        const count = await generateAndInsert(key, label, themes, diff);
        total += count;
        console.log(`✅ ${count} questions`);
        await sleep(2500);
      } catch (err) {
        console.log(`❌ ${err.message}`);
        errors.push(`${key} diff${diff}: ${err.message}`);
        await sleep(3000);
      }
    }
  }

  console.log(`\n✅ ${total} questions insérées au total`);
  if (errors.length) { console.log(`⚠️ ${errors.length} erreurs:`); errors.forEach(e => console.log(`  - ${e}`)); }
}

main().catch(console.error);
