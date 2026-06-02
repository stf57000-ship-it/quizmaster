// src/components/LoadingQuiz.jsx — Écran de chargement engageant
import { useState, useEffect } from "react";
import { CONCOURS } from "../lib/constants.js";

const SAMPLE_QUESTIONS = {
  aide_soignant: [
    "Quelle est la fréquence cardiaque normale au repos ?",
    "Combien de vertèbres composent la colonne vertébrale ?",
    "Quel organe produit l'insuline ?",
  ],
  infirmier: [
    "Quelle est la pression artérielle normale ?",
    "Combien de lobes possède le poumon droit ?",
    "Quel est le rôle des globules rouges ?",
  ],
  pompier: [
    "Combien de compressions par minute en RCP ?",
    "Quelle est la première chose à faire face à un accident ?",
    "À quelle température s'enflamme le papier ?",
  ],
  police_nationale: [
    "Quelle est la durée de la garde à vue ?",
    "Qui dirige la police nationale ?",
    "Combien d'articles compte la Déclaration des droits de l'homme ?",
  ],
  default: [
    "Prêt à tester tes connaissances ?",
    "Les meilleures questions t'attendent...",
    "L'IA prépare ton quiz personnalisé...",
  ]
};

const LOADING_TIPS = [
  "💡 Révise 15 min par jour — plus efficace que 2h d'un coup",
  "🎯 Concentre-toi sur tes erreurs — c'est là que tu progresses le plus",
  "🔥 Les candidats qui révisent chaque jour ont 3x plus de chances de réussir",
  "📊 Teste-toi plutôt que de relire — ça fixe mieux les connaissances",
  "⚡ Le mode Express est parfait pour réviser en 3 minutes",
];

export function LoadingQuiz({ mode, concoursKey }) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * LOADING_TIPS.length));
  const [progress, setProgress] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const concours = concoursKey ? CONCOURS[concoursKey] : null;
  const questions = SAMPLE_QUESTIONS[concoursKey] || SAMPLE_QUESTIONS.default;

  const modeLabel = {
    exam: "Préparation de l'examen blanc...",
    flashcards: "Génération des flashcards...",
    errors: "Analyse de tes erreurs...",
    express: "Quiz express en cours...",
    quiz: "Génération de ton quiz IA...",
  }[mode] || "Chargement...";

  useEffect(() => {
    // Progression de la barre
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 92));
    }, 400);

    // Rotation des questions
    const questionInterval = setInterval(() => {
      setQuestionIdx(i => (i + 1) % questions.length);
    }, 2200);

    // Afficher le tip après 3s
    const tipTimeout = setTimeout(() => setShowTip(true), 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(questionInterval);
      clearTimeout(tipTimeout);
    };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 0,
    }}>

      {/* Icône concours animée */}
      <div style={{
        width: 80, height: 80,
        borderRadius: "50%",
        background: concours ? `${concours.color}15` : "rgba(29,184,164,0.1)",
        border: `3px solid ${concours?.color || "var(--teal)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
        animation: "float 2s ease-in-out infinite",
        marginBottom: 24,
      }}>
        {concours?.icon || "🩺"}
      </div>

      {/* Label mode */}
      <div style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "1.1rem",
        color: "var(--text)",
        marginBottom: 8,
        textAlign: "center",
      }}>{modeLabel}</div>

      {/* Concours */}
      {concours && (
        <div style={{
          fontSize: "0.8rem",
          color: concours.color,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 28,
        }}>{concours.label}</div>
      )}

      {/* Barre de progression */}
      <div style={{
        width: "100%", maxWidth: 360,
        height: 6,
        background: "rgba(10,35,66,0.08)",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 32,
      }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${concours?.color || "var(--teal)"}, ${concours?.color || "var(--teal)"}99)`,
          borderRadius: 3,
          transition: "width 0.4s ease",
        }}/>
      </div>

      {/* Question preview animée */}
      <div style={{
        width: "100%", maxWidth: 360,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 20,
        minHeight: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}>
        <div key={questionIdx} className="fade-in" style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "var(--text)",
          lineHeight: 1.5,
        }}>
          {questions[questionIdx]}
        </div>
      </div>

      {/* Options floues */}
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:8, marginBottom:24, opacity:0.35 }}>
        {["A", "B", "C", "D"].map(l => (
          <div key={l} style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{
              width: 24, height: 24,
              borderRadius: 6,
              background: "rgba(10,35,66,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.78rem",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              color: "var(--muted)",
            }}>{l}</span>
            <div style={{
              height: 10,
              borderRadius: 5,
              background: "rgba(10,35,66,0.08)",
              width: `${45 + Math.random() * 40}%`,
            }}/>
          </div>
        ))}
      </div>

      {/* Tip après 3s */}
      {showTip && (
        <div className="fade-in" style={{
          width: "100%", maxWidth: 360,
          background: `${concours?.color || "var(--teal)"}10`,
          border: `1px solid ${concours?.color || "var(--teal)"}25`,
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: "0.82rem",
          color: "var(--text)",
          lineHeight: 1.5,
          textAlign: "center",
        }}>
          {LOADING_TIPS[tipIdx]}
        </div>
      )}
    </div>
  );
}
