// src/screens/QuizScreen.jsx
import { useState, useEffect, useRef } from "react";
import { CONCOURS } from "../lib/constants.js";
import { TimerBar } from "../components/UI.jsx";

const GOOD=["Excellent ! 🎯","Parfait ! ✨","Bravo ! 🌟","Super ! 💪","C'est ça ! 🎉"];
const BAD=["Pas tout à fait... 🤔","Presque ! 💡","On y était presque 😅","À retenir ! 📝"];
const rand=(a)=>a[Math.floor(Math.random()*a.length)];

function playSound(type) {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    if(type==="correct"){osc.frequency.setValueAtTime(523,ctx.currentTime);osc.frequency.setValueAtTime(659,ctx.currentTime+0.1);gain.gain.setValueAtTime(0.15,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);osc.start();osc.stop(ctx.currentTime+0.4);}
    else{osc.frequency.setValueAtTime(300,ctx.currentTime);osc.frequency.setValueAtTime(200,ctx.currentTime+0.15);gain.gain.setValueAtTime(0.1,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);osc.start();osc.stop(ctx.currentTime+0.3);}
  }catch{}
}

export function QuizScreen({ questions, concours:concoursKey, isExam, isExpress, examTimeLeft:initialExamTime, onAnswer, onFinish, onBack }) {
  const [current,setCurrent]=useState(0);
  const [selected,setSelected]=useState(null);
  const [revealed,setRevealed]=useState(false);
  const [score,setScore]=useState(0);
  const [answers,setAnswers]=useState([]);
  const [timeLeft,setTimeLeft]=useState(isExpress?15:25);
  const [examTimeLeft,setExamTimeLeft]=useState(initialExamTime||0);
  const [feedback,setFeedback]=useState(null);
  const timerRef=useRef(null);
  const examTimerRef=useRef(null);

  const concours=CONCOURS[concoursKey];
  const q=questions[current];
  const progress=Math.round(((current+(revealed?1:0))/questions.length)*100);

  useEffect(()=>{
    if(isExam||revealed)return;
    setTimeLeft(isExpress?15:25);
    timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);handleSelect(-1);return 0;}return t-1;}),1000);
    return()=>clearInterval(timerRef.current);
  },[current,isExam,isExpress]);

  useEffect(()=>{
    if(!isExam||examTimeLeft<=0)return;
    examTimerRef.current=setInterval(()=>setExamTimeLeft(t=>{if(t<=1){clearInterval(examTimerRef.current);finish();return 0;}return t-1;}),1000);
    return()=>clearInterval(examTimerRef.current);
  },[isExam]);

  const handleSelect=(idx)=>{
    if(revealed)return;
    clearInterval(timerRef.current);
    setSelected(idx);setRevealed(true);
    const isCorrect=idx===q.answer;
    if(isCorrect)setScore(s=>s+1);
    setFeedback({text:isCorrect?rand(GOOD):rand(BAD),isCorrect});
    playSound(isCorrect?"correct":"wrong");
    const newAnswers=[...answers,{selected:idx,correct:q.answer,isCorrect,question:q}];
    setAnswers(newAnswers);
    onAnswer?.({question:q,selectedIdx:idx,isCorrect,concours:concoursKey});
    if(isExpress)setTimeout(()=>handleNext(newAnswers),1500);
  };

  const handleNext=(currentAnswers=answers)=>{
    setFeedback(null);
    if(current+1>=questions.length)finish(currentAnswers);
    else{setCurrent(c=>c+1);setSelected(null);setRevealed(false);}
  };

  const finish=(currentAnswers=answers)=>{clearInterval(examTimerRef.current);onFinish({score,total:questions.length,answers:currentAnswers,isExam,isExpress});};
  const fmt=(s)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"14px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button className="btn btn-ghost" onClick={onBack} style={{padding:"7px 14px"}}>← Quitter</button>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isExpress&&<span style={{fontSize:"0.72rem",background:"rgba(255,152,0,0.1)",color:"#E65100",padding:"3px 8px",borderRadius:20,fontWeight:700,fontFamily:"var(--font-display)"}}>⚡ Express</span>}
            {isExam&&<div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:examTimeLeft<120?"var(--orange)":"var(--text)"}}>⏱ {fmt(examTimeLeft)}</div>}
            <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:"var(--text)"}}>{current+1}/{questions.length}</div>
          </div>
        </div>
        <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:concours?.color||"var(--teal)",borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
        {!isExam&&!revealed&&<div style={{marginTop:6}}><TimerBar value={timeLeft} max={isExpress?15:25} color={timeLeft<=5?"var(--orange)":concours?.color||"var(--teal)"}/></div>}
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"24px 20px 120px"}}>
        {feedback&&<div className="fade-in" style={{textAlign:"center",marginBottom:16,padding:"10px",borderRadius:12,background:feedback.isCorrect?"rgba(29,184,164,0.1)":"rgba(255,107,53,0.1)",border:`1px solid ${feedback.isCorrect?"rgba(29,184,164,0.3)":"rgba(255,107,53,0.3)"}`}}>
          <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1rem",color:feedback.isCorrect?"var(--teal)":"var(--orange)"}}>{feedback.text}</span>
        </div>}

        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontSize:18}}>{concours?.icon}</span>
          <span style={{fontSize:"0.78rem",color:concours?.color||"var(--teal)",fontWeight:700,fontFamily:"var(--font-display)",textTransform:"uppercase",letterSpacing:1}}>{q?.theme||concours?.label}</span>
        </div>

        <div className="card slide-in" style={{marginBottom:20,padding:24}}>
          <p style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.05rem",color:"var(--text)",lineHeight:1.5}}>{q?.q}</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {q?.options?.map((opt,idx)=>{
            let bg="var(--surface)",border="var(--border)",color="var(--text)",transform="none";
            if(revealed){
              if(idx===q.answer){bg="rgba(29,184,164,0.1)";border="var(--teal)";color="var(--teal)";transform="scale(1.01)";}
              else if(idx===selected){bg="rgba(255,107,53,0.1)";border="var(--orange)";color="var(--orange)";}
              else{color="var(--muted)";}
            }
            return (
              <button key={idx} onClick={()=>handleSelect(idx)} disabled={revealed} style={{background:bg,border:`2px solid ${border}`,borderRadius:14,padding:"14px 18px",cursor:revealed?"default":"pointer",textAlign:"left",transition:"all 0.25s",display:"flex",alignItems:"center",gap:12,fontFamily:"var(--font-body)",fontSize:"0.9rem",color,transform}}>
                <span style={{minWidth:24,height:24,borderRadius:6,background:revealed&&idx===q.answer?"var(--teal)":"rgba(10,35,66,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.8rem",color:revealed&&idx===q.answer?"#fff":"var(--muted)",flexShrink:0}}>{["A","B","C","D"][idx]}</span>
                {opt}
                {revealed&&idx===q.answer&&<span style={{marginLeft:"auto"}}>✓</span>}
                {revealed&&idx===selected&&idx!==q.answer&&<span style={{marginLeft:"auto"}}>✗</span>}
              </button>
            );
          })}
        </div>

        {revealed&&q?.explanation&&!isExpress&&<div className="fade-in card" style={{marginTop:16,background:"rgba(29,184,164,0.06)",border:"1px solid rgba(29,184,164,0.2)",padding:18}}>
          <div style={{fontSize:"0.72rem",color:"var(--teal)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontFamily:"var(--font-display)"}}>Explication</div>
          <p style={{fontSize:"0.88rem",color:"var(--text)",lineHeight:1.6}}>{q.explanation}</p>
        </div>}

        {revealed&&!isExpress&&<button className="btn btn-teal fade-in" onClick={()=>handleNext()} style={{width:"100%",justifyContent:"center",marginTop:20,padding:"14px",fontSize:"0.95rem"}}>
          {current+1>=questions.length?"🏁 Voir les résultats":"Question suivante →"}
        </button>}
      </div>
    </div>
  );
}
