export async function GET() {
  // liefert JS, damit checkout.html es direkt als <script> laden kann
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const body = `window.OD_STRIPE_PK=${JSON.stringify(pk)};`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
