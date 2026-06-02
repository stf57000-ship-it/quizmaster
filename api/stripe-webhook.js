// api/stripe-webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
export const config={api:{bodyParser:false}};

async function getRawBody(req){
  return new Promise((resolve,reject)=>{const chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>resolve(Buffer.concat(chunks)));req.on("error",reject);});
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  const rawBody=await getRawBody(req);
  let event;
  try{event=stripe.webhooks.constructEvent(rawBody,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);}
  catch(err){return res.status(400).json({error:`Webhook Error: ${err.message}`});}

  try{
    if(event.type==="checkout.session.completed"){
      const s=event.data.object;
      if(s.metadata?.user_id)await supabase.from("user_subscriptions").upsert({user_id:s.metadata.user_id,stripe_customer_id:s.customer,stripe_subscription_id:s.subscription,status:"active",plan:"premium",updated_at:new Date().toISOString()},{onConflict:"user_id"});
    }
    if(event.type==="customer.subscription.deleted"){
      const s=event.data.object;
      if(s.metadata?.user_id)await supabase.from("user_subscriptions").update({status:"canceled",updated_at:new Date().toISOString()}).eq("user_id",s.metadata.user_id);
    }
    if(event.type==="invoice.payment_failed"){
      const inv=event.data.object;
      if(inv.subscription){const sub=await stripe.subscriptions.retrieve(inv.subscription);if(sub.metadata?.user_id)await supabase.from("user_subscriptions").update({status:"past_due",updated_at:new Date().toISOString()}).eq("user_id",sub.metadata.user_id);}
    }
    return res.status(200).json({received:true});
  }catch(error){return res.status(500).json({error:"Erreur traitement webhook"});}
}
