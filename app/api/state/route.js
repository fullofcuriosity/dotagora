import { kv } from "@vercel/kv";

const KEY = "glowupmoments:state";

export async function GET() {
  const data = (await kv.get(KEY)) || null;
  return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const body = await req.json();
  await kv.set(KEY, body);
  return Response.json({ ok: true });
}
