// src/components/WeeklyChallenge.jsx
import { useMemo } from "react";
import { CONCOURS } from "../lib/constants.js";

// Défi calculé par numéro de semaine — même défi pour tous les utilisateurs
function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const WEEKLY_CHALLENGES = [
  { goal: 5,  type: "quiz",    label: "5 quiz cette semaine",         icon: "🧠", reward: "Régularité +50pts" },
  { goal: 3,  type: "perfect", label: "3 scores > 80%",               icon: "🎯", reward: "Précision +75pts" },
  { goal: 1,  type: "exam",    label: "1 examen blanc complet",        icon: "📋", reward: "Endurance +100pts" },
  { goal: 10, type: "quiz",    label: "10 quiz sans interruption",     icon: "🔥", reward: "Série +80pts" },
  { goal: 3,  type: "concours",label: "Quiz sur 3 concours différents",icon: "🌐", reward: "Polyvalence +90pts" },
  { goal: 20, type: "correct", label: "20 bonnes réponses d'affilée",  icon: "⚡", reward: "Maîtrise +120pts" },
  { goal: 5,  type: "flashcard",label: "5 sessions flashcards",        icon: "🗂️", reward: "Mémoire +60pts" },
];

function getWeeklyChallenge() {
  const week = getWeekNumber();
  return WEEKLY_CHALLENGES[week % WEEKLY_CHALLENGES.length];
}

function getWeekProgress(appState, challenge) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const history = appState.quizHistory || [];
  const thisWeek = history.filter(h => new Date(h.date) >= monday);

  switch (challenge.type) {
    case "quiz":      return Math.min(thisWeek.length, challenge.goal);
    case "perfect":   return Math.min(thisWeek.filter(h => (h.score / h.total) >= 0.8).length, challenge.goal);
    case "exam":      return Math.min(thisWeek.filter(h => h.isExam).length, challenge.goal);
    case "concours":  return Math.min(new Set(thisWeek.map(h => h.concours)).size, challenge.goal);
    default:          return 0;
  }
}

export function WeeklyChallenge({ appState, onStart }) {
  const challenge = useMemo(() => getWeeklyChallenge(), []);
  const progress  = useMemo(() => getWeekProgress(appState, challenge), [appState, challenge]);
  const done      = progress >= challenge.goal;
  const pct       = Math.min((progress / challenge.goal) * 100, 100);

  // Calcul jours restants dans la semaine
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (7 - ((now.getDay() + 6) % 7)));
  sunday.setHours(23, 59, 59, 999);
  const daysLeft = Math.ceil((sunday - now) / 86400000);

  return (
    <div className="card" style={{
      marginBottom: 16,
      background: done
        ? "rgba(29,184,164,0.06)"
        : "linear-gradient(135deg, rgba(255,184,0,0.06), rgba(255,107,53,0.04))",
      border: done
        ? "1px solid rgba(29,184,164,0.25)"
        : "1px solid rgba(255,184,0,0.2)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{challenge.icon}</span>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "0.78rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 1
            }}>
              Défi de la semaine
            </div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "0.92rem",
              color: "var(--text)"
            }}>
              {challenge.label}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "1.2rem",
            color: done ? "var(--teal)" : "var(--text)"
          }}>
            {progress}/{challenge.goal}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {done ? "Complété ✓" : `${daysLeft}j restants`}
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: done
            ? "var(--teal)"
            : "linear-gradient(90deg, #FFB800, #FF6B35)",
          borderRadius: 3,
          transition: "width 0.6s ease"
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          🎁 {challenge.reward}
        </span>
        {!done && (
          <button
            onClick={onStart}
            style={{
              background: "linear-gradient(135deg, #FFB800, #FF6B35)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "7px 14px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            Relever le défi →
          </button>
        )}
        {done && (
          <span style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--teal)",
            fontFamily: "var(--font-display)"
          }}>
            🏆 Bravo !
          </span>
        )}
      </div>
    </div>
  );
}
