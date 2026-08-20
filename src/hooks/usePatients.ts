import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPatient, listPatients, searchPatients, createPatient, 
  updatePatient, softDeletePatient, uploadPatientPhoto 
} from '../lib/services/patients.service';
import type { Patient } from '../types';
import type { DocumentSnapshot } from 'firebase/firestore';

export function usePatients(search?: string, status?: string, lastDoc?: DocumentSnapshot) {
  return useQuery({
    queryKey: ['patients', search, status], // Omitted lastDoc to keep same key
    queryFn: () => listPatients({ search, status, lastDoc }),
  });
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });
}

export function usePatientSearch(q: string) {
  return useQuery({
    queryKey: ['patients', 'search', q],
    queryFn: () => searchPatients(q),
    enabled: q.length >= 2,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, createdBy }: { data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'patientRefId' | 'visitCount'>; createdBy: string }) => createPatient(data, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: Partial<Patient> }) => updatePatient(patientId, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
    }
  });
}
