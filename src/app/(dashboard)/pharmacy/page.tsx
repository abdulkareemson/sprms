//src/app/(dashboard)/pharmacy/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function PharmacyPage() {
  return (
    <div>
      <PageHeader
        title="Pharmacy"
        description="Pharmacy module — coming in Phase 5"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Pharmacy module will be built in Phase 5
        </p>
      </div>
    </div>
  );
}
