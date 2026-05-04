import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-edge";

const COOKIE_NAME = "admin_session";

// Set to true to enable maintenance mode
const MAINTENANCE_MODE = false;

// Routes that bypass maintenance mode
const MAINTENANCE_BYPASS = [
  "/mantenimiento",
  "/admin",
  "/api/admin",
  "/_next",
  "/favicon.ico",
  "/images",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check maintenance mode
  if (MAINTENANCE_MODE) {
    const shouldBypass = MAINTENANCE_BYPASS.some(route => path.startsWith(route));
    
    if (!shouldBypass && path !== "/mantenimiento") {
      return NextResponse.redirect(new URL("/mantenimiento", request.url));
    }
  }

  // Protect admin dashboard routes
  if (path.startsWith("/admin/dashboard")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/admin", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  // Redirect logged in admin from login page to dashboard
  if (path === "/admin") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
