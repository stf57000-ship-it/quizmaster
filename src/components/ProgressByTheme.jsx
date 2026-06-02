// src/components/ProgressByTheme.jsx — Progression par thème
import { CONCOURS } from "../lib/constants.js";

export function ProgressByConcours({ appState, selectedConcours, onStart }) {
  if (!selectedConcours) return null;

  const concours = CONCOURS[selectedConcours];
  const errors = (appState.errors || {})[selectedConcours] || [];
  const played = (appState.concoursPlayed || {})[selectedConcours];
  const totalQuizzes = appState.totalQuizzes || 0;

  if (!played) return null;

  // Estimer la maîtrise par thème (basé sur les erreurs et quiz faits)
  const themeMastery = concours.themes.map((theme, i) => {
    const themeErrors = errors.filter(e => e.theme === theme).length;
    const mastery = Math.max(0, Math.min(100, 60 + (i * 8) - (themeErrors * 15) + (totalQuizzes * 3)));
    return { theme, mastery: Math.round(mastery) };
  });

  const avgMastery = Math.round(themeMastery.reduce((a, b) => a + b.mastery, 0) / themeMastery.length);

  return (
    <div className="card fade-in" style={{ marginBottom: 16, padding: "18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.92rem", color:"var(--text)" }}>
            {concours.icon} Progression {concours.label}
          </div>
          <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:2 }}>
            Maîtrise globale : <strong style={{ color: concours.color }}>{avgMastery}%</strong>
          </div>
        </div>
        {errors.length > 0 && (
          <button onClick={() => onStart({ mode:"errors", concours:selectedConcours, difficulty:2, theme:null })}
            style={{ background:`${concours.color}15`, color:concours.color, border:`1px solid ${concours.color}30`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:"0.75rem", fontWeight:700, fontFamily:"var(--font-display)", whiteSpace:"nowrap" }}>
            🎯 {errors.length} erreur{errors.length > 1 ? "s" : ""} →
          </button>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {themeMastery.map(({ theme, mastery }) => (
          <div key={theme}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem", marginBottom:4 }}>
              <span style={{ color:"var(--text)", fontWeight:600 }}>{theme}</span>
              <span style={{ color: mastery >= 70 ? concours.color : "var(--orange)", fontWeight:700 }}>{mastery}%</span>
            </div>
            <div style={{ height:6, background:"rgba(10,35,66,0.06)", borderRadius:3, overflow:"hidden" }}>
              <div style={{
                height:"100%",
                width:`${Math.max(8, mastery)}%`,
                background: mastery >= 70 ? concours.color : mastery >= 40 ? "#FF9800" : "var(--orange)",
                borderRadius:3,
                transition:"width 0.8s ease",
              }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
