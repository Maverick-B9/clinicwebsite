import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAppointments, createAppointment, updateAppointment } from '../lib/services/appointments.service';
import type { Appointment } from '../types';

export function useAppointments(from: Date, to: Date) {
  return useQuery({
    queryKey: ['appointments', from.toISOString(), to.toISOString()],
    queryFn: () => listAppointments({ from, to }),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) => updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });
}
