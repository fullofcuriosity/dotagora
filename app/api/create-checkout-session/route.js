import Stripe from "stripe";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const STATE_KEY = "glowupmoments:state";

export async function POST(req) {
  try {
    const payload = await req.json();
    const { items, billing, meta } = payload || {};

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ ok: false, error: "Cart empty" }, { status: 400 });
    }

    // 1) Server-State laden (deine Produkte + VAT + Shipping)
    const state = (await kv.get(STATE_KEY)) || {};
    const products = Array.isArray(state.products) ? state.products : [];

    // 2) Items serverseitig validieren (niemals Preise aus dem Frontend vertrauen)
    const line_items = items.map((it) => {
      const p = products.find((x) => x.id === it.id);
      if (!p) throw new Error(`Unknown product: ${it.id}`);

      const unit_amount = parsePriceToCents(p.price);
      const qty = Math.max(1, Number(it.qty || 1));

      return {
        quantity: qty,
        price_data: {
          currency: "eur",
          unit_amount,
          product_data: {
            name: p.name || "Artikel",
            images: Array.isArray(p.images) ? p.images.slice(0, 1) : [],
            metadata: {
              productId: String(p.id),
              vat: String(p.vat ?? 0),
            },
          },
        },
      };
    });

    // 3) Versand als eigene Position (schnell & stabil)
    const shippingCents = Math.max(
      0,
      Math.round(Number(payload?.totals?.shipping || 0) * 100)
    );

    if (shippingCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: shippingCents,
          product_data: { name: `Versand (${meta?.shipMethod || "Standard"})` },
        },
      });
    }

    // 4) Checkout Session erzeugen
    const origin = process.env.PUBLIC_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: billing?.email || undefined,

      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html`,

      metadata: {
        note: meta?.note || "",
        shipEta: meta?.shipEta || "",
        shipMethod: meta?.shipMethod || "",
      },
    });

    return Response.json({ ok: true, sessionId: session.id });
  } catch (err) {
    console.error(err);
    return Response.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

function parsePriceToCents(str) {
  // "19,90 €" -> 1990
  const n = String(str || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const v = Number.parseFloat(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
}
