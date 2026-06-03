// api/generate-bank.js — Endpoint pour pré-générer la banque de questions
// Appelé en tâche de fond, pas par l'utilisateur
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken:false, persistSession:false } }
);

const CONCOURS_LIST = [
  "aide_soignant","infirmier","auxiliaire","ambulancier","atsem",
  "pompier","police_nationale","gendarmerie","armee","ash",
  "adjoint_administratif","bac_assp","cap_aepe"
];

const CONCOURS_LABELS = {
  aide_soignant:"Aide-soignant", infirmier:"Infirmier (IFSI)",
  auxiliaire:"Auxiliaire de puériculture", ambulancier:"Ambulancier",
  atsem:"ATSEM", pompier:"Sapeur-Pompier",
  police_nationale:"Gardien de la Paix", gendarmerie:"Gendarme",
  armee:"Armée de Terre (EVAT)", ash:"Agent Hospitalier (ASH)",
  adjoint_administratif:"Adjoint administratif hôpital",
  bac_assp:"Bac Pro ASSP", cap_aepe:"CAP AEPE"
};

async function generateBatch(concours, difficulty) {
  const diff = difficulty===1?"débutant":difficulty===2?"intermédiaire":"expert";
  const label = CONCOURS_LABELS[concours];

  const prompt = `Expert concours paramédicaux français. Génère 10 QCM VARIÉS et ORIGINAUX pour "${label}", niveau ${diff}. Questions sur des aspects précis et peu connus du programme.
JSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer":"https://concourssante.fr"
    },
    body: JSON.stringify({
      model:"anthropic/claude-haiku-4-5",
      messages:[{role:"user",content:prompt}],
      max_tokens:3000
    })
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json/g,"").replace(/```/g,"").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON invalide");

  const parsed = JSON.parse(match[0]);
  return parsed.questions || [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Sécurité basique
  const auth = req.headers["x-admin-key"];
  if (auth !== process.env.ADMIN_KEY) return res.status(403).json({error:"Non autorisé"});

  const { concours, difficulty = 2, count = 1 } = req.body;
  const targets = concours ? [concours] : CONCOURS_LIST;

  let total = 0;
  const errors = [];

  for (const c of targets) {
    for (let i = 0; i < count; i++) {
      try {
        const questions = await generateBatch(c, difficulty);

        const rows = questions.map(q => ({
          concours: c,
          difficulty,
          theme: q.theme || null,
          question: q.q,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || null,
        }));

        const { error } = await supabase.from("question_bank").insert(rows);
        if (error) throw error;
        total += rows.length;

        // Pause entre les appels
        await new Promise(r => setTimeout(r, 1500));
      } catch(e) {
        errors.push(`${c}: ${e.message}`);
      }
    }
  }

  return res.status(200).json({ success:true, total, errors });
}
