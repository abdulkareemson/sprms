export interface VitalSignRecord {
  temperature: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  recordedAt: string;
}

export interface PrescriptionRecord {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string | null;
  dispenseStatus: string;
}

export interface FullMedicalRecord {
  id: string;
  recordNumber: string;
  recordType: string;
  title: string;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  icdCode: string | null;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    staffProfile: { firstName: string; lastName: string } | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    patientNumber: string;
  };
  vitalSigns: VitalSignRecord[];
  prescriptions: PrescriptionRecord[];
}
