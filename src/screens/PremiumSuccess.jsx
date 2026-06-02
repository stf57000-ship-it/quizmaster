// src/screens/PremiumSuccess.jsx — Page de confirmation Premium
import { useEffect, useState } from "react";
import { triggerConfetti } from "../lib/psychology.js";

const FEATURES = [
  { icon:"🧠", text:"Quiz IA illimités" },
  { icon:"📋", text:"Examens blancs 20 questions" },
  { icon:"🗂️", text:"Flashcards illimitées" },
  { icon:"🛡️", text:"14 concours disponibles" },
  { icon:"📊", text:"Statistiques avancées" },
  { icon:"👑", text:"Badge Premium débloqué" },
];

export function PremiumSuccess({ userName, onContinue }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    triggerConfetti();
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A2342,#1a3a5c)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>

      {/* Icône animée */}
      <div style={{ fontSize:80, marginBottom:16, animation:"float 2s ease-in-out infinite" }}>👑</div>

      {/* Titre */}
      <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"2rem", color:"#FFB800", marginBottom:8 }}>
        Bienvenue Premium !
      </div>
      <div style={{ color:"rgba(255,255,255,0.7)", fontSize:"1rem", marginBottom:32 }}>
        Bonjour {userName} — accès illimité activé 🎉
      </div>

      {/* Liste des fonctionnalités débloquées */}
      <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:18, padding:24, width:"100%", maxWidth:400, marginBottom:32 }}>
        <div style={{ fontSize:"0.72rem", color:"rgba(29,184,164,0.8)", fontWeight:700, letterSpacing:2, textTransform:"uppercase", fontFamily:"var(--font-display)", marginBottom:16 }}>
          Ce qui est débloqué
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className={i <= step * 2 + 1 ? "fade-in" : ""} style={{ display:"flex", alignItems:"center", gap:12, opacity: i <= step * 2 + 1 ? 1 : 0, transition:"opacity 0.3s" }}>
              <span style={{ fontSize:22 }}>{f.icon}</span>
              <span style={{ color:"#fff", fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.92rem" }}>{f.text}</span>
              <span style={{ marginLeft:"auto", color:"var(--teal)", fontSize:18 }}>✓</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton */}
      <button
        className="btn btn-teal"
        onClick={onContinue}
        style={{ padding:"16px 40px", fontSize:"1.05rem", width:"100%", maxWidth:400, justifyContent:"center" }}>
        🚀 Commencer à réviser !
      </button>

      <div style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.75rem", marginTop:16 }}>
        Résiliable à tout moment depuis ton profil
      </div>
    </div>
  );
}
