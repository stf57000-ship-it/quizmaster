// api/chat.js — Proxy sécurisé — Claude Sonnet 4
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API="https://openrouter.ai/api/v1/chat/completions";
const supabase=createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const rateLimitMap=new Map();
function checkRateLimit(ip,isPremium){
  if(isPremium)return true;
  const today=new Date().toDateString();
  const key=`${ip}:${today}`;
  const count=rateLimitMap.get(key)||0;
  if(count>=3)return false;
  rateLimitMap.set(key,count+1);
  for(const[k]of rateLimitMap)if(!k.endsWith(today))rateLimitMap.delete(k);
  return true;
}

async function checkPremium(authHeader){
  if(!authHeader?.startsWith("Bearer "))return false;
  try{
    const{data:{user},error}=await supabase.auth.getUser(authHeader.replace("Bearer ",""));
    if(error||!user)return false;
    const{data:sub}=await supabase.from("user_subscriptions").select("status,plan,current_period_end").eq("user_id",user.id).maybeSingle();
    if(!sub||sub.status!=="active"||sub.plan!=="premium")return false;
    if(sub.current_period_end&&new Date(sub.current_period_end)<new Date())return false;
    return true;
  }catch{return false;}
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin",process.env.VITE_APP_URL||"https://concourssante.fr");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).json({error:"Méthode non autorisée"});

  try{
    const{prompt}=req.body;
    if(!prompt||typeof prompt!=="string")return res.status(400).json({error:"Prompt invalide"});
    if(prompt.length>3000)return res.status(400).json({error:"Prompt trop long"});

    const isPremium=await checkPremium(req.headers["authorization"]);
    const ip=req.headers["x-forwarded-for"]?.split(",")[0]||req.socket?.remoteAddress||"unknown";
    if(!checkRateLimit(ip,isPremium))return res.status(429).json({error:"Limite quotidienne atteinte",code:"RATE_LIMIT_EXCEEDED",message:"3 quiz/jour en version gratuite. Passez Premium pour un accès illimité !"});

    const response=await fetch(OPENROUTER_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENROUTER_API_KEY}`,"HTTP-Referer":"https://concourssante.fr","X-Title":"ConcoursSanté"},
      body:JSON.stringify({model:"anthropic/claude-sonnet-4-5",messages:[{role:"user",content:prompt}],max_tokens:4000})
    });

    if(!response.ok)return res.status(502).json({error:"Erreur IA. Réessayez."});
    const data=await response.json();
    const text=data.choices?.[0]?.message?.content;
    if(!text)return res.status(502).json({error:"Réponse IA vide."});
    return res.status(200).json({content:text,isPremium});
  }catch(error){
    console.error("Proxy error:",error);
    return res.status(500).json({error:"Erreur serveur."});
  }
}
