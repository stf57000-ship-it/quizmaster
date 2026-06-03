// src/components/NotificationPrompt.jsx
import { useState } from "react";

export function NotificationPrompt({ onAccept, onDismiss, streak = 0 }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await onAccept();
    setLoading(false);
  };

  return (
    <div className="fade-in" style={{
      background: "var(--surface)",
      border: "1px solid rgba(29,184,164,0.25)",
      borderRadius: 16,
      padding: "16px 18px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: "0 4px 20px rgba(29,184,164,0.08)"
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>🔔</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "0.9rem",
          color: "var(--text)",
          marginBottom: 3
        }}>
          Rappel streak à 20h ?
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>
          {streak > 0
            ? `Ne perds pas ta série de ${streak} jour${streak > 1 ? "s" : ""} !`
            : "On te rappelle chaque soir pour maintenir ta régularité."}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleAccept}
          disabled={loading}
          style={{
            background: "var(--teal)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          {loading ? "..." : "Oui 👍"}
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "7px 14px",
            color: "var(--muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
            fontFamily: "var(--font-body)"
          }}
        >
          Non merci
        </button>
      </div>
    </div>
  );
}
