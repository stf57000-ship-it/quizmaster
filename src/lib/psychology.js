// src/lib/psychology.js — Micro-récompenses psychologiques

export function shouldTriggerSurpriseReward() { return Math.random() < 0.3; }

export const SURPRISE_REWARDS = [
  { id:"hot_streak",   icon:"🔥", title:"En feu !",           desc:"Tu enchaînes les bonnes réponses !",   points:50 },
  { id:"sharp_mind",   icon:"🧠", title:"Esprit affûté !",    desc:"Ta concentration est au maximum.",      points:30 },
  { id:"rising_star",  icon:"⭐", title:"Étoile montante !",  desc:"Tu progresses à toute vitesse !",       points:40 },
  { id:"champion",     icon:"🏆", title:"Futur champion !",   desc:"Les concours n'ont qu'à bien se tenir.",points:60 },
  { id:"focused",      icon:"🎯", title:"Laser focus !",      desc:"Quelle concentration aujourd'hui !",    points:35 },
  { id:"unstoppable",  icon:"💪", title:"Inarrêtable !",      desc:"Rien ne peut t'arrêter.",               points:45 },
];

export function getRandomSurpriseReward() {
  return SURPRISE_REWARDS[Math.floor(Math.random() * SURPRISE_REWARDS.length)];
}

export function calculatePoints(state) {
  return (
    (state.totalQuizzes  || 0) * 10 +
    (state.totalCorrect  || 0) * 5  +
    (state.streak        || 0) * 20 +
    (state.earnedBadges?.length || 0) * 100 +
    (state.examCount     || 0) * 50 +
    (state.bestScore     || 0) * 2
  );
}

export function getPointsLevel(points) {
  if (points < 100)  return { level:1, label:"Débutant",  icon:"🌱", next:100  };
  if (points < 300)  return { level:2, label:"Apprenti",  icon:"📖", next:300  };
  if (points < 600)  return { level:3, label:"Studieux",  icon:"🎯", next:600  };
  if (points < 1000) return { level:4, label:"Confirmé",  icon:"⭐", next:1000 };
  if (points < 2000) return { level:5, label:"Expert",    icon:"🧠", next:2000 };
  if (points < 3500) return { level:6, label:"Champion",  icon:"🏆", next:3500 };
  return               { level:7, label:"Légende",        icon:"👑", next:null };
}

export function getStreakWarning(streak, lastDay) {
  if (!streak) return null;
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastDay === yesterday) {
    const urgent = new Date().getHours() >= 18;
    return {
      urgent,
      message: `${urgent?"⚠️":"🔥"} Streak de ${streak} jour${streak>1?"s":""} ${urgent?"expire ce soir !":"à maintenir !"}`,
      sub: urgent ? "Il te reste quelques heures pour réviser." : "Fais au moins un quiz aujourd'hui."
    };
  }
  return null;
}

export function getCuriosityMessage(state, concoursKey) {
  const errors = (state.errors || {})[concoursKey] || [];
  if (errors.length >= 3) return { icon:"🔍", text:`Tu as ${errors.length} questions que tu rates souvent`, cta:"Voir mes points faibles →", mode:"errors" };
  const acc = state.totalAnswered ? Math.round((state.totalCorrect/state.totalAnswered)*100) : null;
  if (acc && acc < 70) return { icon:"📊", text:`${100-acc}% des questions te résistent encore`, cta:"Cibler mes lacunes →", mode:"errors" };
  return null;
}

export function getActiveCandidates(concoursKey) {
  const bases = { aide_soignant:45, infirmier:38, auxiliaire:22, ambulancier:18, atsem:12, pompier:34, police_nationale:41, gendarmerie:29, armee:19, ash:16, adjoint_administratif:11, agent_mortuaire:8, bac_assp:27, cap_aepe:21 };
  const base = bases[concoursKey] || 15;
  const variation = Math.floor(Math.sin(new Date().getHours() * 0.8) * 8) + 5;
  return Math.max(5, base + variation);
}

export function getWelcomeBackMessage(userName, daysSince, streak) {
  if (daysSince === 0) return null;
  const name = userName?.split(" ")[0] || "toi";
  if (daysSince === 1 && streak > 0) return { icon:"🔥", text:`Content de te revoir ${name} ! Ton streak continue.` };
  if (daysSince === 2) return { icon:"👋", text:`2 jours sans réviser ${name}... Les concours n'attendent pas !` };
  if (daysSince < 7)   return { icon:"💪", text:`${daysSince} jours d'absence — on reprend ${name} ?` };
  return { icon:"🌱", text:`${name}, tu es de retour ! Repartons de zéro ensemble.` };
}

export function triggerConfetti() {
  const colors = ["#1DB8A4","#FFB800","#FF6B35","#7B61FF","#2E86AB"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = Math.random() * 8 + 4;
    Object.assign(el.style, {
      position:"fixed", left:`${Math.random()*100}%`, top:"-10px",
      width:`${size}px`, height:`${size}px`, background:color,
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      zIndex:9999, pointerEvents:"none",
      animation:`confetti-fall ${Math.random()*2+1.5}s ease-in forwards`,
      animationDelay:`${Math.random()*0.5}s`,
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}
