import { useQuery } from '@tanstack/react-query';
import { getFollowUpAlerts, getPatientStats, getRevenueStats, getTopMedicines } from '../lib/services/reports.service';

export function useFollowUpAlerts() {
  return useQuery({
    queryKey: ['reports', 'followups'],
    queryFn: getFollowUpAlerts,
  });
}

export function usePatientStats(period: string) {
  return useQuery({
    queryKey: ['reports', 'patients', period],
    queryFn: () => getPatientStats(period),
  });
}

export function useRevenueStats(period: string) {
  return useQuery({
    queryKey: ['reports', 'revenue', period],
    queryFn: () => getRevenueStats(period),
  });
}

export function useTopMedicines(period: string) {
  return useQuery({
    queryKey: ['reports', 'medicines', period],
    queryFn: () => getTopMedicines(period),
  });
}
