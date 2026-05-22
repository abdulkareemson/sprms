//src/app/(dashboard)/appointments/page.tsx

import { PageHeader } from "@/components/shared/PageHeader";

export default function AppointmentsPage() {
  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Appointment scheduling — coming in Phase 4"
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-700 font-medium">
          Appointment module will be built in Phase 4
        </p>
      </div>
    </div>
  );
}
