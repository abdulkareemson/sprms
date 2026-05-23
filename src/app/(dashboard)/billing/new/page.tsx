// src/app/(dashboard)/billing/new/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/billing/InvoiceForm";

export const metadata = {
  title: "New Invoice | SPRMS",
};

export default async function NewInvoicePage() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;

  if (!hasPermission(role, "generate_invoice")) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 px-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      {/* Page title */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            New Invoice
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a billing invoice for a patient. All amounts are in Nigerian
            Naira (₦).
          </p>
        </div>
      </div>

      {/* Form */}
      <InvoiceForm />
    </div>
  );
}
