// src/screens/HomeScreen.jsx — Santé en priorité, Sécurité/Défense en secondaire
import { useState } from "react";
import { CONCOURS, CONCOURS_CATEGORIES } from "../lib/constants.js";
import { getStreak, getGlobalAccuracy } from "../lib/progress.js";
import { quizPreloader } from "../lib/ai.js";
import { getActiveCandidates } from "../lib/psychology.js";
import { ProgressByConcours } from "../components/ProgressByTheme.jsx";

const ALL_MODES = [
  { id:"quiz",       icon:"🧠", label:"Quiz IA",    color:"#1DB8A4" },
  { id:"express",    icon:"⚡", label:"Express 3'", color:"#FF9800" },
  { id:"exam",       icon:"📋", label:"Examen",     color:"#2E86AB" },
  { id:"errors",     icon:"🎯", label:"Erreurs",    color:"#FF6B35" },
  { id:"flashcards", icon:"🗂️", label:"Flashcards", color:"#7B61FF" },
];

// Concours santé/paramédical — priorité absolue (nom du site)
const HEALTH_CONCOURS = ["aide_soignant","infirmier","auxiliaire","ambulancier","atsem","ash","adjoint_administratif","agent_mortuaire"];

// Autres concours — secondaires
const OTHER_CATEGORIES = [
  { key:"securite_defense",  label:"Sécurité & Défense",              icon:"🛡️", color:"#D62828", concours:["pompier","police_nationale","gendarmerie","armee"] },
  { key:"lycee_pro",         label:"Lycée Pro & CAP",                 icon:"🎓", color:"#2ECC71", concours:["bac_assp","cap_aepe"] },
];

export function HomeScreen({ appState, user, userName, isPremium, dailyRemaining, onStart, onShowAuth, onShowPricing, onUpdateState, onConcoursSelect }) {
  const preferred = appState.preferredConcours || null;
  const [mode, setMode]                   = useState("quiz");
  const [selectedConcours, setSelected]   = useState(preferred);
  const [difficulty, setDifficulty]       = useState(appState.preferredNiveau === "debutant" ? 1 : appState.preferredNiveau === "avance" ? 3 : 2);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const streak         = getStreak(appState);
  const globalAccuracy = getGlobalAccuracy(appState);
  const hasStats       = (appState.totalQuizzes || 0) > 0;
  const concours       = selectedConcours ? CONCOURS[selectedConcours] : null;
  const activeCandidates = selectedConcours ? getActiveCandidates(selectedConcours) : null;

  const handleSelectConcours = (key) => {
    setSelected(key);
    setSelectedTheme(null);
    onConcoursSelect?.(key);
    if (mode === "quiz") quizPreloader.preload(key, difficulty, null);
  };

  const handleStart = () => {
    if (!selectedConcours) return;
    if (!isPremium && dailyRemaining <= 0) { onShowPricing(); return; }
    onStart({ mode, concours:selectedConcours, difficulty, theme:selectedTheme });
  };

  const daysLeft = appState.concourDate
    ? Math.max(0, Math.ceil((new Date(appState.concourDate) - new Date()) / 86400000))
    : null;

  const btnColors = { quiz:"var(--teal)", express:"#FF9800", exam:"var(--blue)", errors:"var(--orange)", flashcards:"var(--purple)" };
  const btnLabels = { quiz:"✨ Générer le quiz IA", express:"⚡ Quiz express — 3 min", exam:"🏁 Lancer l'examen blanc", errors:"🎯 Réviser mes erreurs", flashcards:"🗂️ Générer les flashcards" };

  const renderConcoursCard = (key) => {
    const c = CONCOURS[key];
    return (
      <button key={key} onClick={() => handleSelectConcours(key)}
        style={{ background:selectedConcours===key?c.colorLight:"var(--surface)", border:`2px solid ${selectedConcours===key?c.color:"var(--border)"}`, borderRadius:14, padding:"14px 12px", cursor:"pointer", transition:"all 0.2s", textAlign:"left", transform:selectedConcours===key?"translateY(-2px)":"none", boxShadow:selectedConcours===key?`0 6px 18px ${c.color}25`:"none" }}>
        <div style={{ fontSize:22, marginBottom:5 }}>{c.icon}</div>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.82rem", color:selectedConcours===key?c.color:"var(--text)", lineHeight:1.3 }}>{c.label}</div>
        {c.subtitle && <div style={{ fontSize:"0.62rem", color:"var(--muted)", marginTop:3, lineHeight:1.3 }}>{c.subtitle}</div>}
      </button>
    );
  };

  return (
    <div className="fade-up">

      {/* Bandeau utilisateur */}
      {user && (
        <div style={{ background:"rgba(29,184,164,0.06)", border:"1px solid rgba(29,184,164,0.15)", borderRadius:14, padding:"12px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:22 }}>👋</div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)", fontSize:"0.92rem" }}>
              Bonjour {userName} !{isPremium && " 👑"}
            </div>
            <div style={{ fontSize:"0.78rem", color:"var(--muted)" }}>
              {streak > 0 ? `🔥 ${streak} jour${streak>1?"s":""} de suite — continue !` : "Prêt à réviser aujourd'hui ?"}
            </div>
          </div>
        </div>
      )}

      {/* Limite gratuit */}
      {!isPremium && user && dailyRemaining <= 2 && (
        <div style={{ background:dailyRemaining<=0?"rgba(255,107,53,0.08)":"rgba(29,184,164,0.05)", border:`1px solid ${dailyRemaining<=0?"rgba(255,107,53,0.2)":"rgba(29,184,164,0.12)"}`, borderRadius:12, padding:"10px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:"0.82rem", color:dailyRemaining<=0?"var(--orange)":"var(--muted)", fontWeight:dailyRemaining<=0?700:400 }}>
            {dailyRemaining<=0 ? "🔒 Limite quotidienne atteinte" : `✨ ${dailyRemaining} quiz gratuit${dailyRemaining>1?"s":""} restant${dailyRemaining>1?"s":""}`}
          </div>
          <button onClick={onShowPricing} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.78rem", color:"var(--teal)", fontWeight:700, fontFamily:"var(--font-display)" }}>Illimité →</button>
        </div>
      )}

      {/* Compte à rebours */}
      {daysLeft !== null && daysLeft > 0 && (
        <div style={{ background:`${daysLeft<=7?"var(--orange)":daysLeft<=30?"#FF9800":"var(--teal)"}10`, border:`1px solid ${daysLeft<=7?"var(--orange)":daysLeft<=30?"#FF9800":"var(--teal)"}25`, borderRadius:14, padding:"12px 18px", display:"flex", gap:12, alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:24 }}>📅</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.95rem", color:daysLeft<=7?"var(--orange)":"var(--teal)" }}>J-{daysLeft} avant ton concours {daysLeft<=7?"⚠️":"🎯"}</div>
            <div style={{ fontSize:"0.76rem", color:"var(--muted)" }}>{daysLeft<=7?"Dernière ligne droite !":daysLeft<=30?"Bonne cadence — continue !":"Chaque jour compte !"}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      {hasStats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
          {[
            {label:"Quiz",      value:appState.totalQuizzes||0, icon:"🎯", color:"var(--teal)"},
            {label:"Streak",    value:`${streak}j`,             icon:"🔥", color:"#FF9800"},
            {label:"Précision", value:`${globalAccuracy}%`,     icon:"📊", color:"var(--blue)"}
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign:"center", padding:"14px 10px" }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.3rem", color:s.color }}>{s.value}</div>
              <div style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modes */}
      <div style={{ marginBottom:20 }}>
        <div className="section-label" style={{ marginBottom:12 }}>Mode</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
          {ALL_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ background:mode===m.id?`${m.color}15`:"var(--surface)", border:`2px solid ${mode===m.id?m.color:"var(--border)"}`, borderRadius:12, padding:"10px 4px", cursor:"pointer", transition:"all 0.2s", textAlign:"center", transform:mode===m.id?"translateY(-2px)":"none", position:"relative" }}>
              {m.id==="express"&&mode!=="express"&&<div style={{ position:"absolute",top:-6,right:-4,background:"#FF9800",color:"#fff",fontSize:"0.55rem",fontWeight:700,padding:"2px 5px",borderRadius:8,fontFamily:"var(--font-display)" }}>3'</div>}
              <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.68rem", color:mode===m.id?m.color:"var(--text)", lineHeight:1.2 }}>{m.label}</div>
            </button>
          ))}
        </div>
        {mode==="express"&&<div className="fade-in" style={{ marginTop:10,background:"rgba(255,152,0,0.08)",border:"1px solid rgba(255,152,0,0.2)",borderRadius:10,padding:"10px 14px",fontSize:"0.8rem",color:"#E65100" }}>⚡ 5 questions · 15 secondes chacune · Parfait pour réviser en 3 minutes chrono</div>}
      </div>

      {/* ── CONCOURS SANTÉ — Toujours visibles ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <span>🩺</span>
          <span className="section-label">Concours paramédicaux & santé</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:9 }}>
          {HEALTH_CONCOURS.map(key => renderConcoursCard(key))}
        </div>
      </div>

      {/* ── AUTRES CONCOURS — Boutons dépliables par catégorie ── */}
      <div style={{ marginBottom:16 }}>
        <div className="section-label" style={{ marginBottom:10 }}>Autres concours</div>
        {OTHER_CATEGORIES.map(cat => (
          <div key={cat.key} style={{ marginBottom:10 }}>
            <button onClick={() => setExpandedCategory(expandedCategory===cat.key?null:cat.key)}
              style={{ width:"100%", background:expandedCategory===cat.key?`${cat.color}10`:"rgba(10,35,66,0.03)", border:`1.5px solid ${expandedCategory===cat.key?cat.color:"var(--border)"}`, borderRadius:12, padding:"12px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all 0.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>{cat.icon}</span>
                <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.88rem", color:expandedCategory===cat.key?cat.color:"var(--text)" }}>{cat.label}</span>
              </div>
              <span style={{ color:expandedCategory===cat.key?cat.color:"var(--muted)", fontSize:"1rem", transition:"transform 0.2s", transform:expandedCategory===cat.key?"rotate(180deg)":"none" }}>▼</span>
            </button>

            {expandedCategory===cat.key&&(
              <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:9, marginTop:10 }}>
                {cat.concours.map(key => renderConcoursCard(key))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Social proof */}
      {selectedConcours && activeCandidates && (
        <div className="fade-in" style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.75rem", color:"var(--muted)", marginBottom:14 }}>
          <span>👥</span>
          <span><strong style={{ color:"var(--text)" }}>{activeCandidates}</strong> candidats révisent ce concours aujourd'hui</span>
        </div>
      )}

      {/* Progression par thème */}
      {selectedConcours && hasStats && (
        <ProgressByConcours appState={appState} selectedConcours={selectedConcours} onStart={onStart}/>
      )}

      {/* Difficulté */}
      {selectedConcours && !["exam","express"].includes(mode) && (
        <div style={{ marginBottom:16 }} className="fade-in">
          <div className="section-label" style={{ marginBottom:10 }}>Difficulté</div>
          <div style={{ display:"flex", gap:8 }}>
            {[{v:1,l:"Débutant",c:"var(--teal)"},{v:2,l:"Intermédiaire",c:"var(--blue)"},{v:3,l:"Expert",c:"var(--orange)"}].map(d=>(
              <button key={d.v} onClick={()=>setDifficulty(d.v)}
                style={{ flex:1, background:difficulty===d.v?`${d.c}15`:"var(--surface)", border:`2px solid ${difficulty===d.v?d.c:"var(--border)"}`, borderRadius:10, padding:"10px 6px", cursor:"pointer", transition:"all 0.2s", fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.82rem", color:difficulty===d.v?d.c:"var(--muted)" }}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thème */}
      {selectedConcours && ["quiz","flashcards","express"].includes(mode) && (
        <div style={{ marginBottom:20 }} className="fade-in">
          <div className="section-label" style={{ marginBottom:10 }}>Thème <span style={{ color:"var(--muted)", fontWeight:400, textTransform:"none", letterSpacing:0, fontSize:"0.85rem" }}>(optionnel)</span></div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            <button onClick={()=>setSelectedTheme(null)} style={{ background:!selectedTheme?"var(--navy)":"var(--surface)", border:`1.5px solid ${!selectedTheme?"var(--navy)":"var(--border)"}`, borderRadius:20, padding:"6px 13px", cursor:"pointer", color:!selectedTheme?"#fff":"var(--muted)", fontSize:"0.8rem", fontWeight:600, transition:"all 0.2s", fontFamily:"var(--font-display)" }}>Tous</button>
            {CONCOURS[selectedConcours].themes.map(t=>(
              <button key={t} onClick={()=>setSelectedTheme(t)} style={{ background:selectedTheme===t?concours.colorLight:"var(--surface)", border:`1.5px solid ${selectedTheme===t?concours.color:"var(--border)"}`, borderRadius:20, padding:"6px 13px", cursor:"pointer", color:selectedTheme===t?concours.color:"var(--muted)", fontSize:"0.8rem", fontWeight:600, transition:"all 0.2s", fontFamily:"var(--font-display)" }}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* Bouton lancer */}
      <button onClick={handleStart} disabled={!selectedConcours}
        style={{ width:"100%", justifyContent:"center", fontSize:"1rem", padding:"16px", opacity:selectedConcours?1:0.4, cursor:selectedConcours?"pointer":"not-allowed", background:btnColors[mode], color:"#fff", borderRadius:14, border:"none", fontFamily:"var(--font-display)", fontWeight:800, display:"flex", alignItems:"center", gap:8, transition:"transform 0.2s,box-shadow 0.2s", boxShadow:selectedConcours?`0 4px 20px ${btnColors[mode]}40`:"none" }}
        onMouseEnter={e=>{if(selectedConcours)e.currentTarget.style.transform="translateY(-2px)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
        {btnLabels[mode]}
      </button>

      {!selectedConcours && <div style={{ textAlign:"center", marginTop:10, fontSize:"0.82rem", color:"var(--muted)" }}>↑ Sélectionne un concours pour commencer</div>}

      {/* Date concours */}
      <div style={{ marginTop:14, textAlign:"center" }}>
        <button onClick={()=>setShowDatePicker(s=>!s)} style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:"0.8rem", color:"var(--muted)", fontFamily:"var(--font-body)" }}>
          📅 {appState.concourDate?`Concours le ${new Date(appState.concourDate).toLocaleDateString("fr-FR")}`:"Ajouter la date de mon concours"}
        </button>
      </div>
      {showDatePicker && (
        <div className="card fade-in" style={{ marginTop:12 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)", marginBottom:10 }}>📅 Date de ton concours</div>
          <div style={{ display:"flex", gap:8 }}>
            <input type="date" className="input" defaultValue={appState.concourDate||""} onChange={e=>onUpdateState({concourDate:e.target.value})} style={{ flex:1 }}/>
            <button className="btn btn-teal" onClick={()=>setShowDatePicker(false)} style={{ padding:"9px 16px" }}>OK</button>
          </div>
        </div>
      )}

      {/* CTA inscription */}
      {!user && (appState.totalQuizzes||0) >= 1 && (
        <div style={{ marginTop:16, background:"linear-gradient(135deg,#0A2342,#1a3a5c)", borderRadius:16, padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"#fff", fontSize:"0.92rem" }}>💾 Sauvegarde ta progression !</div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)", marginTop:3 }}>Crée un compte gratuit en 30 secondes.</div>
          </div>
          <button className="btn btn-teal" onClick={onShowAuth} style={{ padding:"9px 16px", whiteSpace:"nowrap", fontSize:"0.82rem" }}>Créer un compte</button>
        </div>
      )}
    </div>
  );
}
