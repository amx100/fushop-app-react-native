import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';

export const useOrderUpdateSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let subscriptionResponse;
    
    try {
      subscriptionResponse = supabase
        .channel('custom-update-channel')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'order' },
          payload => {
          
            queryClient.invalidateQueries({
              queryKey: ['orders'],
            });
          }
        )
        .subscribe();
    } catch (error) {
      console.warn('Failed to set up realtime subscription:', error);
      console.warn('Orders will still work, but real-time updates are disabled');
      return () => {}; // Return empty cleanup function
    }

    return () => {
      if (subscriptionResponse && typeof subscriptionResponse.unsubscribe === 'function') {
        try {
          subscriptionResponse.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from realtime:', error);
        }
      }
    };
  }, [queryClient]);
};
