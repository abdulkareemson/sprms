// src/middleware.ts

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@prisma/client";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

// Routes restricted to ADMIN only
const ADMIN_ONLY_ROUTES = ["/staff", "/audit-logs"];

// Routes restricted to specific roles
// FIX: Added /patients, /records, /my-records with correct role lists
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/patients": [Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST],
  "/pharmacy": [Role.ADMIN, Role.PHARMACIST],
  "/billing": [Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT],
  "/reports": [Role.ADMIN, Role.DOCTOR],
  "/my-records": [Role.PATIENT],
};

export default auth(function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = (
    request as unknown as {
      auth: {
        user?: {
          role: Role;
          mustChangePassword?: boolean;
          isEmailVerified?: boolean;
        };
      } | null;
    }
  ).auth;

  // ── Allow public routes ───────────────────────────────────────────────────
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublicRoute) {
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ── Allow NextAuth internals ──────────────────────────────────────────────
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ── Require authentication ────────────────────────────────────────────────
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user;
  const role = user.role as Role;

  // ── Force password change ─────────────────────────────────────────────────
  if (
    user.mustChangePassword &&
    pathname !== "/settings" &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  // ── Force email verification for patients ─────────────────────────────────
  if (
    role === Role.PATIENT &&
    !user.isEmailVerified &&
    pathname !== "/verify-email" &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // ── Admin-only routes ─────────────────────────────────────────────────────
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isAdminRoute && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Settings — accessible to all authenticated users ─────────────────────
  // (must come before ROUTE_PERMISSIONS check)
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return NextResponse.next();
  }

  // ── Role-specific route protection ────────────────────────────────────────
  for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * 1. _next/static  — Next.js static assets
     * 2. _next/image   — Next.js image optimization
     * 3. favicon.ico   — Browser favicon
     * 4. public files  — All static files in /public:
     *      *.png, *.jpg, *.jpeg, *.gif, *.webp,
     *      *.svg, *.ico, *.woff, *.woff2
     * 5. /images/*     — Your image folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)).*)",
  ],
};
