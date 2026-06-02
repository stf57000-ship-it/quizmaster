// api/send-email.js
import { Resend } from "resend";
const resend=new Resend(process.env.RESEND_API_KEY);
const FROM="ConcoursSanté <noreply@concourssante.fr>";

const templates={
  welcome:({name})=>({subject:"Bienvenue sur ConcoursSanté 🎉",html:`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px">🩺</div><h1 style="font-size:24px;font-weight:900;color:#0A2342">Bienvenue sur ConcoursSanté !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6">Bonjour <strong>${name}</strong>, ton compte est créé. Commence dès maintenant !</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#1DB8A4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Commencer à réviser →</a></div></div>`}),
  inactivity:({name,daysSince})=>({subject:`${name}, tu n'as pas révisé depuis ${daysSince} jours 👀`,html:`<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px"><div style="text-align:center"><div style="font-size:48px">🔥</div><h1 style="font-size:22px;font-weight:900;color:#0A2342">Ton streak est en danger !</h1></div><p style="color:#445566;font-size:16px;line-height:1.6;margin-top:20px">Bonjour <strong>${name}</strong>, ${daysSince} jours sans réviser... Reprends dès maintenant !</p><div style="text-align:center;margin:32px 0"><a href="https://concourssante.fr" style="background:#FF6B35;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800">Reprendre la révision →</a></div></div>`}),
};

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin",process.env.VITE_APP_URL||"https://concourssante.fr");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).end();
  const{type,to,data}=req.body;
  if(!type||!to||!templates[type])return res.status(400).json({error:"type ou destinataire manquant"});
  try{
    const{subject,html}=templates[type](data||{});
    const result=await resend.emails.send({from:FROM,to,subject,html});
    return res.status(200).json({success:true,id:result.id});
  }catch(error){return res.status(500).json({error:"Échec envoi email"});}
}
