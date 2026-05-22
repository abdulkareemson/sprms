//src/app/(dashboard)/staff/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function StaffPage() {
  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Manage system users and staff accounts"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Full staff management UI will be polished in Phase 9
        </p>
      </div>
    </div>
  );
}
