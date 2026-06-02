// api/create-checkout.js
import Stripe from "stripe";
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin",process.env.VITE_APP_URL||"https://concourssante.fr");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).end();
  try{
    const{userId,userEmail}=req.body;
    if(!userId||!userEmail)return res.status(400).json({error:"userId et userEmail requis"});
    const session=await stripe.checkout.sessions.create({
      mode:"subscription",payment_method_types:["card"],customer_email:userEmail,
      line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],
      metadata:{user_id:userId},subscription_data:{metadata:{user_id:userId}},
      success_url:`${process.env.VITE_APP_URL}?payment=success`,
      cancel_url:`${process.env.VITE_APP_URL}?payment=canceled`,
      locale:"fr",allow_promotion_codes:true,
    });
    return res.status(200).json({url:session.url});
  }catch(error){return res.status(500).json({error:"Impossible de créer la session de paiement"});}
}
