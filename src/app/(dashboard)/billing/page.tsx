//src/app/(dashboard)/billing/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function BillingPage() {
  return (
    <div>
      <PageHeader
        title="Billing"
        description="Billing module — coming in Phase 6"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Billing module will be built in Phase 6
        </p>
      </div>
    </div>
  );
}
