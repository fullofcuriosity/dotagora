import Stripe from "stripe";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return new Response("Bad signature", { status: 400 });
  }

  // später: Bestellung speichern, Mail senden usw.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderKey = `order:${session.id}`;
    await kv.set(orderKey, session);
  }

  return new Response("ok");
}
