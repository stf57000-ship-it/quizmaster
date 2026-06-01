import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xmtvzcngscamhkylxuwp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdHZ6Y25nc2NhbWhreWx4dXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzYyODUsImV4cCI6MjA5NTgxMjI4NX0.ySOl92V4yeKhLjQmZ4EHRt90LhGMgXa8NImMwTS_FBo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

const CONCOURS = {
  aide_soignant: { label: "Aide-soignant", icon: "👩‍⚕️", color: "#1DB8A4", colorLight: "#E8F9F7", themes: ["Hygiène et soins", "Anatomie de base", "Situations cliniques", "Culture sanitaire & sociale", "Éthique et déontologie"] },
  infirmier: { label: "Infirmier (IFSI)", icon: "💉", color: "#2E86AB", colorLight: "#E6F4FB", themes: ["Biologie et sciences", "Mathématiques", "Raisonnement logique", "Culture générale santé", "Situations cliniques avancées"] },
  auxiliaire: { label: "Auxiliaire de puériculture", icon: "👶", color: "#7B61FF", colorLight: "#F0EEFF", themes: ["Développement de l'enfant", "Puériculture", "Hygiène infantile", "Psychologie de l'enfant", "Législation petite enfance"] },
  ambulancier: { label: "Ambulancier", icon: "🚑", color: "#FF6B35", colorLight: "#FFF0EB", themes: ["Premiers secours", "Anatomie et physiologie", "Réglementation transport", "Gestes d'urgence", "Communication patient"] },
  atsem: { label: "ATSEM", icon: "🏫", color: "#E8A838", colorLight: "#FEF5E7", themes: ["Fonction publique", "Pédagogie maternelle", "Hygiène et sécurité", "Culture générale", "Législation éducation"] }
};

const BADGES = [
  { id: "first_quiz", icon: "🎯", label: "Premier quiz", desc: "Ton tout premier quiz !", condition: s => s.totalQuizzes >= 1 },
  { id: "streak_3", icon: "🔥", label: "3 jours de suite", desc: "3 jours consécutifs", condition: s => s.streak >= 3 },
  { id: "streak_7", icon: "⚡", label: "Semaine de feu", desc: "7 jours consécutifs !", condition: s => s.streak >= 7 },
  { id: "perfect_score", icon: "💎", label: "Score parfait", desc: "100% à un quiz !", condition: s => s.hasPerfect },
  { id: "ten_quizzes", icon: "📚", label: "Assidu", desc: "10 quiz complétés", condition: s => s.totalQuizzes >= 10 },
  { id: "exam_blanc", icon: "📋", label: "Examen blanc", desc: "Premier examen blanc", condition: s => s.examCount >= 1 },
  { id: "exam_80", icon: "🏆", label: "Major de promo", desc: "80%+ à un examen blanc", condition: s => s.bestExamScore >= 80 },
  { id: "all_concours", icon: "🌟", label: "Polyvalent", desc: "Tous les concours testés", condition: s => Object.keys(s.concoursPlayed || {}).length >= 5 },
];

// ── LOCAL STORAGE ─────────────────────────────────────────────
function loadLocal() { try { return JSON.parse(localStorage.getItem("cs_v5") || "{}"); } catch { return {}; } }
function saveLocal(s) { try { localStorage.setItem("cs_v5", JSON.stringify(s)); } catch {} }
function getStreak(state) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (!state.lastDay) return 0;
  if (state.lastDay === today) return state.streak || 1;
  if (state.lastDay === yesterday) return state.streak || 1;
  return 0;
}
function updateStreak(state) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let streak = 1;
  if (state.lastDay === today) streak = state.streak || 1;
  else if (state.lastDay === yesterday) streak = (state.streak || 0) + 1;
  return { ...state, lastDay: today, streak, totalQuizzes: (state.totalQuizzes || 0) + 1 };
}
function addError(state, concours, question) {
  const errors = state.errors || {};
  const list = errors[concours] || [];
  if (!list.find(e => e.q === question.q)) list.push(question);
  if (list.length > 30) list.shift();
  return { ...state, errors: { ...errors, [concours]: list } };
}
function checkNewBadges(oldState, newState) {
  const earned = newState.earnedBadges || [];
  return BADGES.filter(b => !earned.includes(b.id) && b.condition(newState));
}

// ── API ──────────────────────────────────────────────────────
async function callAI(prompt) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "HTTP-Referer": "https://concourssante.fr", "X-Title": "ConcoursSanté" },
    body: JSON.stringify({ model: "anthropic/claude-haiku-4-5", messages: [{ role: "user", content: prompt }], max_tokens: 2000 })
  });
  const data = await res.json();
  const text = data.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function generateQuiz(concours, difficulty, theme, errorMode = false, errorQuestions = []) {
  const diffLabel = difficulty === 1 ? "débutant" : difficulty === 2 ? "intermédiaire" : "expert";
  const themeText = theme ? `Thème : "${theme}".` : `Varie les thèmes parmi : ${CONCOURS[concours].themes.join(", ")}.`;
  let prompt;
  if (errorMode && errorQuestions.length > 0) {
    const sample = errorQuestions.slice(-5).map(e => e.q).join("\n- ");
    prompt = `Expert concours paramédicaux. L'étudiant a raté :\n- ${sample}\nGénère 10 QCM similaires pour "${CONCOURS[concours].label}" niveau ${diffLabel}.\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;
  } else {
    prompt = `Expert concours paramédicaux français. Génère 10 QCM pour "${CONCOURS[concours].label}", niveau ${diffLabel}. ${themeText}\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`;
  }
  return callAI(prompt);
}

async function generateExamBlanc(concours) {
  return callAI(`Expert concours paramédicaux. Examen blanc 20 QCM pour "${CONCOURS[concours].label}", difficile, thèmes variés.\nJSON uniquement: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","theme":"..."}]}`);
}

async function generateFlashcards(concours, theme) {
  const t = theme || CONCOURS[concours].themes[0];
  return callAI(`Expert concours paramédicaux. 8 flashcards pour "${CONCOURS[concours].label}" sur "${t}".\nJSON uniquement: {"flashcards":[{"question":"...","answer":"...","theme":"..."}]}`);
}

// ── SUPABASE HELPERS ─────────────────────────────────────────
async function saveProgressToCloud(user, localState) {
  if (!user) return;
  await supabase.from("user_progress").upsert({
    user_id: user.id,
    streak: localState.streak || 0,
    total_quizzes: localState.totalQuizzes || 0,
    total_correct: localState.totalCorrect || 0,
    total_answered: localState.totalAnswered || 0,
    best_score: localState.bestScore || 0,
    earned_badges: localState.earnedBadges || [],
    concours_played: localState.concoursPlayed || {},
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
}

async function loadProgressFromCloud(user) {
  if (!user) return null;
  try {
    const { data, error } = await supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle();
    if (error || !data) return null;
    return {
      streak: data.streak,
      totalQuizzes: data.total_quizzes,
      totalCorrect: data.total_correct,
      totalAnswered: data.total_answered,
      bestScore: data.best_score,
      earnedBadges: data.earned_badges || [],
      concoursPlayed: data.concours_played || {},
    };
  } catch { return null; }
}

// ── COMPONENTS ───────────────────────────────────────────────
function BadgeNotification({ badge, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", bottom:90, right:20, background:"#fff", border:"2px solid #FFB800", borderRadius:18, padding:"14px 18px", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:1000, display:"flex", alignItems:"center", gap:12, maxWidth:280, animation:"slideUp 0.4s ease" }}>
      <div style={{ fontSize:32 }}>{badge.icon}</div>
      <div>
        <div style={{ fontSize:"0.68rem", color:"#FFB800", fontWeight:700, letterSpacing:1, fontFamily:"'Cabinet Grotesk',sans-serif", textTransform:"uppercase" }}>Badge débloqué !</div>
        <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, color:"#0A2342", fontSize:"0.9rem" }}>{badge.label}</div>
        <div style={{ fontSize:"0.75rem", color:"#8899AA" }}>{badge.desc}</div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onSuccess }) {
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleAuth = async () => {
    setLoading(true); setError(null);
    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess(data.user);
      } else if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        setSuccess("Compte créé ! Vérifiez votre email pour confirmer.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://concourssante.fr" });
        if (error) throw error;
        setSuccess("Email de réinitialisation envoyé !");
      }
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,35,66,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:24, padding:32, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(10,35,66,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:"1.3rem", color:"#0A2342" }}>
            {authMode === "login" ? "Connexion" : authMode === "register" ? "Créer un compte" : "Mot de passe oublié"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem", color:"#8899AA" }}>✕</button>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:24, background:"rgba(10,35,66,0.04)", borderRadius:12, padding:4 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => setAuthMode(m)} style={{ flex:1, padding:"8px", borderRadius:9, border:"none", cursor:"pointer", background:authMode===m?"#fff":"transparent", fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:700, fontSize:"0.85rem", color:authMode===m?"#0A2342":"#8899AA", boxShadow:authMode===m?"0 2px 8px rgba(10,35,66,0.1)":"none", transition:"all 0.2s" }}>
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {authMode === "register" && (
            <input placeholder="Prénom" value={name} onChange={e=>setName(e.target.value)} style={{ padding:"12px 16px", borderRadius:10, border:"1.5px solid rgba(10,35,66,0.15)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", outline:"none" }} />
          )}
          <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ padding:"12px 16px", borderRadius:10, border:"1.5px solid rgba(10,35,66,0.15)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", outline:"none" }} />
          {authMode !== "forgot" && (
            <input placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ padding:"12px 16px", borderRadius:10, border:"1.5px solid rgba(10,35,66,0.15)", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", outline:"none" }} />
          )}
        </div>

        {error && <div style={{ marginTop:12, background:"#FEE", border:"1px solid #FCC", borderRadius:8, padding:"10px 14px", fontSize:"0.85rem", color:"#C00" }}>{error}</div>}
        {success && <div style={{ marginTop:12, background:"#E8F9F7", border:"1px solid #1DB8A4", borderRadius:8, padding:"10px 14px", fontSize:"0.85rem", color:"#0D8070" }}>{success}</div>}

        <button onClick={handleAuth} disabled={loading} style={{ marginTop:20, width:"100%", padding:"13px", background:"#1DB8A4", color:"#fff", border:"none", borderRadius:12, fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, fontSize:"0.95rem", cursor:"pointer" }}>
          {loading ? "..." : authMode === "login" ? "Se connecter" : authMode === "register" ? "Créer mon compte" : "Envoyer"}
        </button>

        {authMode === "login" && (
          <button onClick={() => setAuthMode("forgot")} style={{ marginTop:12, width:"100%", background:"none", border:"none", cursor:"pointer", fontSize:"0.82rem", color:"#8899AA", fontFamily:"'DM Sans',sans-serif" }}>
            Mot de passe oublié ?
          </button>
        )}
      </div>
    </div>
  );
}

function PricingModal({ onClose, user }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,35,66,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:24, padding:32, width:"100%", maxWidth:500, boxShadow:"0 20px 60px rgba(10,35,66,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:"1.3rem", color:"#0A2342" }}>Passer Premium</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem", color:"#8899AA" }}>✕</button>
        </div>
        <p style={{ color:"#8899AA", fontSize:"0.88rem", marginBottom:24 }}>Accès illimité à toutes les fonctionnalités</p>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
          <div style={{ background:"rgba(10,35,66,0.03)", border:"1px solid rgba(10,35,66,0.1)", borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:700, fontSize:"0.8rem", color:"#8899AA", letterSpacing:1, marginBottom:12, textTransform:"uppercase" }}>Gratuit</div>
            <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:"2rem", color:"#0A2342", marginBottom:16 }}>0€</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:"0.82rem", color:"#8899AA" }}>
              <div>✓ 3 quiz/jour</div>
              <div>✓ 5 concours</div>
              <div>✓ Scores</div>
              <div style={{ color:"#DDD" }}>✗ Quiz illimités</div>
              <div style={{ color:"#DDD" }}>✗ Progression cloud</div>
              <div style={{ color:"#DDD" }}>✗ Examens blancs illimités</div>
            </div>
          </div>
          <div style={{ background:"#0A2342", borderRadius:16, padding:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:12, right:12, background:"#FF6B35", color:"#fff", borderRadius:20, padding:"3px 10px", fontSize:"0.7rem", fontWeight:700 }}>⭐ Populaire</div>
            <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:700, fontSize:"0.8rem", color:"rgba(29,184,164,0.8)", letterSpacing:1, marginBottom:12, textTransform:"uppercase" }}>Premium</div>
            <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:"2rem", color:"#fff", marginBottom:4 }}>9€</div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.4)", marginBottom:16 }}>/mois · sans engagement</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:"0.82rem", color:"rgba(255,255,255,0.8)" }}>
              <div>✓ Quiz illimités</div>
              <div>✓ Progression cloud</div>
              <div>✓ Examens blancs illimités</div>
              <div>✓ Flashcards illimitées</div>
              <div>✓ Statistiques avancées</div>
            </div>
          </div>
        </div>

        <button style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg, #1DB8A4, #2E86AB)", color:"#fff", border:"none", borderRadius:12, fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, fontSize:"1rem", cursor:"pointer" }}
          onClick={() => { alert("Intégration Stripe coming soon ! Revenez dans quelques jours."); onClose(); }}>
          🚀 Commencer l'essai gratuit 7 jours
        </button>
        <p style={{ textAlign:"center", fontSize:"0.75rem", color:"#C0D0D8", marginTop:12 }}>Sans carte bancaire · Résiliable à tout moment</p>
      </div>
    </div>
  );
}

function ProgressRing({ value, max, color, size = 80 }) {
  const pct = Math.min(value / max, 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(10,35,66,0.08)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

function WeekChart({ history }) {
  const days = ["L","M","M","J","V","S","D"];
  const last7 = Array(7).fill(null).map((_, i) => {
    const d = new Date(Date.now() - (6-i) * 86400000).toDateString();
    return history?.[d] || null;
  });
  const max = Math.max(...last7.filter(Boolean).map(d => d.score || 0), 1);
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80 }}>
      {last7.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", background:d?"#1DB8A4":"rgba(10,35,66,0.06)", borderRadius:6, height:d?`${Math.max((d.score/max)*60,8)}px`:"8px", transition:"height 0.5s ease", minHeight:8 }}></div>
          <div style={{ fontSize:"0.65rem", color:"#8899AA", fontFamily:"monospace" }}>{days[i]}</div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState(loadLocal);
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("quiz");
  const [activeTab, setActiveTab] = useState("quiz");
  const [selectedConcours, setSelectedConcours] = useState(null);
  const [difficulty, setDifficulty] = useState(2);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const [newBadge, setNewBadge] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const timerRef = useRef(null);
  const examTimerRef = useRef(null);

  const loadingMessages = ["L'IA analyse les référentiels...", "Génération des questions...", "Vérification pédagogique...", "Presque prêt..."];

  // Auth check on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cloud progress when user logs in
  useEffect(() => {
    if (user) {
      loadProgressFromCloud(user).then(cloudData => {
        if (cloudData) {
          setAppState(prev => ({ ...prev, ...cloudData }));
          setSyncStatus("synced");
        }
      });
    }
  }, [user]);

  // Save to local storage
  useEffect(() => { saveLocal(appState); }, [appState]);

  // Sync to cloud periodically
  useEffect(() => {
    if (user && appState.totalQuizzes > 0) {
      const t = setTimeout(() => {
        saveProgressToCloud(user, appState).then(() => setSyncStatus("synced"));
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [appState, user]);

  useEffect(() => {
    if (loading) {
      const i = setInterval(() => setLoadingMsg(m => (m+1)%4), 1800);
      return () => clearInterval(i);
    }
  }, [loading]);

  useEffect(() => {
    if (screen === "quiz" && !revealed) {
      setTimeLeft(25);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => { if (t<=1){clearInterval(timerRef.current);handleAnswer(-1);return 0;} return t-1; });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, current, revealed]);

  useEffect(() => {
    if (screen === "exam" && examTimeLeft > 0) {
      examTimerRef.current = setInterval(() => {
        setExamTimeLeft(t => { if (t<=1){clearInterval(examTimerRef.current);finishQuiz();return 0;} return t-1; });
      }, 1000);
    }
    return () => clearInterval(examTimerRef.current);
  }, [screen, examTimeLeft]);

  const updateAppState = (updater) => {
    setAppState(prev => {
      const next = typeof updater === "function" ? updater(prev) : {...prev,...updater};
      const nb = checkNewBadges(prev, next);
      if (nb.length > 0) {
        next.earnedBadges = [...(next.earnedBadges||[]), ...nb.map(b=>b.id)];
        setNewBadge(nb[0]);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const startSession = async (m = mode) => {
    setLoading(true); setError(null);
    try {
      let data;
      if (m === "exam") {
        data = await generateExamBlanc(selectedConcours);
        setExamTimeLeft(25*60);
        setScreen("exam");
      } else if (m === "errors") {
        const errs = (appState.errors||{})[selectedConcours]||[];
        if (errs.length===0){setError("Pas encore d'erreurs pour ce concours !");setLoading(false);return;}
        data = await generateQuiz(selectedConcours, difficulty, null, true, errs);
        setScreen("quiz");
      } else if (m === "flashcards") {
        const fc = await generateFlashcards(selectedConcours, selectedTheme);
        setFlashcards(fc.flashcards); setFcIndex(0); setFcFlipped(false);
        setScreen("flashcards"); setLoading(false); return;
      } else {
        data = await generateQuiz(selectedConcours, difficulty, selectedTheme);
        setScreen("quiz");
      }
      setQuestions(data.questions);
      setCurrent(0); setScore(0); setAnswers([]); setSelected(null); setRevealed(false);
      updateAppState(s => ({...updateStreak(s), concoursPlayed:{...(s.concoursPlayed||{}), [selectedConcours]:true}}));
    } catch(e) {
      setError("Impossible de générer. Réessayez.");
    } finally { setLoading(false); }
  };

  const handleAnswer = (idx) => {
    if (revealed) return;
    clearInterval(timerRef.current);
    setSelected(idx); setRevealed(true);
    const correct = idx === questions[current].answer;
    if (correct) setScore(s=>s+1);
    const newAnswers = [...answers, {selected:idx, correct:questions[current].answer, isCorrect:correct}];
    setAnswers(newAnswers);
    if (!correct) updateAppState(s => addError(s, selectedConcours, questions[current]));
  };

  const nextQuestion = () => {
    if (current+1 >= questions.length){finishQuiz();return;}
    setCurrent(c=>c+1); setSelected(null); setRevealed(false);
  };

  const finishQuiz = () => {
    clearInterval(examTimerRef.current);
    const finalScore = Math.round((score/questions.length)*100);
    const today = new Date().toDateString();
    updateAppState(s => {
      const history = s.history||{};
      const dayH = history[today]||{score:0,quizzes:0};
      const isExam = screen==="exam";
      return {
        ...s,
        history:{...history,[today]:{score:Math.max(dayH.score,finalScore),quizzes:dayH.quizzes+1}},
        hasPerfect: s.hasPerfect||finalScore===100,
        examCount: isExam?(s.examCount||0)+1:s.examCount||0,
        bestExamScore: isExam?Math.max(s.bestExamScore||0,finalScore):s.bestExamScore||0,
        bestScore: Math.max(s.bestScore||0,finalScore),
        totalCorrect: (s.totalCorrect||0)+score,
        totalAnswered: (s.totalAnswered||0)+questions.length,
      };
    });
    setScreen(screen==="exam"?"examResult":"result");
  };

  const concours = selectedConcours ? CONCOURS[selectedConcours] : null;
  const q = questions[current];
  const percent = questions.length ? Math.round((score/questions.length)*100) : 0;
  const streak = getStreak(appState);
  const totalErrors = Object.values(appState.errors||{}).reduce((a,b)=>a+b.length,0);
  const earnedBadges = BADGES.filter(b=>(appState.earnedBadges||[]).includes(b.id));
  const globalAccuracy = appState.totalAnswered>0 ? Math.round((appState.totalCorrect/appState.totalAnswered)*100) : 0;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidat";

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#D0E8E5;border-radius:3px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{animation:fadeUp 0.4s ease forwards}
    .fade-in{animation:fadeIn 0.3s ease forwards}
    .slide-in{animation:slideIn 0.35s ease forwards}
    .btn{font-family:'Cabinet Grotesk',sans-serif;font-weight:800;border:none;border-radius:12px;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;display:inline-flex;align-items:center;gap:8px}
    .btn:hover{transform:translateY(-2px)}.btn:active{transform:translateY(0)}
    .btn-primary{background:#0A2342;color:#fff;padding:13px 24px;font-size:0.92rem}
    .btn-primary:hover{box-shadow:0 8px 24px rgba(10,35,66,0.3)}
    .btn-teal{background:#1DB8A4;color:#fff;padding:13px 24px;font-size:0.92rem}
    .btn-teal:hover{box-shadow:0 8px 24px rgba(29,184,164,0.4)}
    .btn-orange{background:#FF6B35;color:#fff;padding:13px 24px;font-size:0.92rem}
    .btn-ghost{background:transparent;border:1.5px solid rgba(10,35,66,0.15);color:#8899AA;padding:9px 16px;font-size:0.84rem}
    .btn-ghost:hover{border-color:#0A2342;color:#0A2342;transform:none}
    .card{background:#fff;border:1px solid rgba(10,35,66,0.08);border-radius:18px;padding:20px}
    .tab-btn{background:transparent;border:none;cursor:pointer;padding:10px 4px;font-family:'Cabinet Grotesk',sans-serif;font-size:0.78rem;font-weight:700;color:#8899AA;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color 0.2s;flex:1}
    .tab-btn.active{color:#1DB8A4}
    .tab-btn .tab-icon{font-size:20px}
  `;

  if (userLoading) return (
    <div style={{minHeight:"100vh",background:"#F8FFFE",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{styles}</style>
      <div style={{width:48,height:48,border:"3px solid rgba(29,184,164,0.2)",borderTop:"3px solid #1DB8A4",borderRadius:"50%",animation:"spin 1s linear infinite"}}></div>
    </div>
  );

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#F8FFFE",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{styles}</style>
      <div style={{position:"relative"}}>
        <div style={{width:68,height:68,border:"3px solid rgba(29,184,164,0.2)",borderTop:"3px solid #1DB8A4",borderRadius:"50%",animation:"spin 1s linear infinite"}}></div>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:24}}>{concours?.icon||"🩺"}</div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"1.05rem",color:"#0A2342",marginBottom:6}}>{mode==="exam"?"Préparation examen blanc...":mode==="flashcards"?"Génération des flashcards...":mode==="errors"?"Analyse des erreurs...":"Génération du quiz..."}</div>
        <div style={{color:"#8899AA",fontSize:"0.85rem"}}>{loadingMessages[loadingMsg]}</div>
      </div>
    </div>
  );

  if (screen === "flashcards") {
    const fc = flashcards[fcIndex];
    return (
      <div style={{minHeight:"100vh",background:"#F8FFFE",fontFamily:"'DM Sans',sans-serif"}}>
        <style>{styles}</style>
        <div style={{background:"#fff",borderBottom:"1px solid rgba(10,35,66,0.08)",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="btn btn-ghost" onClick={()=>setScreen("home")} style={{padding:"7px 14px"}}>← Retour</button>
          <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#0A2342"}}>🗂️ Flashcards</div>
          <div style={{fontFamily:"monospace",fontSize:"0.82rem",color:"#8899AA"}}>{fcIndex+1}/{flashcards.length}</div>
        </div>
        <div style={{maxWidth:600,margin:"0 auto",padding:"36px 20px"}}>
          <div style={{display:"flex",gap:4,marginBottom:24}}>
            {flashcards.map((_,i)=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=fcIndex?concours.color:"rgba(10,35,66,0.08)",transition:"background 0.3s"}}></div>))}
          </div>
          <div onClick={()=>setFcFlipped(f=>!f)} style={{background:fcFlipped?concours.colorLight:"#fff",border:`2px solid ${fcFlipped?concours.color:"rgba(10,35,66,0.1)"}`,borderRadius:24,padding:"36px 28px",minHeight:200,cursor:"pointer",transition:"all 0.4s",textAlign:"center",marginBottom:20,boxShadow:"0 8px 32px rgba(10,35,66,0.08)"}}>
            <div style={{fontSize:"0.7rem",letterSpacing:2,color:fcFlipped?concours.color:"#8899AA",fontWeight:700,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif",marginBottom:14}}>{fcFlipped?"✓ Réponse":"? Question"} · {fc?.theme}</div>
            <p style={{fontFamily:"'Instrument Serif',serif",fontStyle:"italic",fontSize:"1.1rem",color:"#0A2342",lineHeight:1.65}}>{fcFlipped?fc?.answer:fc?.question}</p>
            <div style={{marginTop:18,fontSize:"0.76rem",color:"#C0D0D8"}}>{fcFlipped?"Cliquer pour revoir":"Cliquer pour la réponse"}</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-ghost" onClick={()=>{if(fcIndex>0){setFcIndex(i=>i-1);setFcFlipped(false);}}} disabled={fcIndex===0} style={{flex:1,justifyContent:"center",opacity:fcIndex===0?0.4:1}}>← Précédente</button>
            {fcIndex<flashcards.length-1?<button className="btn btn-teal" onClick={()=>{setFcIndex(i=>i+1);setFcFlipped(false);}} style={{flex:1,justifyContent:"center"}}>Suivante →</button>:<button className="btn btn-primary" onClick={()=>setScreen("home")} style={{flex:1,justifyContent:"center"}}>Terminer ✓</button>}
          </div>
        </div>
      </div>
    );
  }

  if ((screen==="quiz"||screen==="exam") && q) {
    const isExam = screen==="exam";
    const examMins = Math.floor(examTimeLeft/60);
    const examSecs = examTimeLeft%60;
    const timerColor = timeLeft>10?concours.color:timeLeft>5?"#E8A838":"#E74C3C";
    return (
      <div style={{minHeight:"100vh",background:"#F8FFFE",fontFamily:"'DM Sans',sans-serif"}}>
        <style>{styles}</style>
        <div style={{height:4,background:"rgba(10,35,66,0.08)",position:"sticky",top:0,zIndex:100}}>
          {isExam?<div style={{height:"100%",width:`${Math.round((examTimeLeft/1500)*100)}%`,background:examTimeLeft<300?"#E74C3C":"#2E86AB",transition:"width 1s linear"}}></div>:<div style={{height:"100%",width:`${Math.round((timeLeft/25)*100)}%`,background:timerColor,transition:"width 1s linear"}}></div>}
        </div>
        <div style={{maxWidth:680,margin:"0 auto",padding:"22px 20px 48px"}} className="fade-in">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <button className="btn btn-ghost" onClick={()=>{clearInterval(timerRef.current);clearInterval(examTimerRef.current);setScreen("home");}} style={{padding:"7px 14px"}}>← Quitter</button>
            <div style={{display:"flex",gap:8}}>
              {isExam&&<div style={{background:examTimeLeft<300?"#FEE":"#EEF",border:`1px solid ${examTimeLeft<300?"#FCC":"#CCD"}`,borderRadius:20,padding:"5px 12px",fontSize:"0.8rem",fontFamily:"monospace",fontWeight:700,color:examTimeLeft<300?"#E74C3C":"#2E86AB"}}>⏱ {examMins}:{examSecs.toString().padStart(2,"0")}</div>}
              <div style={{background:"#fff",border:"1px solid rgba(10,35,66,0.1)",borderRadius:20,padding:"5px 12px",fontSize:"0.8rem",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:700,color:"#0A2342"}}>{score} pts</div>
              {!isExam&&<div style={{background:timeLeft<=5?"#FEE":"#fff",border:`1px solid ${timeLeft<=5?"#FCC":"rgba(10,35,66,0.1)"}`,borderRadius:20,padding:"5px 12px",fontSize:"0.8rem",fontFamily:"monospace",fontWeight:700,color:timerColor}}>⏱ {timeLeft}s</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:18}}>
            {questions.map((_,i)=>(<div key={i} style={{flex:1,height:4,borderRadius:2,transition:"all 0.3s",background:answers[i]!==undefined?(answers[i].isCorrect?concours.color:"#E74C3C"):i===current?`${concours.color}55`:"rgba(10,35,66,0.08)"}}></div>))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",gap:6}}>
              <div style={{background:concours.colorLight,borderRadius:8,padding:"3px 9px",fontSize:"0.74rem",color:concours.color,fontWeight:700,fontFamily:"'Cabinet Grotesk',sans-serif"}}>{concours.icon} {concours.label}</div>
              {q.theme&&<div style={{background:"rgba(10,35,66,0.05)",borderRadius:8,padding:"3px 9px",fontSize:"0.72rem",color:"#8899AA"}}>{q.theme}</div>}
            </div>
            <div style={{fontSize:"0.78rem",color:"#8899AA",fontFamily:"monospace"}}>{current+1}/{questions.length}</div>
          </div>
          <div className="slide-in" style={{background:"#fff",border:"1px solid rgba(10,35,66,0.08)",borderRadius:18,padding:"22px 20px",marginBottom:14,boxShadow:"0 4px 16px rgba(10,35,66,0.05)"}}>
            <p style={{fontFamily:"'Instrument Serif',serif",fontStyle:"italic",fontSize:"1.1rem",color:"#0A2342",lineHeight:1.65}}>{q.q}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {q.options.map((opt,i)=>{
              let bg="#fff",border="rgba(10,35,66,0.1)",color="#0A2342";
              if(revealed){if(i===q.answer){bg=`${concours.color}15`;border=concours.color;color=concours.color;}else if(i===selected&&i!==q.answer){bg="#FEE";border="#E74C3C";color="#E74C3C";}else{color="#8899AA";}}else if(selected===i){bg="rgba(10,35,66,0.05)";border="#0A2342";}
              return(<button key={i} onClick={()=>handleAnswer(i)} disabled={revealed} style={{background:bg,border:`2px solid ${border}`,borderRadius:12,padding:"12px 16px",color,textAlign:"left",cursor:revealed?"default":"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",fontWeight:500,fontSize:"0.9rem",display:"flex",gap:10,alignItems:"center"}}
                onMouseEnter={e=>{if(!revealed)e.currentTarget.style.transform="translateX(3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
                <span style={{fontFamily:"monospace",fontSize:"0.74rem",opacity:0.4,minWidth:14}}>{["A","B","C","D"][i]}</span>
                <span style={{flex:1}}>{opt}</span>
                {revealed&&i===q.answer&&<span>✓</span>}
                {revealed&&i===selected&&i!==q.answer&&<span>✗</span>}
              </button>);
            })}
          </div>
          {revealed&&(
            <div className="fade-up" style={{display:"flex",flexDirection:"column",gap:9}}>
              <div style={{background:"rgba(29,184,164,0.08)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:12,padding:"12px 16px",fontSize:"0.84rem",color:"#0D6B61",lineHeight:1.7}}>💡 <strong>Explication :</strong> {q.explanation}</div>
              <button className="btn btn-primary" onClick={nextQuestion} style={{justifyContent:"center",fontSize:"0.92rem",padding:"13px"}}>{current+1>=questions.length?"Voir mes résultats →":"Question suivante →"}</button>
            </div>
          )}
        </div>
        {newBadge&&<BadgeNotification badge={newBadge} onClose={()=>setNewBadge(null)}/>}
      </div>
    );
  }

  if (screen==="result"||screen==="examResult") {
    const isExam = screen==="examResult";
    const mention = percent>=80?{emoji:"🏆",text:"Excellent !",color:concours.color}:percent>=60?{emoji:"👍",text:"Bon score !",color:"#2E86AB"}:percent>=40?{emoji:"📚",text:"Continue !",color:"#E8A838"}:{emoji:"💪",text:"Ne lâche pas !",color:"#FF6B35"};
    const themeStats = {};
    questions.forEach((q,i)=>{const t=q.theme||"Général";if(!themeStats[t])themeStats[t]={correct:0,total:0};themeStats[t].total++;if(answers[i]?.isCorrect)themeStats[t].correct++;});
    return (
      <div style={{minHeight:"100vh",background:"#F8FFFE",fontFamily:"'DM Sans',sans-serif"}}>
        <style>{styles}</style>
        <div style={{maxWidth:680,margin:"0 auto",padding:"36px 20px 80px"}} className="fade-up">
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:52,marginBottom:10,animation:"float 3s ease-in-out infinite"}}>{mention.emoji}</div>
            {isExam&&<div style={{display:"inline-block",background:"#EEF",borderRadius:20,padding:"4px 14px",fontSize:"0.78rem",color:"#2E86AB",fontWeight:700,marginBottom:10,fontFamily:"'Cabinet Grotesk',sans-serif"}}>EXAMEN BLANC</div>}
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:"4rem",fontWeight:900,lineHeight:1,background:`linear-gradient(135deg, ${concours.color}, #2E86AB)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{percent}%</div>
            <div style={{color:"#8899AA",marginTop:6,fontSize:"0.9rem"}}>{score}/{questions.length} bonnes réponses · {concours.icon} {concours.label}</div>
            <div style={{marginTop:8,fontSize:"0.92rem",color:"#0A2342",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:700}}>{mention.text}</div>
            {user&&<div style={{marginTop:8,fontSize:"0.8rem",color:"#1DB8A4"}}>☁️ Résultats sauvegardés dans ton compte</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
            {[{label:"Score",value:`${percent}%`,icon:"🎯"},{label:"Correctes",value:score,icon:"✅"},{label:"Erreurs",value:questions.length-score,icon:"❌"}].map(s=>(
              <div key={s.label} className="card" style={{textAlign:"center",padding:"14px 8px"}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.2rem",color:"#0A2342"}}>{s.value}</div>
                <div style={{fontSize:"0.72rem",color:"#8899AA",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{fontSize:"0.7rem",letterSpacing:2,color:"#8899AA",fontWeight:700,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif",marginBottom:12}}>Par thème</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Object.entries(themeStats).map(([t,s])=>(
                <div key={t}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.83rem",marginBottom:4}}><span style={{color:"#0A2342",fontWeight:500}}>{t}</span><span style={{color:s.correct/s.total>=0.7?concours.color:"#E74C3C",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:700}}>{s.correct}/{s.total}</span></div>
                  <div style={{background:"rgba(10,35,66,0.06)",borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:`${Math.round((s.correct/s.total)*100)}%`,height:"100%",background:s.correct/s.total>=0.7?concours.color:"#E74C3C",borderRadius:4,transition:"width 0.5s"}}></div></div>
                </div>
              ))}
            </div>
          </div>
          {!user&&<div style={{background:"rgba(29,184,164,0.08)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#0A2342",fontSize:"0.9rem"}}>Sauvegarde tes résultats !</div><div style={{fontSize:"0.78rem",color:"#8899AA"}}>Crée un compte gratuit pour ne plus perdre ta progression.</div></div>
            <button className="btn btn-teal" onClick={()=>setShowAuth(true)} style={{padding:"8px 16px",whiteSpace:"nowrap"}}>Créer un compte</button>
          </div>}
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            <button className="btn btn-teal" onClick={()=>setScreen("home")} style={{flex:1,justifyContent:"center",minWidth:130}}>🔄 Nouveau quiz</button>
            {questions.length-score>0&&<button className="btn btn-orange" onClick={()=>{setMode("errors");setScreen("home");}} style={{flex:1,justifyContent:"center",minWidth:130}}>🎯 Mes erreurs</button>}
            {!isExam&&<button className="btn btn-primary" onClick={()=>{setMode("exam");setScreen("home");}} style={{flex:1,justifyContent:"center",minWidth:130}}>📋 Examen blanc</button>}
          </div>
        </div>
        {newBadge&&<BadgeNotification badge={newBadge} onClose={()=>setNewBadge(null)}/>}
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"#F8FFFE",fontFamily:"'DM Sans',sans-serif",paddingBottom:80}}>
      <style>{styles}</style>

      {/* MODALS */}
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={(u)=>{setUser(u);setShowAuth(false);}}/>}
      {showPricing&&<PricingModal onClose={()=>setShowPricing(false)} user={user}/>}

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid rgba(10,35,66,0.08)",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
        <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.2rem",color:"#0A2342"}}>Concours<span style={{color:"#1DB8A4"}}>Santé</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {streak>0&&<div style={{display:"flex",alignItems:"center",gap:5,background:"#FFF8F0",border:"1px solid #FFD0A0",borderRadius:20,padding:"4px 10px"}}><span style={{fontSize:14}}>🔥</span><span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.82rem",color:"#F57C00"}}>{streak}j</span></div>}
          {user ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {syncStatus==="synced"&&<div style={{fontSize:"0.7rem",color:"#1DB8A4"}}>☁️</div>}
              <div style={{background:"rgba(29,184,164,0.1)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:20,padding:"5px 12px",fontSize:"0.78rem",color:"#0D8070",fontWeight:700,fontFamily:"'Cabinet Grotesk',sans-serif"}}>👤 {userName}</div>
              <button onClick={handleLogout} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.75rem",color:"#8899AA",fontFamily:"'DM Sans',sans-serif"}}>Déconnexion</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setShowAuth(true)} style={{padding:"6px 14px",fontSize:"0.8rem"}}>Connexion</button>
              <button className="btn btn-teal" onClick={()=>setShowPricing(true)} style={{padding:"6px 14px",fontSize:"0.8rem"}}>Premium ⭐</button>
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"22px 20px"}}>

        {activeTab==="quiz"&&(
          <div className="fade-up">
            {user&&(
              <div style={{background:"rgba(29,184,164,0.06)",border:"1px solid rgba(29,184,164,0.15)",borderRadius:14,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:24}}>👋</div>
                <div>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#0A2342",fontSize:"0.92rem"}}>Bonjour {userName} !</div>
                  <div style={{fontSize:"0.78rem",color:"#8899AA"}}>{streak>0?`🔥 ${streak} jours de suite — continue !`:"Prêt à réviser aujourd'hui ?"}</div>
                </div>
              </div>
            )}

            {appState.concourDate&&selectedConcours&&(()=>{
              const days=Math.max(0,Math.ceil((new Date(appState.concourDate)-new Date())/86400000));
              const color=days<=7?"#E74C3C":days<=30?"#FF6B35":"#1DB8A4";
              return days>0?(<div style={{background:`${color}10`,border:`1px solid ${color}25`,borderRadius:14,padding:"12px 18px",display:"flex",gap:12,alignItems:"center",marginBottom:20}}><div style={{fontSize:24}}>📅</div><div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.92rem",color}}>{days} jour{days>1?"s":""} avant ton concours</div><div style={{fontSize:"0.76rem",color:"#8899AA"}}>{days<=7?"Dernière ligne droite !":days<=30?"Intensifie ta préparation !":"Continue la régularité."}</div></div></div>):null;
            })()}

            {appState.totalQuizzes>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
                {[{label:"Quiz",value:appState.totalQuizzes||0,icon:"🎯"},{label:"Streak",value:`${streak}j`,icon:"🔥"},{label:"Précision",value:`${globalAccuracy}%`,icon:"📊"}].map(s=>(
                  <div key={s.label} className="card" style={{textAlign:"center",padding:"14px 10px"}}>
                    <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.3rem",color:"#0A2342"}}>{s.value}</div>
                    <div style={{fontSize:"0.72rem",color:"#8899AA",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginBottom:20}}>
              <div style={{fontSize:"0.7rem",letterSpacing:"3px",color:"#1DB8A4",fontWeight:700,marginBottom:12,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif"}}>Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[{id:"quiz",icon:"🧠",label:"Quiz IA",color:"#1DB8A4"},{id:"exam",icon:"📋",label:"Examen",color:"#2E86AB"},{id:"errors",icon:"🎯",label:"Erreurs",color:"#FF6B35"},{id:"flashcards",icon:"🗂️",label:"Flashcards",color:"#7B61FF"}].map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{background:mode===m.id?`${m.color}15`:"#fff",border:`2px solid ${mode===m.id?m.color:"rgba(10,35,66,0.1)"}`,borderRadius:12,padding:"12px 6px",cursor:"pointer",transition:"all 0.2s",textAlign:"center",transform:mode===m.id?"translateY(-2px)":"none"}}>
                    <div style={{fontSize:20,marginBottom:5}}>{m.icon}</div>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.78rem",color:mode===m.id?m.color:"#0A2342"}}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:18}}>
              <div style={{fontSize:"0.7rem",letterSpacing:"3px",color:"#1DB8A4",fontWeight:700,marginBottom:12,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif"}}>Concours</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:9}}>
                {Object.entries(CONCOURS).map(([key,c])=>(
                  <button key={key} onClick={()=>{setSelectedConcours(key);setSelectedTheme(null);}} style={{background:selectedConcours===key?c.colorLight:"#fff",border:`2px solid ${selectedConcours===key?c.color:"rgba(10,35,66,0.1)"}`,borderRadius:14,padding:"14px 12px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",transform:selectedConcours===key?"translateY(-2px)":"none",boxShadow:selectedConcours===key?`0 6px 18px ${c.color}25`:"none"}}>
                    <div style={{fontSize:22,marginBottom:5}}>{c.icon}</div>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.85rem",color:selectedConcours===key?c.color:"#0A2342"}}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedConcours&&mode!=="exam"&&(
              <div style={{marginBottom:16}} className="fade-in">
                <div style={{fontSize:"0.7rem",letterSpacing:"3px",color:"#1DB8A4",fontWeight:700,marginBottom:10,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif"}}>Difficulté</div>
                <div style={{display:"flex",gap:8}}>
                  {[{v:1,l:"Débutant",c:"#1DB8A4"},{v:2,l:"Intermédiaire",c:"#2E86AB"},{v:3,l:"Expert",c:"#FF6B35"}].map(d=>(
                    <button key={d.v} onClick={()=>setDifficulty(d.v)} style={{flex:1,background:difficulty===d.v?`${d.c}15`:"#fff",border:`2px solid ${difficulty===d.v?d.c:"rgba(10,35,66,0.1)"}`,borderRadius:10,padding:"10px 6px",cursor:"pointer",transition:"all 0.2s",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.82rem",color:difficulty===d.v?d.c:"#8899AA"}}>{d.l}</button>
                  ))}
                </div>
              </div>
            )}

            {selectedConcours&&(mode==="quiz"||mode==="flashcards")&&(
              <div style={{marginBottom:20}} className="fade-in">
                <div style={{fontSize:"0.7rem",letterSpacing:"3px",color:"#1DB8A4",fontWeight:700,marginBottom:10,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif"}}>Thème <span style={{color:"#C0D0D8",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optionnel)</span></div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button onClick={()=>setSelectedTheme(null)} style={{background:!selectedTheme?"#0A2342":"#fff",border:`1.5px solid ${!selectedTheme?"#0A2342":"rgba(10,35,66,0.12)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",color:!selectedTheme?"#fff":"#8899AA",fontSize:"0.8rem",fontWeight:600,transition:"all 0.2s",fontFamily:"'Cabinet Grotesk',sans-serif"}}>Tous</button>
                  {CONCOURS[selectedConcours].themes.map(t=>(
                    <button key={t} onClick={()=>setSelectedTheme(t)} style={{background:selectedTheme===t?concours.colorLight:"#fff",border:`1.5px solid ${selectedTheme===t?concours.color:"rgba(10,35,66,0.12)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",color:selectedTheme===t?concours.color:"#8899AA",fontSize:"0.8rem",fontWeight:600,transition:"all 0.2s",fontFamily:"'Cabinet Grotesk',sans-serif"}}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            {error&&<div style={{background:"#FEE",border:"1px solid #FCC",borderRadius:10,padding:"11px 14px",color:"#C00",fontSize:"0.86rem",marginBottom:14}}>⚠️ {error}</div>}

            <button onClick={()=>startSession(mode)} disabled={!selectedConcours||loading}
              style={{width:"100%",justifyContent:"center",fontSize:"0.98rem",padding:"14px",opacity:selectedConcours?1:0.4,cursor:selectedConcours?"pointer":"not-allowed",background:mode==="flashcards"?"#7B61FF":mode==="exam"?"#FF6B35":"#1DB8A4",color:"#fff",borderRadius:12,border:"none",fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,display:"flex",alignItems:"center",gap:8,transition:"transform 0.2s,box-shadow 0.2s"}}
              onMouseEnter={e=>{if(selectedConcours)e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
              {mode==="exam"?"🏁 Lancer l'examen blanc":mode==="errors"?"🎯 Réviser mes erreurs":mode==="flashcards"?"🗂️ Générer les flashcards":"✨ Générer le quiz IA"}
            </button>

            <div style={{marginTop:12,textAlign:"center"}}>
              <button onClick={()=>setShowDatePicker(s=>!s)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"0.8rem",color:"#8899AA",fontFamily:"'DM Sans',sans-serif"}}>
                📅 {appState.concourDate?`Concours le ${new Date(appState.concourDate).toLocaleDateString("fr-FR")}`:"Ajouter la date de mon concours"}
              </button>
            </div>

            {showDatePicker&&(
              <div className="card fade-in" style={{marginTop:12}}>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#0A2342",marginBottom:10}}>📅 Date de ton concours</div>
                <div style={{display:"flex",gap:8}}>
                  <input type="date" defaultValue={appState.concourDate||""} onChange={e=>setAppState(s=>({...s,concourDate:e.target.value}))} style={{flex:1,padding:"9px 12px",borderRadius:9,border:"1.5px solid rgba(10,35,66,0.15)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.88rem",color:"#0A2342",outline:"none"}}/>
                  <button className="btn btn-teal" onClick={()=>setShowDatePicker(false)} style={{padding:"9px 16px"}}>OK</button>
                </div>
              </div>
            )}

            {!user&&appState.totalQuizzes>=2&&(
              <div style={{marginTop:16,background:"linear-gradient(135deg,#0A2342,#1a3a5c)",borderRadius:16,padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#fff",fontSize:"0.92rem"}}>Sauvegarde ta progression !</div>
                  <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",marginTop:3}}>Crée un compte gratuit pour ne pas perdre tes résultats.</div>
                </div>
                <button className="btn btn-teal" onClick={()=>setShowAuth(true)} style={{padding:"9px 16px",whiteSpace:"nowrap",fontSize:"0.82rem"}}>Créer un compte</button>
              </div>
            )}
          </div>
        )}

        {activeTab==="dashboard"&&(
          <div className="fade-up">
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.3rem",color:"#0A2342",marginBottom:4}}>Mon tableau de bord</div>
            <div style={{color:"#8899AA",fontSize:"0.88rem",marginBottom:22}}>
              {user?`Progression synchronisée · ${userName}`:"Connectez-vous pour sauvegarder dans le cloud"}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
              <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
                <ProgressRing value={globalAccuracy} max={100} color="#1DB8A4" size={72}/>
                <div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.8rem",color:"#0A2342",lineHeight:1}}>{globalAccuracy}%</div><div style={{fontSize:"0.78rem",color:"#8899AA",marginTop:3}}>Précision globale</div></div>
              </div>
              <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
                <ProgressRing value={Math.min(streak,30)} max={30} color="#FF9800" size={72}/>
                <div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.8rem",color:"#0A2342",lineHeight:1}}>{streak}j</div><div style={{fontSize:"0.78rem",color:"#8899AA",marginTop:3}}>Streak actuel</div></div>
              </div>
            </div>
            <div className="card" style={{marginBottom:14}}>
              <div style={{fontSize:"0.7rem",letterSpacing:2,color:"#8899AA",fontWeight:700,textTransform:"uppercase",fontFamily:"'Cabinet Grotesk',sans-serif",marginBottom:14}}>Activité — 7 derniers jours</div>
              <WeekChart history={appState.history}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              {[{label:"Quiz totaux",value:appState.totalQuizzes||0,icon:"🎯"},{label:"Examens blancs",value:appState.examCount||0,icon:"📋"},{label:"Meilleur score",value:`${appState.bestScore||0}%`,icon:"🏆"}].map(s=>(
                <div key={s.label} className="card" style={{textAlign:"center",padding:"14px 8px"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.2rem",color:"#0A2342"}}>{s.value}</div>
                  <div style={{fontSize:"0.7rem",color:"#8899AA",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            {!user&&(
              <div style={{background:"rgba(29,184,164,0.08)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:14,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,color:"#0A2342",fontSize:"0.9rem"}}>☁️ Sauvegarde dans le cloud</div><div style={{fontSize:"0.78rem",color:"#8899AA"}}>Connecte-toi pour ne jamais perdre ta progression.</div></div>
                <button className="btn btn-teal" onClick={()=>setShowAuth(true)} style={{padding:"8px 16px",whiteSpace:"nowrap"}}>Connexion</button>
              </div>
            )}
          </div>
        )}

        {activeTab==="badges"&&(
          <div className="fade-up">
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.3rem",color:"#0A2342",marginBottom:4}}>Mes badges</div>
            <div style={{color:"#8899AA",fontSize:"0.88rem",marginBottom:20}}>{earnedBadges.length}/{BADGES.length} badges débloqués</div>
            <div style={{background:"rgba(10,35,66,0.06)",borderRadius:10,height:8,marginBottom:24,overflow:"hidden"}}>
              <div style={{width:`${Math.round((earnedBadges.length/BADGES.length)*100)}%`,height:"100%",background:"linear-gradient(90deg,#1DB8A4,#2E86AB)",borderRadius:10,transition:"width 0.5s"}}></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
              {BADGES.map(b=>{
                const earned=(appState.earnedBadges||[]).includes(b.id);
                return(<div key={b.id} className="card" style={{textAlign:"center",padding:"20px 14px",opacity:earned?1:0.4,filter:earned?"none":"grayscale(1)",transition:"all 0.3s"}}>
                  <div style={{fontSize:32,marginBottom:10}}>{b.icon}</div>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.85rem",color:"#0A2342",marginBottom:4}}>{b.label}</div>
                  <div style={{fontSize:"0.72rem",color:"#8899AA",lineHeight:1.4}}>{b.desc}</div>
                  {earned&&<div style={{marginTop:8,fontSize:"0.7rem",color:"#1DB8A4",fontWeight:700}}>✓ Débloqué</div>}
                </div>);
              })}
            </div>
          </div>
        )}

        {activeTab==="leaderboard"&&(
          <div className="fade-up">
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.3rem",color:"#0A2342",marginBottom:4}}>Classement</div>
            <div style={{color:"#8899AA",fontSize:"0.88rem",marginBottom:22}}>Ta position cette semaine.</div>
            {[
              {rank:1,name:"Marie L.",score:94,streak:12,concours:"Infirmier",badge:"🏆"},
              {rank:2,name:"Thomas B.",score:91,streak:8,concours:"Aide-soignant",badge:"🥈"},
              {rank:3,name:"Camille R.",score:88,streak:15,concours:"ATSEM",badge:"🥉"},
              {rank:4,name:user?userName:"Toi",score:globalAccuracy,streak,concours:selectedConcours?CONCOURS[selectedConcours].label:"—",badge:"👤",isYou:true},
              {rank:5,name:"Léa M.",score:79,streak:4,concours:"Auxiliaire",badge:""},
              {rank:6,name:"Karim S.",score:76,streak:6,concours:"Ambulancier",badge:""},
            ].map((p,i)=>(
              <div key={i} className="card" style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"14px 18px",border:p.isYou?"2px solid #1DB8A4":"1px solid rgba(10,35,66,0.08)",background:p.isYou?"rgba(29,184,164,0.04)":"#fff"}}>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.1rem",color:p.rank<=3?"#FFB800":"#8899AA",minWidth:28,textAlign:"center"}}>{p.badge||p.rank}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:"0.9rem",color:p.isYou?"#1DB8A4":"#0A2342"}}>{p.name}{p.isYou?" (Toi)":""}</div>
                  <div style={{fontSize:"0.75rem",color:"#8899AA"}}>{p.concours} · 🔥 {p.streak}j</div>
                </div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:"1.1rem",color:p.isYou?"#1DB8A4":"#0A2342"}}>{p.score}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid rgba(10,35,66,0.08)",display:"flex",padding:"8px 0 12px",zIndex:50}}>
        {[{id:"quiz",icon:"🧠",label:"Quiz"},{id:"dashboard",icon:"📊",label:"Progrès"},{id:"badges",icon:"🏅",label:"Badges"},{id:"leaderboard",icon:"🏆",label:"Classement"}].map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {newBadge&&<BadgeNotification badge={newBadge} onClose={()=>setNewBadge(null)}/>}
    </div>
  );
}
