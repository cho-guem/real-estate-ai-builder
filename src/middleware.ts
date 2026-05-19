import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // API routes handle their own auth and return JSON — don't redirect them
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
