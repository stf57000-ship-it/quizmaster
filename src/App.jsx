// src/App.jsx — v7 Ultimate : notifications push + défi semaine + score comparatif
import { useState, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth.js";
import { useProgress } from "./hooks/useProgress.js";
import { usePushNotifications } from "./hooks/usePushNotifications.js";
import { generateQuiz, generateExamBlanc, generateFlashcards, quizPreloader } from "./lib/ai.js";
import { updateStreak, addError, recordQuizResult } from "./lib/progress.js";
import { CONCOURS } from "./lib/constants.js";
import { shouldTriggerSurpriseReward, getRandomSurpriseReward, calculatePoints, getPointsLevel, getStreakWarning, getWelcomeBackMessage, getCuriosityMessage } from "./lib/psychology.js";

import { AuthModal }    from "./components/AuthModal.jsx";
import { PricingModal } from "./components/PricingModal.jsx";
import { BadgeNotification } from "./components/UI.jsx";
import { LoadingQuiz }  from "./components/LoadingQuiz.jsx";
import { BadgeShareCard, StreakShareCard } from "./components/ShareCard.jsx";
import { ChallengeBanner, readChallengeFromURL } from "./components/ChallengeCard.jsx";
import { SurpriseReward, StreakWarning, LevelBadge, CuriosityHook, WelcomeBack } from "./components/MicroReward.jsx";
import { NotificationPrompt } from "./components/NotificationPrompt.jsx";
import { WeeklyChallenge } from "./components/WeeklyChallenge.jsx";

import { LandingPage }      from "./screens/LandingPage.jsx";
import { OnboardingScreen } from "./screens/OnboardingScreen.jsx";
import { HomeScreen }       from "./screens/HomeScreen.jsx";
import { QuizScreen }       from "./screens/QuizScreen.jsx";
import { ResultScreen, FlashcardsScreen } from "./screens/ResultScreen.jsx";
import { DashboardScreen, BadgesScreen, LeaderboardScreen } from "./screens/DashboardScreen.jsx";
import { PremiumSuccess }   from "./screens/PremiumSuccess.jsx";

const NOTIF_DISMISSED_KEY = "cs_notif_dismissed";
const QUIZ_COUNT_KEY      = "cs_session_quiz_count";

function showFloatingPoints(pts) {
  const el = document.createElement("div");
  el.className = "points-float"; el.textContent = `+${pts} pts`;
  el.style.left = `${Math.random() * 60 + 20}%`; el.style.top = `${Math.random() * 30 + 30}%`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1600);
}

export default function App() {
  const { user, loading: authLoading, isPremium, logout, userName, refreshPremium } = useAuth();
  const { state: appState, update, newBadge, clearBadge, syncStatus, canStartQuiz, consumeQuizSlot, dailyRemaining } = useProgress(user, isPremium);
  const { permission, requestPermission, isSupported } = usePushNotifications(appState.streak || 0);

  const [screen, setScreen]         = useState("landing");
  const [activeTab, setActiveTab]   = useState("quiz");
  const [darkMode, setDarkMode]     = useState(() => localStorage.getItem("cs_dark") === "1");
  const [showAuth, setShowAuth]         = useState(false);
  const [showPricing, setShowPricing]   = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);

  const [surpriseReward, setSurpriseReward] = useState(null);
  const [streakWarning, setStreakWarning]   = useState(null);
  const [welcomeBack, setWelcomeBack]       = useState(null);
  const [shareNewBadge, setShareNewBadge]   = useState(null);
  const [shareStreak, setShareStreak]       = useState(null);
  const [selectedConcours, setSelectedConcours] = useState(null);

  // Notifications : afficher le bandeau après le 2ème quiz de la session
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [sessionQuizCount, setSessionQuizCount] = useState(
    () => parseInt(localStorage.getItem(QUIZ_COUNT_KEY) || "0", 10)
  );

  const challengeData = useRef(readChallengeFromURL());
  const [challengeVisible, setChallengeVisible] = useState(!!challengeData.current);

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadMode, setLoadMode]       = useState("quiz");
  const [loadError, setLoadError]     = useState(null);

  const points = calculatePoints(appState);
  const level  = getPointsLevel(points);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("cs_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  // Retour de Stripe
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("payment") === "success") {
      window.history.replaceState({}, "", "/");
      refreshPremium().then(() => setShowPremiumSuccess(true));
    }
  }, []);

  useEffect(() => {
    if (authLoading || !appState.lastDay) return;
    const d = Math.floor((new Date() - new Date(appState.lastDay)) / 86400000);
    const msg = getWelcomeBackMessage(userName, d, appState.streak);
    if (msg) setWelcomeBack(msg);
  }, [authLoading, userName]);

  useEffect(() => { setStreakWarning(getStreakWarning(appState.streak, appState.lastDay)); }, [appState.streak, appState.lastDay]);

  useEffect(() => {
    const s = appState.streak || 0;
    if ([7, 14, 30, 60, 100].includes(s)) {
      const k = `streak_shown_${s}`;
      if (!localStorage.getItem(k)) { localStorage.setItem(k, "1"); setShareStreak(s); }
    }
  }, [appState.streak]);

  useEffect(() => { if (newBadge) setShareNewBadge(newBadge); }, [newBadge]);

  // Afficher le bandeau notif après le 2ème quiz de session
  useEffect(() => {
    if (!isSupported) return;
    if (permission === "granted" || permission === "denied") return;
    if (localStorage.getItem(NOTIF_DISMISSED_KEY)) return;
    if (sessionQuizCount >= 2) setShowNotifPrompt(true);
  }, [sessionQuizCount, permission, isSupported]);

  const handleNotifAccept = async () => {
    const result = await requestPermission();
    setShowNotifPrompt(false);
    if (result !== "granted") localStorage.setItem(NOTIF_DISMISSED_KEY, "1");
  };

  const handleNotifDismiss = () => {
    setShowNotifPrompt(false);
    localStorage.setItem(NOTIF_DISMISSED_KEY, "1");
  };

  const handleEnterApp = () => setScreen(localStorage.getItem("cs_onboarding_done") ? "home" : "onboarding");
  const handleOnboardingComplete = (prefs) => {
    localStorage.setItem("cs_onboarding_done", "1");
    if (prefs.concours) { update(s => ({ ...s, preferredConcours: prefs.concours, preferredNiveau: prefs.niveau })); setSelectedConcours(prefs.concours); }
    setScreen("home");
  };

  const handleStart = async ({ mode, concours, difficulty, theme }) => {
    const check = canStartQuiz(); if (!check.allowed) { setShowPricing(true); return; }
    setLoading(true); setLoadError(null); setLoadMode(mode);
    setSelectedConcours(concours); setSessionData(prev => ({ ...prev, concours, mode }));
    try {
      if (mode === "flashcards") {
        const data = await generateFlashcards(concours, theme);
        consumeQuizSlot();
        setSessionData({ concours, mode: "flashcards", flashcards: data.flashcards });
        setScreen("flashcards");
        return;
      }
      let data;
      if (mode === "errors") {
        const errs = (appState.errors || {})[concours] || [];
        if (!errs.length) { setLoadError("Pas encore d'erreurs !"); return; }
        data = await generateQuiz(concours, difficulty, null, true, errs);
      } else if (mode === "exam") {
        data = await generateExamBlanc(concours);
      } else {
        data = await quizPreloader.get(concours, difficulty, theme);
      }
      const questions = mode === "express" ? data.questions.slice(0, 5) : data.questions;
      consumeQuizSlot();
      update(s => updateStreak({ ...s, concoursPlayed: { ...(s.concoursPlayed || {}), [concours]: true } }));
      setSessionData({ concours, mode: "quiz", questions, isExam: mode === "exam", isExpress: mode === "express" });
      setScreen("quiz");

      // Compteur de quiz session pour notif prompt
      const newCount = sessionQuizCount + 1;
      setSessionQuizCount(newCount);
      localStorage.setItem(QUIZ_COUNT_KEY, String(newCount));

    } catch (e) {
      if (e.code === "RATE_LIMIT_EXCEEDED") setShowPricing(true);
      else setLoadError(e.message || "Impossible de générer.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = ({ question, isCorrect, concours }) => {
    if (!isCorrect) update(s => addError(s, concours, question));
  };

  const handleFinish = ({ score, total, answers, isExam, isExpress }) => {
    update(s => recordQuizResult(s, { score, total, isExam, concours: sessionData?.concours }));
    setSessionData(prev => ({ ...prev, score, total, answers, isExam, isExpress }));
    setScreen("result");
    setTimeout(() => showFloatingPoints(score * 5 + (isExam ? 50 : 10)), 500);
    if (shouldTriggerSurpriseReward() && score / total >= 0.6)
      setTimeout(() => setSurpriseReward(getRandomSurpriseReward()), 1200);
  };

  const backToHome = () => { setScreen("home"); setSessionData(null); setLoadError(null); };
  const curiosityMsg = selectedConcours ? getCuriosityMessage(appState, selectedConcours) : null;

  if (showPremiumSuccess) return <PremiumSuccess userName={userName} onContinue={() => { setShowPremiumSuccess(false); setScreen("home"); }} />;
  if (authLoading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>;

  if (screen === "landing") return (
    <>
      <LandingPage onEnterApp={handleEnterApp} onShowAuth={() => setShowAuth(true)} onShowPricing={() => setShowPricing(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); handleEnterApp(); }} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} user={user} onShowAuth={() => { setShowPricing(false); setShowAuth(true); }} />}
    </>
  );
  if (screen === "onboarding") return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  if (loading) return <LoadingQuiz mode={loadMode} concoursKey={sessionData?.concours || selectedConcours} />;

  if (screen === "quiz") return (
    <QuizScreen
      questions={sessionData.questions}
      concours={sessionData.concours}
      isExam={sessionData.isExam}
      isExpress={sessionData.isExpress}
      examTimeLeft={sessionData.isExam ? 25 * 60 : 0}
      onAnswer={handleAnswer}
      onFinish={handleFinish}
      onBack={backToHome}
    />
  );

  if (screen === "result") return (
    <>
      <ResultScreen
        score={sessionData.score}
        total={sessionData.total}
        answers={sessionData.answers}
        concours={sessionData.concours}
        isExam={sessionData.isExam}
        isExpress={sessionData.isExpress}
        userName={userName}
        onRestart={() => handleStart({ mode: sessionData.isExam ? "exam" : "quiz", concours: sessionData.concours, difficulty: 2, theme: null })}
        onHome={backToHome}
      />
      {surpriseReward && <SurpriseReward reward={surpriseReward} onClose={() => setSurpriseReward(null)} />}
    </>
  );

  if (screen === "flashcards") return <FlashcardsScreen flashcards={sessionData.flashcards} concours={sessionData.concours} onBack={backToHome} />;

  const TABS = [
    { id: "quiz", icon: "🧠", label: "Quiz" },
    { id: "dashboard", icon: "📊", label: "Progrès" },
    { id: "badges", icon: "🏅", label: "Badges" },
    { id: "leaderboard", icon: "🏆", label: "Classement" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40 }}>
        <button onClick={() => setScreen("landing")} style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.1rem", color: "var(--text)", background: "none", border: "none", cursor: "pointer" }}>🩺 ConcoursSanté</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LevelBadge points={points} level={level} compact />
          <button onClick={() => setDarkMode(d => !d)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: "0.85rem" }}>{darkMode ? "☀️" : "🌙"}</button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isPremium
                ? <span style={{ fontSize: "0.72rem", background: "#FFB80020", color: "#A07800", padding: "3px 8px", borderRadius: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>👑 Premium</span>
                : <button className="btn btn-teal" onClick={() => setShowPricing(true)} style={{ padding: "6px 12px", fontSize: "0.78rem" }}>👑 Premium</button>
              }
              <button className="btn btn-ghost" onClick={logout} style={{ padding: "7px 12px", fontSize: "0.82rem" }}>Déconnexion</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowAuth(true)} style={{ padding: "7px 14px", fontSize: "0.84rem" }}>Connexion</button>
              <button className="btn btn-teal" onClick={() => setShowPricing(true)} style={{ padding: "7px 14px", fontSize: "0.84rem" }}>Premium</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 100px" }}>
        {welcomeBack && activeTab === "quiz" && <WelcomeBack message={welcomeBack} onDismiss={() => setWelcomeBack(null)} />}
        {challengeVisible && activeTab === "quiz" && challengeData.current && (
          <ChallengeBanner
            challenge={challengeData.current}
            onAccept={(k) => { setChallengeVisible(false); window.history.replaceState({}, "", "/"); handleStart({ mode: "quiz", concours: k, difficulty: 2, theme: null }); }}
            onDismiss={() => { setChallengeVisible(false); window.history.replaceState({}, "", "/"); }}
          />
        )}
        {streakWarning && activeTab === "quiz" && <StreakWarning warning={streakWarning} onRevise={() => setStreakWarning(null)} onDismiss={() => setStreakWarning(null)} />}

        {/* Bandeau notifications push */}
        {showNotifPrompt && activeTab === "quiz" && (
          <NotificationPrompt
            streak={appState.streak || 0}
            onAccept={handleNotifAccept}
            onDismiss={handleNotifDismiss}
          />
        )}

        {curiosityMsg && activeTab === "quiz" && <CuriosityHook message={curiosityMsg} onAction={() => selectedConcours && handleStart({ mode: "errors", concours: selectedConcours, difficulty: 2, theme: null })} />}
        {loadError && <div style={{ background: "#FEE", border: "1px solid #FCC", borderRadius: 10, padding: "11px 14px", color: "#C00", fontSize: "0.86rem", marginBottom: 16 }}>⚠️ {loadError}</div>}

        {/* Défi de la semaine — affiché sur l'onglet Quiz */}
        {activeTab === "quiz" && (
          <WeeklyChallenge
            appState={appState}
            onStart={() => handleStart({
              mode: "quiz",
              concours: selectedConcours || appState.preferredConcours || "infirmier",
              difficulty: 2,
              theme: null
            })}
          />
        )}

        {activeTab === "quiz" && <HomeScreen appState={appState} user={user} userName={userName} isPremium={isPremium} dailyRemaining={dailyRemaining} onStart={handleStart} onShowAuth={() => setShowAuth(true)} onShowPricing={() => setShowPricing(true)} onUpdateState={update} onConcoursSelect={setSelectedConcours} />}
        {activeTab === "dashboard" && <DashboardScreen appState={appState} user={user} userName={userName} isPremium={isPremium} syncStatus={syncStatus} points={points} level={level} onShowAuth={() => setShowAuth(true)} />}
        {activeTab === "badges" && <BadgesScreen appState={appState} isPremium={isPremium} />}
        {activeTab === "leaderboard" && <LeaderboardScreen appState={appState} user={user} userName={userName} selectedConcours={selectedConcours} />}
      </div>

      {/* Tab bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", padding: "8px 0 12px", zIndex: 50 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} user={user} onShowAuth={() => { setShowPricing(false); setShowAuth(true); }} />}
      {newBadge && !shareNewBadge && <BadgeNotification badge={newBadge} onClose={clearBadge} />}
      {shareNewBadge && <BadgeShareCard badge={shareNewBadge} userName={userName} onClose={() => { setShareNewBadge(null); clearBadge(); }} />}
      {shareStreak && <StreakShareCard streak={shareStreak} userName={userName} onClose={() => setShareStreak(null)} />}
    </div>
  );
}
