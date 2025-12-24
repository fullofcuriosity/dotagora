import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/builder") || pathname.startsWith("/api/admin");

  if (!isProtected) return NextResponse.next();

  const user = process.env.BUILDER_USER || "admin";
  const pass = process.env.BUILDER_PASS || "test1234";

  const auth = req.headers.get("authorization");
  if (auth) {
    const [type, encoded] = auth.split(" ");
    if (type === "Basic") {
      const decoded = Buffer.from(encoded, "base64").toString();
      const [u, p] = decoded.split(":");
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Builder"' },
  });
}

export const config = {
  matcher: ["/builder/:path*", "/api/admin/:path*"],
};
