// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  async headers() {
    // Content Security Policy
    // Tailwind + shadcn/ui require 'unsafe-inline' for styles in dev.
    // Recharts uses inline SVG styles. Adjust as needed.
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts (needed for hydration)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles: self + inline (Tailwind/shadcn requirement)
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs + Supabase
      "img-src 'self' data: blob: https://*.supabase.co",
      // Fonts: self
      "font-src 'self' data:",
      // API connections: self + Supabase + Gmail SMTP (server-side only)
      "connect-src 'self' https://*.supabase.co https://supabase.co",
      // Frames: deny all
      "frame-src 'none'",
      // Object embeds: none
      "object-src 'none'",
      // Base URI: restrict to self
      "base-uri 'self'",
      // Form submissions: self only
      "form-action 'self'",
      // Upgrade insecure requests in production
      ...(process.env.NODE_ENV === "production"
        ? ["upgrade-insecure-requests"]
        : []),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // ── Clickjacking protection ─────────────────────────────────────
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // ── MIME sniffing protection ────────────────────────────────────
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // ── Referrer policy ─────────────────────────────────────────────
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // ── XSS protection (legacy browsers) ────────────────────────────
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // ── Permissions policy ───────────────────────────────────────────
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // ── Content Security Policy ──────────────────────────────────────
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          // ── HSTS (HTTPS only) ────────────────────────────────────────────
          // Only set in production — Vercel enforces HTTPS automatically
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          // ── DNS prefetch control ─────────────────────────────────────────
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
