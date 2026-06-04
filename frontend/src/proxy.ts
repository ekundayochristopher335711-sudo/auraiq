import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // This middleware only protects page routes and redirects unauthenticated
  // users. It is not an API reverse proxy for the backend.
  //
  // API requests are handled by the client-side API wrapper in src/lib/api.ts
  // and require NEXT_PUBLIC_API_URL to point to the backend when deployed.
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  // Token lives in localStorage (client-only), so we use a cookie set by the
  // client as the server-readable signal. If missing, redirect to login.
  const token = req.cookies.get("auraiq_token")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
