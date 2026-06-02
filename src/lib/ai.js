// src/lib/ai.js
import { CONCOURS } from "./constants.js";
import { supabase }  from "./supabase.js";

const IS_DEV        = import.meta.env.DEV;
const PROXY_URL     = "/api/chat";
const OPENROUTER_URL= "https://openrouter.ai/api/v1/chat/completions";

async function getAuthHeader() {
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

function parseJSON(raw) {
  let text = raw.trim().replace(/```json/g,"").replace(/```/g,"").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) text = jsonMatch[0];
  return JSON.parse(text);
}

async function callProxy(prompt) {
  if (IS_DEV) {
    const res = await fetch(OPENROUTER_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        "HTTP-Referer":"https://concourssante.fr",
        "X-Title":"ConcoursSanté"
      },
      body: JSON.stringify({
        model:"anthropic/claude-sonnet-4-5",
        messages:[{ role:"user", content:prompt }],
        max_tokens:4000
      })
    });
    const data = await res.json();
    return parseJSON(data.choices[0].message.content);
  }

  const authHeader = await getAuthHeader();
  const headers = { "Content-Type":"application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(PROXY_URL, {
    method:"POST",
    headers,
    body:JSON.stringify({ prompt })
  });

  if (res.status === 429) {
    const d = await res.json();
    const e = new Error(d.message||"Limite atteinte");
    e.code = "RATE_LIMIT_EXCEEDED";
    throw e;
  }
  if (!res.ok) {
    const d = await res.json().catch(()=>({}));
    throw new Error(d.error||"Erreur IA. Réessayez.");
  }

  const data = await res.json();
  return parseJSON(data.content);
}

export async function generateQuiz(concours, difficulty, theme, errorMode=false, errorQuestions=[]) {
  const diff = difficulty===1?"débutant":difficulty===2?"intermédiaire":"expert";
  const themeText = theme
    ? `Thème : "${theme}".`
    : `Varie les thèmes parmi : ${CONCOURS[concours].themes.join(", ")}.`;
  let prompt;
  if (errorMode && errorQuestions.length) {
    const sample = errorQuestions.slice(-5).map(e=>e.q).join("\n- ");
    prompt = `Expert concours paramédicaux. L'étudiant a raté :\n- ${sample}\nGénère 10 QCM similaires pour "${CONCOURS[concours].label}" niveau ${diff}.\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;
  } else {
    prompt = `Expert concours paramédicaux français. Génère 10 QCM pour "${CONCOURS[concours].label}", niveau ${diff}. ${themeText}\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;
  }
  return callProxy(prompt);
}

export async function generateExamBlanc(concours) {
  const prompt = `Expert concours paramédicaux. Examen blanc 20 QCM pour "${CONCOURS[concours].label}", difficile, thèmes variés.\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;
  return callProxy(prompt);
}

export async function generateFlashcards(concours, theme) {
  const t = theme || CONCOURS[concours].themes[0];
  const prompt = `Expert concours paramédicaux. 8 flashcards pour "${CONCOURS[concours].label}" sur "${t}".\nJSON uniquement: {"flashcards":[{"question":"...","answer":"...","theme":"..."}]}`;
  return callProxy(prompt);
}

class QuizPreloader {
  constructor() { this.cache = new Map(); this.pending = new Map(); }
  _key(c,d,t) { return `${c}:${d}:${t||"any"}`; }
  preload(c,d,t) {
    const k = this._key(c,d,t);
    if (this.cache.has(k)||this.pending.has(k)) return;
    const p = generateQuiz(c,d,t)
      .then(data=>{ this.cache.set(k,data); this.pending.delete(k); })
      .catch(()=>this.pending.delete(k));
    this.pending.set(k,p);
  }
  async get(c,d,t) {
    const k = this._key(c,d,t);
    if (this.cache.has(k)) { const data=this.cache.get(k); this.cache.delete(k); return data; }
    if (this.pending.has(k)) {
      await this.pending.get(k);
      if (this.cache.has(k)) { const data=this.cache.get(k); this.cache.delete(k); return data; }
    }
    return generateQuiz(c,d,t);
  }
}
export const quizPreloader = new QuizPreloader();
