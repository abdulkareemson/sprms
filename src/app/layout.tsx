// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SPRMS — Secure Patient Record Management",
    template: "%s | SPRMS",
  },
  description:
    "Secure Patient Record Management System (SPRMS) — A case study of Muslim Specialist Hospital, Zaria. Final Year Project, Ahmadu Bello University, Zaria.",
  keywords: [
    "EHR",
    "electronic health records",
    "patient records",
    "healthcare",
    "ABU Zaria",
    "SPRMS",
    "Muslim Specialist Hospital",
    "Zaria",
    "Kaduna",
    "Nigeria",
  ],
  authors: [{ name: "Ahmadu Bello University, Zaria — Computer Science" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            {/*
              Use your existing sonner.tsx Toaster — it already
              wires useTheme internally. Do NOT pass toastOptions
              here since sonner.tsx already sets them.
            */}
            <Toaster
              position="top-right"
              richColors
              expand={false}
              duration={4000}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
