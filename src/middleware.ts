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
const ADMIN_ONLY_ROUTES = ["/staff", "/audit-logs", "/settings"];

// Routes restricted to specific roles
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/pharmacy": [Role.ADMIN, Role.PHARMACIST],
  "/billing": [Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT],
  "/reports": [Role.ADMIN, Role.DOCTOR],
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

  // Allow public routes without authentication
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublicRoute) {
    // If already logged in, redirect to dashboard
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Allow API routes for auth (NextAuth internals)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user;
  const role = user.role as Role;

  // Force password change for staff on first login
  if (
    user.mustChangePassword &&
    pathname !== "/settings" &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  // Force email verification for patients
  if (
    role === Role.PATIENT &&
    !user.isEmailVerified &&
    pathname !== "/verify-email" &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // Check admin-only routes
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isAdminRoute && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check role-specific routes
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|public/).*)"],
};
