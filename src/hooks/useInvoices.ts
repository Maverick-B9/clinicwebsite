import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listInvoices, recordPayment, upsertInvoiceForVisit } from '../lib/services/invoices.service';
import type { Invoice, Payment, Visit } from '../types';

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ['invoices', status],
    queryFn: () => listInvoices({ status }),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payment }: { invoiceId: string; payment: Omit<Payment, 'id'> }) => recordPayment(invoiceId, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useUpsertInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, visitId, visitData }: { patientId: string; visitId: string; visitData: Partial<Visit> }) => upsertInvoiceForVisit(patientId, visitId, visitData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}
