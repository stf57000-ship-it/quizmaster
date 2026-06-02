// src/screens/ResultScreen.jsx — Célébration enrichie
import { useState, useEffect } from "react";
import { CONCOURS } from "../lib/constants.js";
import { ProgressRing } from "../components/UI.jsx";
import { ScoreShareCard } from "../components/ShareCard.jsx";
import { ChallengeButton } from "../components/ChallengeCard.jsx";
import { triggerConfetti } from "../lib/psychology.js";

export function ResultScreen({ score, total, answers, concours: concoursKey, isExam, isExpress, userName, onRestart, onHome }) {
  const [showShare, setShowShare] = useState(false);
  const [animScore, setAnimScore] = useState(0);

  const percent    = Math.round((score / total) * 100);
  const concours   = CONCOURS[concoursKey];
  const isGood     = percent >= 70;
  const isPerfect  = percent === 100;
  const isExcellent= percent >= 90;

  useEffect(() => {
    // Animation du score
    let current = 0;
    const step = percent / 30;
    const interval = setInterval(() => {
      current = Math.min(current + step, percent);
      setAnimScore(Math.round(current));
      if (current >= percent) clearInterval(interval);
    }, 30);

    // Confettis si bon score
    if (percent >= 80) {
      setTimeout(() => triggerConfetti(), 300);
    }

    return () => clearInterval(interval);
  }, []);

  const getMessage = () => {
    if (isPerfect)   return { emoji:"🏆", title:"Score parfait !", sub:"Exceptionnel ! Tu maîtrises ce sujet." };
    if (isExcellent) return { emoji:"🌟", title:"Excellent !", sub:"Tu es vraiment prêt(e) pour le concours !" };
    if (isGood)      return { emoji:"🎉", title:"Bravo !", sub:"Bon score ! Continue sur cette lancée." };
    if (percent >= 50) return { emoji:"💪", title:"Pas mal !", sub:"Encore un peu de travail et tu y es !" };
    return { emoji:"📚", title:"Continue !", sub:"Revois les points faibles — tu vas progresser vite." };
  };

  const msg = getMessage();

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button className="btn btn-ghost" onClick={onHome} style={{ padding:"7px 14px" }}>← Accueil</button>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)" }}>
          {isExpress?"⚡ Résultats express":isExam?"📋 Résultats examen":"🎯 Résultats quiz"}
        </div>
        <div style={{ width:80 }}/>
      </div>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"32px 20px 120px" }}>

        {/* Score principal avec animation */}
        <div className="card fade-up" style={{ textAlign:"center", padding:"36px 24px", marginBottom:20 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>{msg.emoji}</div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.4rem", color:"var(--text)", marginBottom:4 }}>{msg.title}</div>
          <div style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:20 }}>{msg.sub}</div>

          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ position:"relative" }}>
              <ProgressRing value={animScore} max={100} color={isPerfect?"#FFB800":isGood?"var(--teal)":"var(--orange)"} size={130}/>
              <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"2rem", color:"var(--text)", lineHeight:1 }}>{animScore}%</div>
                <div style={{ fontSize:"0.7rem", color:"var(--muted)" }}>{score}/{total}</div>
              </div>
            </div>
          </div>

          {isExam && (
            <div style={{ padding:"8px 16px", background:percent>=80?"rgba(29,184,164,0.1)":"rgba(255,107,53,0.1)", borderRadius:8, display:"inline-block", marginBottom:8 }}>
              <span style={{ fontSize:"0.85rem", fontWeight:700, color:percent>=80?"var(--teal)":"var(--orange)" }}>
                {percent>=80?"✓ Niveau concours atteint !":"Objectif : 80% minimum pour le concours"}
              </span>
            </div>
          )}

          {/* Concours */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:8 }}>
            <span>{concours?.icon}</span>
            <span style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{concours?.label}</span>
          </div>
        </div>

        {/* Détail réponses — masqué en mode express */}
        {!isExpress && (
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ fontSize:"0.7rem", letterSpacing:2, color:"var(--muted)", fontWeight:700, textTransform:"uppercase", fontFamily:"var(--font-display)", marginBottom:14 }}>Détail des réponses</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(answers||[]).map((a, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:a.isCorrect?"rgba(29,184,164,0.05)":"rgba(255,107,53,0.05)", borderRadius:10, border:`1px solid ${a.isCorrect?"rgba(29,184,164,0.15)":"rgba(255,107,53,0.15)"}` }}>
                  <span style={{ fontSize:16 }}>{a.isCorrect?"✅":"❌"}</span>
                  <span style={{ fontSize:"0.82rem", color:"var(--text)", flex:1 }}>Question {i+1}</span>
                  {!a.isCorrect && <span style={{ fontSize:"0.75rem", color:"var(--muted)" }}>Bonne : {["A","B","C","D"][a.correct]}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button className="btn btn-teal" onClick={onRestart} style={{ width:"100%", justifyContent:"center", padding:"15px", fontSize:"0.98rem" }}>
            🔄 Nouveau quiz
          </button>

          <button className="btn" onClick={() => setShowShare(true)}
            style={{ width:"100%", justifyContent:"center", padding:"13px", background:"rgba(29,184,164,0.08)", color:"var(--teal)", border:"2px solid rgba(29,184,164,0.2)", fontSize:"0.92rem" }}>
            📤 Partager mon score
          </button>

          <ChallengeButton score={score} total={total} concoursKey={concoursKey} userName={userName}/>

          <button className="btn btn-ghost" onClick={onHome} style={{ width:"100%", justifyContent:"center", padding:"12px" }}>
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>

      {showShare && (
        <ScoreShareCard score={score} total={total} concoursKey={concoursKey} userName={userName} onClose={() => setShowShare(false)}/>
      )}
    </div>
  );
}

// ── FlashcardsScreen ──────────────────────────────────────────
export function FlashcardsScreen({ flashcards, concours: concoursKey, onBack }) {
  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]   = useState(new Set());
  const concours = CONCOURS[concoursKey];
  const fc = flashcards[index];

  const handleKnown = (yes) => {
    if (yes) setKnown(prev => new Set([...prev, index]));
    if (index + 1 < flashcards.length) { setIndex(i => i + 1); setFlipped(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <div style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding:"7px 14px" }}>← Retour</button>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)" }}>🗂️ Flashcards</div>
        <div style={{ fontFamily:"monospace", fontSize:"0.82rem", color:"var(--muted)" }}>{index+1}/{flashcards.length}</div>
      </div>

      <div style={{ maxWidth:560, margin:"0 auto", padding:"24px 20px 120px" }}>
        <div style={{ display:"flex", gap:4, marginBottom:24 }}>
          {flashcards.map((_,i) => <div key={i} style={{ flex:1, height:4, borderRadius:2, background:i<index?"var(--teal)":i===index?concours?.color:"var(--border)", transition:"background 0.3s" }}/>)}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          <div className="card" style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.4rem", color:"var(--teal)" }}>{known.size}</div>
            <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>Acquises ✓</div>
          </div>
          <div className="card" style={{ textAlign:"center", padding:14 }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.4rem", color:"var(--orange)" }}>{flashcards.length - known.size}</div>
            <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>À revoir</div>
          </div>
        </div>

        <div onClick={() => setFlipped(f => !f)} style={{ minHeight:220, borderRadius:20, padding:28, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center", cursor:"pointer", transition:"all 0.35s", background:flipped?(concours?.color||"var(--teal)"):"var(--surface)", border:`2px solid ${flipped?"transparent":"var(--border)"}`, boxShadow:flipped?`0 12px 32px ${concours?.color}40`:"0 2px 12px rgba(10,35,66,0.06)", marginBottom:20 }}>
          <div style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:2, marginBottom:12, fontFamily:"var(--font-display)", color:flipped?"rgba(255,255,255,0.7)":"var(--muted)" }}>{flipped?"Réponse":"Question · Appuie pour retourner"}</div>
          <p style={{ fontFamily:"var(--font-display)", fontWeight:flipped?700:800, fontSize:"1rem", lineHeight:1.55, color:flipped?"#fff":"var(--text)" }}>{flipped?fc?.answer:fc?.question}</p>
        </div>

        {flipped && (
          <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button className="btn" onClick={() => handleKnown(false)} style={{ background:"rgba(255,107,53,0.1)", color:"var(--orange)", border:"2px solid rgba(255,107,53,0.2)", padding:"14px", justifyContent:"center", fontSize:"0.92rem" }}>😕 À revoir</button>
            <button className="btn" onClick={() => handleKnown(true)} style={{ background:"rgba(29,184,164,0.1)", color:"var(--teal)", border:"2px solid rgba(29,184,164,0.2)", padding:"14px", justifyContent:"center", fontSize:"0.92rem" }}>✓ Je sais !</button>
          </div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          {index > 0 && <button className="btn btn-ghost" onClick={() => { setIndex(i=>i-1); setFlipped(false); }} style={{ flex:1, justifyContent:"center", padding:"11px" }}>← Précédente</button>}
          {index < flashcards.length - 1 && <button className="btn btn-ghost" onClick={() => { setIndex(i=>i+1); setFlipped(false); }} style={{ flex:1, justifyContent:"center", padding:"11px" }}>Suivante →</button>}
        </div>

        {index === flashcards.length - 1 && flipped && (
          <div className="card fade-in" style={{ marginTop:20, textAlign:"center", background:"rgba(29,184,164,0.06)", border:"1px solid rgba(29,184,164,0.2)" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:8 }}>🎉</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)", marginBottom:4 }}>Série terminée !</div>
            <div style={{ color:"var(--muted)", fontSize:"0.85rem" }}>{known.size}/{flashcards.length} cartes acquises</div>
            <button className="btn btn-teal" onClick={onBack} style={{ marginTop:16, width:"100%", justifyContent:"center" }}>Retour à l'accueil</button>
          </div>
        )}
      </div>
    </div>
  );
}
