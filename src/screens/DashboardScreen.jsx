// src/screens/DashboardScreen.jsx
import { useState, useEffect } from "react";
import { BADGES, CONCOURS } from "../lib/constants.js";
import { getStreak, getGlobalAccuracy } from "../lib/progress.js";
import { ProgressRing, WeekChart } from "../components/UI.jsx";
import { LevelBadge } from "../components/MicroReward.jsx";
import { getLeaderboard } from "../lib/supabase.js";

export function DashboardScreen({ appState, user, userName, isPremium, syncStatus, points, level, onShowAuth }) {
  const streak=getStreak(appState);
  const globalAccuracy=getGlobalAccuracy(appState);

  return (
    <div className="fade-up">
      <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)",marginBottom:4}}>Mon tableau de bord</div>
      <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
        {user?<><span style={{width:7,height:7,borderRadius:"50%",background:"var(--teal)",display:"inline-block"}}/>Synchronisé · {userName}{isPremium?" 👑":""}</>:"Connectez-vous pour sauvegarder"}
      </div>

      {points!==undefined&&<div style={{marginBottom:16}}><LevelBadge points={points} level={level}/></div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
          <ProgressRing value={globalAccuracy} max={100} color="var(--teal)" size={72}/>
          <div><div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.8rem",color:"var(--text)",lineHeight:1}}>{globalAccuracy}%</div><div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:3}}>Précision</div></div>
        </div>
        <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
          <ProgressRing value={Math.min(streak,30)} max={30} color="#FF9800" size={72}/>
          <div><div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.8rem",color:"var(--text)",lineHeight:1}}>{streak}j</div><div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:3}}>Streak</div></div>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:"0.7rem",letterSpacing:2,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",fontFamily:"var(--font-display)",marginBottom:14}}>Activité — 7 derniers jours</div>
        <WeekChart history={appState.history}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{label:"Quiz totaux",value:appState.totalQuizzes||0,icon:"🎯"},{label:"Examens blancs",value:appState.examCount||0,icon:"📋"},{label:"Meilleur score",value:`${appState.bestScore||0}%`,icon:"🏆"}].map(s=>(
          <div key={s.label} className="card" style={{textAlign:"center",padding:"14px 8px"}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.2rem",color:"var(--text)"}}>{s.value}</div>
            <div style={{fontSize:"0.7rem",color:"var(--muted)",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {!user&&<div style={{background:"rgba(29,184,164,0.08)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:14,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--text)",fontSize:"0.9rem"}}>☁️ Sauvegarde cloud</div>
          <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>Connecte-toi pour ne jamais perdre ta progression.</div>
        </div>
        <button className="btn btn-teal" onClick={onShowAuth} style={{padding:"8px 16px",whiteSpace:"nowrap"}}>Connexion</button>
      </div>}
    </div>
  );
}

export function BadgesScreen({ appState, isPremium }) {
  const earnedBadges=BADGES.filter(b=>(appState.earnedBadges||[]).includes(b.id));
  return (
    <div className="fade-up">
      <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)",marginBottom:4}}>Mes badges</div>
      <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:20}}>{earnedBadges.length}/{BADGES.length} badges débloqués</div>
      <div style={{background:"rgba(10,35,66,0.06)",borderRadius:10,height:8,marginBottom:24,overflow:"hidden"}}>
        <div style={{width:`${Math.round((earnedBadges.length/BADGES.length)*100)}%`,height:"100%",background:"linear-gradient(90deg,var(--teal),var(--blue))",borderRadius:10,transition:"width 0.5s"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
        {BADGES.map(b=>{
          const earned=(appState.earnedBadges||[]).includes(b.id);
          return (
            <div key={b.id} className="card" style={{textAlign:"center",padding:"20px 14px",opacity:earned?1:0.4,filter:earned?"none":"grayscale(1)",transition:"all 0.3s"}}>
              <div style={{fontSize:32,marginBottom:10}}>{b.icon}</div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.85rem",color:"var(--text)",marginBottom:4}}>{b.label}</div>
              <div style={{fontSize:"0.72rem",color:"var(--muted)",lineHeight:1.4}}>{b.desc}</div>
              {earned&&<div style={{marginTop:8,fontSize:"0.7rem",color:"var(--teal)",fontWeight:700}}>✓ Débloqué</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeaderboardScreen({ appState, user, userName, selectedConcours }) {
  const [leaders,setLeaders]=useState([]);
  const [loading,setLoading]=useState(true);
  const streak=getStreak(appState);
  const globalAccuracy=getGlobalAccuracy(appState);

  useEffect(()=>{
    getLeaderboard(9).then(data=>{setLeaders(data);setLoading(false);});
  },[]);

  const rows=loading?[]:leaders.slice(0,3).map((l,i)=>({
    rank:i+1, name:l.user_id===user?.id?userName:`Candidat ${i+1}`,
    score:l.best_score||0, streak:l.streak||0,
    concours:Object.keys(l.concours_played||{})[0]?CONCOURS[Object.keys(l.concours_played)[0]]?.label:"—",
    badge:["🏆","🥈","🥉"][i]||"", isYou:l.user_id===user?.id,
  }));

  const userInTop=rows.find(r=>r.isYou);
  if(!userInTop)rows.push({rank:"?",name:userName,score:globalAccuracy,streak,concours:selectedConcours?CONCOURS[selectedConcours]?.label:"—",badge:"👤",isYou:true});

  return (
    <div className="fade-up">
      <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)",marginBottom:4}}>Classement</div>
      <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:22}}>Meilleurs scores de la plateforme</div>
      {loading?<div style={{textAlign:"center",padding:40,color:"var(--muted)"}}>Chargement...</div>:rows.map((p,i)=>(
        <div key={i} className="card" style={{marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"14px 18px",border:p.isYou?"2px solid var(--teal)":"1px solid var(--border)",background:p.isYou?"rgba(29,184,164,0.04)":"var(--surface)"}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.1rem",color:p.rank<=3?"#FFB800":"var(--muted)",minWidth:28,textAlign:"center"}}>{p.badge||p.rank}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:p.isYou?"var(--teal)":"var(--text)"}}>{p.name}{p.isYou?" (Toi)":""}</div>
            <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{p.concours} · 🔥 {p.streak}j</div>
          </div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.1rem",color:p.isYou?"var(--teal)":"var(--text)"}}>{p.score}%</div>
        </div>
      ))}
    </div>
  );
}
