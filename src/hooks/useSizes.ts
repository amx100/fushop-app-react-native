import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useSizes() {
  return useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });
}
