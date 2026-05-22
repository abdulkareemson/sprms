//src/app/(dashboard)/reports/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Reports module — coming in Phase 8"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Reports module will be built in Phase 8
        </p>
      </div>
    </div>
  );
}
