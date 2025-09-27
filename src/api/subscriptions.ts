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
      // Failed to set up realtime subscription, but orders will still work
      return () => {}; // Return empty cleanup function
    }

    return () => {
      if (subscriptionResponse && typeof subscriptionResponse.unsubscribe === 'function') {
        try {
          subscriptionResponse.unsubscribe();
        } catch (error) {
        }
      }
    };
  }, [queryClient]);
};
