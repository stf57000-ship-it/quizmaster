// src/components/ShareCard.jsx
import { useRef, useState } from "react";
import { CONCOURS } from "../lib/constants.js";

async function shareOrDownload(canvas, filename) {
  const blob = await new Promise(r=>canvas.toBlob(r,"image/png",1.0));
  const file = new File([blob], filename, {type:"image/png"});
  if (navigator.share && navigator.canShare?.({files:[file]})) {
    await navigator.share({title:"ConcoursSanté",text:"Je me prépare avec ConcoursSanté !",files:[file]});
  } else {
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  }
}

function drawBase(ctx, W, H, bg1="#0A2342", bg2="#1a3a5c") {
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,bg1);grad.addColorStop(1,bg2);
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.font="bold 36px sans-serif";ctx.fillStyle="rgba(255,255,255,0.4)";ctx.textAlign="left";
  ctx.fillText("🩺 ConcoursSanté",80,90);
  ctx.font="bold 38px sans-serif";ctx.fillStyle="rgba(255,255,255,0.25)";
  ctx.textAlign="left";ctx.fillText("concourssante.fr — Quiz IA gratuit",80,H-80);
}

export function ScoreShareCard({ score, total, concoursKey, userName, onClose }) {
  const canvasRef=useRef(null);
  const [shared,setShared]=useState(false);
  const concours=CONCOURS[concoursKey];
  const percent=Math.round((score/total)*100);
  const color=percent===100?"#FFB800":percent>=70?"#1DB8A4":"#FF6B35";
  const emoji=percent===100?"🏆":percent>=70?"🎉":"💪";

  const handleShare=async()=>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const W=1080,H=1080;canvas.width=W;canvas.height=H;
    drawBase(ctx,W,H);
    ctx.font="bold 48px sans-serif";ctx.fillStyle=concours?.color||"#1DB8A4";ctx.textAlign="left";
    ctx.fillText(`${concours?.icon||"🎯"} ${concours?.label||"Quiz"}`,80,200);
    ctx.textAlign="center";
    ctx.font="100px sans-serif";ctx.fillText(emoji,W/2,H/2-130);
    ctx.font="bold 220px sans-serif";ctx.fillStyle=color;ctx.fillText(`${percent}%`,W/2,H/2+60);
    ctx.font="bold 52px sans-serif";ctx.fillStyle="rgba(255,255,255,0.85)";ctx.fillText(`${score}/${total} bonnes réponses`,W/2,H/2+190);
    ctx.font="40px sans-serif";ctx.fillStyle="rgba(255,255,255,0.5)";ctx.fillText(userName||"Candidat",W/2,H/2+270);
    await shareOrDownload(canvas,`score-${percent}.png`);
    setShared(true);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div className="fade-up card" style={{width:"100%",maxWidth:400,padding:28}}>
        <canvas ref={canvasRef} style={{display:"none"}}/>
        <div style={{background:"linear-gradient(135deg,#0A2342,#1a3a5c)",borderRadius:18,padding:32,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>{emoji}</div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"3.5rem",color,lineHeight:1}}>{percent}%</div>
          <div style={{color:"rgba(255,255,255,0.7)",fontSize:"0.9rem",marginTop:8}}>{score}/{total} — {concours?.label}</div>
        </div>
        <button className="btn btn-teal" onClick={handleShare} style={{width:"100%",justifyContent:"center",padding:"13px",marginBottom:10}}>{shared?"✅ Partagé !":"📤 Partager mon score"}</button>
        <button className="btn btn-ghost" onClick={onClose} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Fermer</button>
      </div>
    </div>
  );
}

export function BadgeShareCard({ badge, userName, onClose }) {
  const canvasRef=useRef(null);
  const [shared,setShared]=useState(false);

  const handleShare=async()=>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const W=1080,H=1080;canvas.width=W;canvas.height=H;
    drawBase(ctx,W,H,"#1a0a42","#0a2342");
    ctx.textAlign="center";
    ctx.font="bold 52px sans-serif";ctx.fillStyle="#FFB800";ctx.fillText("🏅 Badge débloqué !",W/2,220);
    ctx.font="160px sans-serif";ctx.fillText(badge.icon,W/2,H/2+20);
    ctx.font="bold 72px sans-serif";ctx.fillStyle="#fff";ctx.fillText(badge.label,W/2,H/2+140);
    ctx.font="44px sans-serif";ctx.fillStyle="rgba(255,255,255,0.6)";ctx.fillText(badge.desc,W/2,H/2+220);
    ctx.font="40px sans-serif";ctx.fillStyle="rgba(255,255,255,0.35)";ctx.fillText(userName||"Candidat",W/2,H/2+310);
    await shareOrDownload(canvas,`badge-${badge.id}.png`);
    setShared(true);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div className="fade-up card" style={{width:"100%",maxWidth:400,padding:28}}>
        <canvas ref={canvasRef} style={{display:"none"}}/>
        <div style={{background:"linear-gradient(135deg,#1a0a42,#0a2342)",borderRadius:18,padding:32,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:"0.75rem",color:"#FFB800",fontWeight:700,letterSpacing:2,marginBottom:12,fontFamily:"var(--font-display)",textTransform:"uppercase"}}>Badge débloqué !</div>
          <div style={{fontSize:64,marginBottom:12}}>{badge.icon}</div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.4rem",color:"#fff"}}>{badge.label}</div>
          <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.82rem",marginTop:6}}>{badge.desc}</div>
        </div>
        <button className="btn btn-teal" onClick={handleShare} style={{width:"100%",justifyContent:"center",padding:"13px",marginBottom:10}}>{shared?"✅ Partagé !":"📤 Partager ce badge"}</button>
        <button className="btn btn-ghost" onClick={onClose} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Fermer</button>
      </div>
    </div>
  );
}

export function StreakShareCard({ streak, userName, onClose }) {
  const canvasRef=useRef(null);
  const [shared,setShared]=useState(false);
  const color=streak>=30?"#FF6B35":streak>=14?"#FF9800":"#FFB800";

  if(![7,14,30,60,100].includes(streak)) return null;

  const handleShare=async()=>{
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const W=1080,H=1080;canvas.width=W;canvas.height=H;
    drawBase(ctx,W,H,"#1a0800","#2a1200");
    ctx.textAlign="center";
    ctx.font="160px sans-serif";ctx.fillText("🔥",W/2,H/2-80);
    ctx.font="bold 200px sans-serif";ctx.fillStyle=color;ctx.fillText(`${streak}`,W/2,H/2+120);
    ctx.font="bold 60px sans-serif";ctx.fillStyle="#fff";ctx.fillText(`jour${streak>1?"s":""} de révision`,W/2,H/2+210);
    ctx.font="44px sans-serif";ctx.fillStyle="rgba(255,255,255,0.5)";ctx.fillText("sans interruption !",W/2,H/2+280);
    ctx.font="40px sans-serif";ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillText(userName||"Candidat",W/2,H/2+360);
    await shareOrDownload(canvas,`streak-${streak}j.png`);
    setShared(true);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div className="fade-up card" style={{width:"100%",maxWidth:400,padding:28}}>
        <canvas ref={canvasRef} style={{display:"none"}}/>
        <div style={{background:"linear-gradient(135deg,#1a0800,#2a1200)",borderRadius:18,padding:32,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:52,marginBottom:8}}>🔥</div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"3rem",color,lineHeight:1}}>{streak} jours</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:"0.9rem",marginTop:8}}>de révision sans interruption !</div>
        </div>
        <button className="btn btn-orange" onClick={handleShare} style={{width:"100%",justifyContent:"center",padding:"13px",marginBottom:10}}>{shared?"✅ Partagé !":"📤 Partager mon streak"}</button>
        <button className="btn btn-ghost" onClick={onClose} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Fermer</button>
      </div>
    </div>
  );
}
