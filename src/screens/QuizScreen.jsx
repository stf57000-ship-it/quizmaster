// src/screens/QuizScreen.jsx — Feedback enrichi, animations, disclaimer IA
import { useState, useEffect, useRef } from "react";
import { CONCOURS } from "../lib/constants.js";
import { TimerBar } from "../components/UI.jsx";

const GOOD = ["Excellent ! 🎯", "Parfait ! ✨", "Bravo ! 🌟", "Super ! 💪", "C'est ça ! 🎉", "Bien joué ! 👏", "Impressionnant ! 🔥"];
const BAD  = ["Pas tout à fait... 🤔", "Presque ! 💡", "On y était presque 😅", "À retenir ! 📝", "Continue ! 💪", "La prochaine ! 🎯"];
const rand = (a) => a[Math.floor(Math.random() * a.length)];

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "correct") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.setValueAtTime(250, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

function popConfetti(color) {
  for (let i = 0; i < 12; i++) {
    const el = document.createElement("div");
    const size = Math.random() * 6 + 3;
    Object.assign(el.style, {
      position: "fixed",
      left: `${30 + Math.random() * 40}%`,
      top: `${20 + Math.random() * 30}%`,
      width: `${size}px`, height: `${size}px`,
      background: [color, "#FFB800", "#fff"][Math.floor(Math.random() * 3)],
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      zIndex: 9999, pointerEvents: "none",
      animation: `confetti-fall ${Math.random() * 1 + 0.8}s ease-in forwards`,
      animationDelay: `${Math.random() * 0.2}s`,
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

export function QuizScreen({ questions, concours: concoursKey, isExam, isExpress, examTimeLeft: initialExamTime, onAnswer, onFinish, onBack }) {
  const [current, setCurrent]       = useState(0);
  const [selected, setSelected]     = useState(null);
  const [revealed, setRevealed]     = useState(false);
  const [score, setScore]           = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [answers, setAnswers]       = useState([]);
  const [timeLeft, setTimeLeft]     = useState(isExpress ? 15 : 25);
  const [examTimeLeft, setExamTimeLeft] = useState(initialExamTime || 0);
  const [feedback, setFeedback]     = useState(null);
  const [streakMessage, setStreakMessage] = useState(null);
  const timerRef     = useRef(null);
  const examTimerRef = useRef(null);

  const concours = CONCOURS[concoursKey];
  const q        = questions[current];
  const progress = Math.round(((current + (revealed ? 1 : 0)) / questions.length) * 100);

  useEffect(() => {
    if (isExam || revealed) return;
    setTimeLeft(isExpress ? 15 : 25);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSelect(-1); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, isExam, isExpress]);

  useEffect(() => {
    if (!isExam || examTimeLeft <= 0) return;
    examTimerRef.current = setInterval(() => {
      setExamTimeLeft(t => { if (t <= 1) { clearInterval(examTimerRef.current); finish(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(examTimerRef.current);
  }, [isExam]);

  const handleSelect = (idx) => {
    if (revealed) return;
    clearInterval(timerRef.current);
    setSelected(idx);
    setRevealed(true);
    const isCorrect = idx === q.answer;

    if (isCorrect) {
      setScore(s => s + 1);
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      playSound("correct");
      popConfetti(concours?.color || "#1DB8A4");
      if (newStreak === 3)      setStreakMessage({ text: "🔥 3 d'affilée !", color: "#FF9800" });
      else if (newStreak === 5) setStreakMessage({ text: "⚡ 5 en série !", color: "#FF6B35" });
      else if (newStreak >= 7)  setStreakMessage({ text: "💎 Incroyable !", color: "#FFB800" });
      else                      setStreakMessage(null);
    } else {
      setCorrectStreak(0);
      setStreakMessage(null);
      playSound("wrong");
    }

    setFeedback({ text: isCorrect ? rand(GOOD) : rand(BAD), isCorrect });
    const newAnswers = [...answers, { selected: idx, correct: q.answer, isCorrect, question: q }];
    setAnswers(newAnswers);
    onAnswer?.({ question: q, selectedIdx: idx, isCorrect, concours: concoursKey });
    if (isExpress) setTimeout(() => handleNext(newAnswers), 1800);
  };

  const handleNext = (currentAnswers = answers) => {
    setFeedback(null);
    setStreakMessage(null);
    if (current + 1 >= questions.length) finish(currentAnswers);
    else { setCurrent(c => c + 1); setSelected(null); setRevealed(false); }
  };

  const finish = (currentAnswers = answers) => {
    clearInterval(examTimerRef.current);
    onFinish({ score, total: questions.length, answers: currentAnswers, isExam, isExpress });
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: "7px 14px" }}>← Quitter</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isExpress && <span style={{ fontSize: "0.72rem", background: "rgba(255,152,0,0.1)", color: "#E65100", padding: "3px 8px", borderRadius: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>⚡ Express</span>}
            {correctStreak >= 2 && !revealed && <span style={{ fontSize: "0.72rem", background: "rgba(255,107,53,0.1)", color: "var(--orange)", padding: "3px 8px", borderRadius: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>🔥 ×{correctStreak}</span>}
            {isExam && <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: examTimeLeft < 120 ? "var(--orange)" : "var(--text)" }}>⏱ {fmt(examTimeLeft)}</div>}
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: "var(--text)" }}>{current + 1}/{questions.length}</div>
          </div>
        </div>

        <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${concours?.color || "var(--teal)"},${concours?.color || "var(--teal)"}99)`, borderRadius: 3, transition: "width 0.4s ease" }} />
        </div>

        {!isExam && !revealed && (
          <div style={{ marginTop: 6 }}>
            <TimerBar value={timeLeft} max={isExpress ? 15 : 25} color={timeLeft <= 5 ? "var(--orange)" : concours?.color || "var(--teal)"} />
          </div>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 20px 120px" }}>

        {/* Série */}
        {streakMessage && (
          <div className="pop-in" style={{ textAlign: "center", padding: "8px", borderRadius: 12, background: `${streakMessage.color}15`, border: `1px solid ${streakMessage.color}30`, marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.1rem", color: streakMessage.color }}>{streakMessage.text}</span>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="fade-in" style={{ textAlign: "center", marginBottom: 14, padding: "10px", borderRadius: 12, background: feedback.isCorrect ? "rgba(29,184,164,0.1)" : "rgba(255,107,53,0.1)", border: `1px solid ${feedback.isCorrect ? "rgba(29,184,164,0.3)" : "rgba(255,107,53,0.3)"}` }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: feedback.isCorrect ? "var(--teal)" : "var(--orange)" }}>{feedback.text}</span>
          </div>
        )}

        {/* Thème */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>{concours?.icon}</span>
          <span style={{ fontSize: "0.75rem", color: concours?.color || "var(--teal)", fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: 1 }}>{q?.theme || concours?.label}</span>
        </div>

        {/* Question */}
        <div className="card slide-in" style={{ marginBottom: 18, padding: "20px 22px" }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.55 }}>{q?.q}</p>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q?.options?.map((opt, idx) => {
            let bg = "var(--surface)", border = "var(--border)", color = "var(--text)", transform = "none";
            if (revealed) {
              if (idx === q.answer)          { bg = "rgba(29,184,164,0.1)"; border = "var(--teal)"; color = "var(--teal)"; transform = "scale(1.01)"; }
              else if (idx === selected)     { bg = "rgba(255,107,53,0.1)"; border = "var(--orange)"; color = "var(--orange)"; }
              else                           { color = "var(--muted)"; }
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={revealed}
                style={{ background: bg, border: `2px solid ${border}`, borderRadius: 14, padding: "14px 18px", cursor: revealed ? "default" : "pointer", textAlign: "left", transition: "all 0.25s", display: "flex", alignItems: "center", gap: 12, fontFamily: "var(--font-body)", fontSize: "0.9rem", color, transform }}>
                <span style={{ minWidth: 26, height: 26, borderRadius: 7, background: revealed && idx === q.answer ? "var(--teal)" : "rgba(10,35,66,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.82rem", color: revealed && idx === q.answer ? "#fff" : "var(--muted)", flexShrink: 0 }}>
                  {["A", "B", "C", "D"][idx]}
                </span>
                <span style={{ flex: 1, lineHeight: 1.4 }}>{opt}</span>
                {revealed && idx === q.answer && <span style={{ fontSize: 18 }}>✓</span>}
                {revealed && idx === selected && idx !== q.answer && <span style={{ fontSize: 18 }}>✗</span>}
              </button>
            );
          })}
        </div>

        {/* Explication + disclaimer IA */}
        {revealed && q?.explanation && !isExpress && (
          <div className="fade-in card" style={{ marginTop: 16, background: "rgba(29,184,164,0.05)", border: "1px solid rgba(29,184,164,0.2)", padding: 18 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "var(--font-display)" }}>💡 Explication</div>
            <p style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.65, marginBottom: 12 }}>{q.explanation}</p>
            {/* Disclaimer IA */}
            <div style={{
              borderTop: "1px solid rgba(29,184,164,0.15)",
              paddingTop: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 7
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🤖</span>
              <p style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                lineHeight: 1.5,
                margin: 0,
                fontStyle: "italic"
              }}>
                Cette explication est générée par IA à titre indicatif. Elle peut contenir des imprécisions — consulte toujours les référentiels officiels de ton concours.
              </p>
            </div>
          </div>
        )}

        {/* Bouton suivant */}
        {revealed && !isExpress && (
          <button className="btn btn-teal fade-in" onClick={() => handleNext()}
            style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "15px", fontSize: "0.95rem" }}>
            {current + 1 >= questions.length ? "🏁 Voir mes résultats" : "Suivant →"}
          </button>
        )}
      </div>
    </div>
  );
}
