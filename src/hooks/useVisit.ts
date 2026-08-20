import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVisit, listVisits, createVisit, updateVisit, saveVisit, repeatLastPrescription, saveSignature } from '../lib/services/visits.service';
import { addDiagnosis, updateDiagnosis, deleteDiagnosis, listDiagnoses } from '../lib/services/diagnoses.service';
import { addPrescriptionItem, updatePrescriptionItem, deletePrescriptionItem, listPrescriptionItems } from '../lib/services/prescriptions.service';
import { getVitals, saveVitals, getLastFiveVitals } from '../lib/services/vitals.service';
import { addComplaint, updateComplaint, deleteComplaint, listComplaints } from '../lib/services/complaints.service';
import type { Visit, Diagnosis, PrescriptionItem, Vitals, Complaint } from '../types';

export function useVisits(patientId: string) {
  return useQuery({
    queryKey: ['visits', patientId],
    queryFn: () => listVisits(patientId),
    enabled: !!patientId,
  });
}

export function useVisit(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ['visits', patientId, visitId],
    queryFn: () => getVisit(patientId, visitId),
    enabled: !!patientId && !!visitId,
  });
}

export function useDiagnoses(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ['diagnoses', patientId, visitId],
    queryFn: () => listDiagnoses(patientId, visitId),
    enabled: !!patientId && !!visitId,
  });
}

export function usePrescriptions(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ['prescriptions', patientId, visitId],
    queryFn: () => listPrescriptionItems(patientId, visitId),
    enabled: !!patientId && !!visitId,
  });
}

export function useVitals(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ['vitals', patientId, visitId],
    queryFn: () => getVitals(patientId, visitId),
    enabled: !!patientId && !!visitId,
  });
}

export function useComplaints(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ['complaints', patientId, visitId],
    queryFn: () => listComplaints(patientId, visitId),
    enabled: !!patientId && !!visitId,
  });
}

export function useHistoricalVitals(patientId: string) {
  return useQuery({
    queryKey: ['vitals', 'history', patientId],
    queryFn: () => getLastFiveVitals(patientId),
    enabled: !!patientId,
  });
}

// Write hooks could be added here as needed (e.g. useSaveVisit, useAddDiagnosis)
