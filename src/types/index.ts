import { Timestamp } from 'firebase/firestore';

export type Role = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';
export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL' | 'WAIVED';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'INSURANCE' | 'CHEQUE' | 'ONLINE' | 'OTHER';
export type DiagnosisType = 'FINAL' | 'PROVISIONAL' | 'DIFFERENTIAL';
export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AppointmentType = 'NEW_PATIENT' | 'FOLLOW_UP' | 'EMERGENCY' | 'CONSULTATION';
export type MedicineCategory = 'PLANT' | 'MINERAL' | 'ANIMAL' | 'NOSODE' | 'BIOCHEMIC' | 'SARCODES' | 'IMPONDERABILIA' | 'OTHER';
export type DocumentType = 'LAB_REPORT' | 'IMAGING' | 'PRESCRIPTION' | 'REFERRAL' | 'CONSENT' | 'OLD_RECORD' | 'INSURANCE' | 'OTHER';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string;
  signatureUrl?: string;
  qualification?: string;
  regNumber?: string;
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Patient {
  id: string;
  patientRefId: string;
  avatarUrl?: string | null;
  name: string;
  dob?: string;
  ageYears?: number;
  sex: Sex;
  bloodGroup: BloodGroup;
  maritalStatus?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  guardianName?: string;
  guardianRelation?: string;
  idType?: string;
  idNumber?: string;
  occupation?: string;
  referredBy?: string;
  allergies: string[];
  insuranceProvider?: string;
  insurancePolicy?: string;
  notes?: string;
  isActive: boolean;
  visitCount: number;
  lastVisitDate?: string;
  nextFollowUpDate?: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any | null;
  createdBy: string;
}

export interface Visit {
  id: string;
  visitNumber: number;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: any;
  isLocked: boolean;
  isDraft: boolean;
  consultationFee?: number;
  medicineFee?: number;
  discount?: number;
  discountType?: 'flat' | 'percent';
  totalFee?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentNotes?: string;
  paidAmount?: number;
  paidAt?: Timestamp;
  labOrders?: string;
  labNotes?: string;
  followUpDays?: number;
  followUpDate?: string;
  followUpNotes?: string;
  signatureUrl?: string;
  visitNotes?: string;
  clinicalNotes?: string;
  visitDate?: string;
  prescriptionNotes?: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any | null;
}

export interface Diagnosis {
  id: string;
  type: DiagnosisType;
  text: string;
  icdCode?: string;
  notes?: string;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface Vitals {
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bmiCategory?: string;
  pulse?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  temperatureValue?: number;
  temperatureUnit: 'CELSIUS' | 'FAHRENHEIT';
  spo2?: number;
  respirationRate?: number;
  updatedAt: any;
}

export interface Complaint {
  id: string;
  chiefComplaint: string;
  duration?: string;
  onset?: string;
  severity?: number;
  betterBy?: string;
  worseBy?: string;
  notes?: string;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface PrescriptionItem {
  id: string;
  medicineId?: string;
  medicineName: string;
  potency?: string;
  dosage?: string;
  repetition?: string;
  durationDays?: number;
  beforeAfterFood?: string;
  instructions?: string;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface ClinicalHistory {
  notes?: string;
  pastIllnesses: string[];
  surgeries?: string;
  hospitalizations?: string;
  currentMedicines?: string;
  vaccinations?: string;
  smokingStatus?: string;
  alcoholStatus?: string;
  sleepPattern?: string;
  dietType?: string;
  exerciseHabits?: string;
  updatedAt: any;
  updatedBy: string;
}

export interface FamilyHistoryRow {
  id: string;
  relation: string;
  condition: string;
  status?: string;
  ageAtOnset?: number;
  isDeceased: boolean;
  remarks?: string;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any | null;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  visitId?: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  thumbnailUrl?: string;
  type: DocumentType;
  tag?: string;
  notes?: string;
  uploadedBy: string;
  createdAt: any;
  deletedAt?: any | null;
}

export interface Medicine {
  id: string;
  name: string;
  manufacturer?: string;
  category: MedicineCategory;
  potencies: string[];
  isActive: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientRefId: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: Timestamp;
  durationMins: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: any | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientRefId: string;
  visitId?: string;
  consultationFee: number;
  medicineFee: number;
  discount: number;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: PaymentStatus;
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: Timestamp;
  recordedBy: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  createdAt: any;
}

export interface SymptomNote {
  id: string;
  symptomNumber: number;
  symptomLabel: string;
  patientId: string;
  visitId: string;
  visitDate: string;
  visitNumber: number;
  notes: string;
  createdAt: any;
  updatedAt: any;
}
