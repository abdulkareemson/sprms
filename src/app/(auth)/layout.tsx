//src/app/(auth)/layout.tsx

import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "SPRMS — Secure Patient Record Management System",
  description:
    "A secure web-based platform for efficient storage, retrieval, and management of Electronic Health Records at Ahmadu Bello University, Zaria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
