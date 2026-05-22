//src/app/(dashboard)/audit-logs/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function AuditLogsPage() {
  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="System activity log — coming in Phase 8"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Audit logs module will be built in Phase 8
        </p>
      </div>
    </div>
  );
}
