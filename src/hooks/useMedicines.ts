import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMedicines, searchMedicines, createMedicine, updateMedicine } from '../lib/services/medicines.service';
import type { Medicine } from '../types';

export function useMedicines(category?: string, activeOnly?: boolean) {
  return useQuery({
    queryKey: ['medicines', category, activeOnly],
    queryFn: () => listMedicines({ category, activeOnly }),
  });
}

export function useMedicineSearch(q: string) {
  return useQuery({
    queryKey: ['medicines', 'search', q],
    queryFn: () => searchMedicines(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => createMedicine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Medicine> }) => updateMedicine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    }
  });
}
