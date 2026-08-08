// src/lib/auth.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";
import { AuditAction, Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── FIX 1: Explicit secret prevents NextAuth from
  //           using fallback behavior that leaks credentials ──────────────
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" }, // FIX 2: type:"email" not "text"
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const ipAddress = request?.headers?.get("x-forwarded-for") ?? "unknown";

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { staffProfile: true },
          });

          if (!user) {
            return null;
          }

          if (!user.isActive) {
            throw new Error("ACCOUNT_DISABLED");
          }

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("ACCOUNT_LOCKED");
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? "5");
            const newFailedAttempts = user.failedLoginAttempts + 1;

            if (newFailedAttempts >= maxAttempts) {
              const lockDuration = parseInt(
                process.env.LOCKOUT_DURATION_MINUTES ?? "30",
              );
              const lockedUntil = new Date(
                Date.now() + lockDuration * 60 * 1000,
              );

              await prisma.user.update({
                where: { id: user.id },
                data: {
                  failedLoginAttempts: newFailedAttempts,
                  lockedUntil,
                },
              });

              await createAuditLog({
                userId: user.id,
                action: AuditAction.ACCOUNT_LOCKED,
                resource: "User",
                resourceId: user.id,
                description: `Account locked after ${maxAttempts} failed login attempts`,
                ipAddress,
              });

              throw new Error("ACCOUNT_LOCKED");
            } else {
              await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: newFailedAttempts },
              });

              await createAuditLog({
                userId: user.id,
                action: AuditAction.LOGIN_FAILED,
                resource: "User",
                resourceId: user.id,
                description: `Failed login attempt ${newFailedAttempts}/${maxAttempts}`,
                ipAddress,
              });

              throw new Error("INVALID_CREDENTIALS");
            }
          }

          // ── Password correct ──────────────────────────────────────────
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            },
          });

          await createAuditLog({
            userId: user.id,
            action: AuditAction.LOGIN,
            resource: "User",
            resourceId: user.id,
            description: "User logged in successfully",
            ipAddress,
          });

          const name = user.staffProfile
            ? `${user.staffProfile.firstName} ${user.staffProfile.lastName}`
            : email.split("@")[0];

          return {
            id: user.id,
            email: user.email,
            name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            isEmailVerified: user.isEmailVerified,
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // When update({ mustChangePassword: false }) is called,
      if (trigger === "update" && session) {
        if (session.mustChangePassword !== undefined) {
          token.mustChangePassword = session.mustChangePassword;
        }
        if (session.isEmailVerified !== undefined) {
          token.isEmailVerified = session.isEmailVerified;
        }
        return token;
      }

      // Normal login — populate token from user object
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.mustChangePassword = user.mustChangePassword;
        token.isEmailVerified = user.isEmailVerified;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.isEmailVerified = token.isEmailVerified as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // FIX 3: Error goes to /login, NOT back with params
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },

  // ── FIX 4: Prevent credentials from being passed
  //           via URL in any redirect ────────────────────────────────────
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true, // ← JS cannot read this cookie
        sameSite: "lax", // ← CSRF protection
        path: "/",
        secure: process.env.NODE_ENV === "production", // ← HTTPS only in prod
      },
    },
  },

  // ── FIX 5: Disable debug mode — it logs sensitive data ───────────────
  debug: false,

  trustHost: true,
});
