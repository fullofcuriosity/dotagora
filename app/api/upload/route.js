import { put } from "@vercel/blob";

export async function POST(req) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file) {
    return Response.json({ ok: false, error: "No file" }, { status: 400 });
  }

  const filename = `${Date.now()}-${file.name}`.replace(/\s+/g, "-");

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type || undefined,
  });

  return Response.json({ ok: true, url: blob.url });
}
