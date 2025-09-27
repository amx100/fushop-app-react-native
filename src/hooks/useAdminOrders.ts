import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types';
import { Toast } from 'react-native-toast-notifications';

type Order = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email?: string;
  users: { 
    email: string;
    name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  items: {
    product: {
      title: string;
      heroImage: string;
    };
    size: string;
    quantity: number;
  }[];
};

export function useAdminOrders() {
  const queryClient = useQueryClient();

  // Function to update product status based on inventory
  const updateProductStatus = async (productId: number) => {
    try {
      // Fetch the current product sizes
      const { data: productSizes, error: sizesError } = await supabase
        .from('product_size')
        .select('quantity')
        .eq('product_id', productId);

      if (sizesError) throw sizesError;

      // Calculate total quantity across all sizes
      const totalQuantity = productSizes.reduce((sum, size) => sum + size.quantity, 0);

      // Update product status
      const { error: updateError } = await supabase
        .from('product')
        .update({ 
          status: totalQuantity > 0 ? 'available' : 'out_of_stock' 
        })
        .eq('id', productId);

      if (updateError) throw updateError;
      
    } catch (error) {
      throw error;
    }
  };

  // Manual inventory restoration function (backup for trigger)
  const restoreInventoryManually = async (orderId: number) => {
    try {
      // Fetch order items with fallback for old data structure
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_item')
        .select('product_id, size_id, quantity, product, size')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new Error('Failed to fetch order items');
      }

      if (!orderItems || orderItems.length === 0) {
        return;
      }


      // For each item, restore inventory
      for (const item of orderItems) {
        // Handle old data structure where product_id might be null
        const productId = item.product_id || item.product;
        const sizeId = item.size_id;
        
        if (!productId || !sizeId) {
          continue;
        }


        try {
          // Get current quantity BEFORE restoration
          const { data: currentData, error: fetchError } = await supabase
            .from('product_size')
            .select('quantity')
            .eq('product_id', productId)
            .eq('size_id', sizeId)
            .single();

          if (fetchError) {
            continue;
          }

          if (!currentData) {
            continue;
          }

         

          // Calculate new quantity - restore to original quantity
          // The original quantity should be current + ordered quantity
          const originalQuantity = (currentData.quantity || 0) + item.quantity;
         

          // Update quantity to original quantity
          const { error: updateError } = await supabase
            .from('product_size')
            .update({ quantity: originalQuantity })
            .eq('product_id', productId)
            .eq('size_id', sizeId);

          if (updateError) {
            continue;
          }

          // Verify the update by fetching the new quantity
          const { data: updatedData, error: verifyError } = await supabase
            .from('product_size')
            .select('quantity')
            .eq('product_id', productId)
            .eq('size_id', sizeId)
            .single();

          if (verifyError) {
            console.error('❌ Error verifying updated quantity:', verifyError);
          } else {
           
          }

         
          
          // Update product status after inventory change
          try {
            await updateProductStatus(productId);
          } catch (statusError) {
            console.error('❌ Error updating product status:', statusError);
          }
        } catch (itemError) {
          console.error('❌ Error processing item:', itemError);
          continue;
        }
      }

  
    } catch (error) {
    
      throw error;
    }
  };


  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
     
      
      // Debug: proverite da li je korisnik autentifikovan
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user) {
      
        throw new Error('User not authenticated');
      }
      
    

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
      
        throw new Error('Error fetching user data');
      }

    

      const isAdmin = userData.type === 'ADMIN' || userData.type === 'admin';
      if (!isAdmin) {
        
        throw new Error('User is not admin');
      }
      
     

      const { data: ordersData, error } = await supabase
        .from('order')
        .select(`
          *,
          users:user_id(email, name, last_name, phone, address, city),
          items:order_item(
            quantity,
            size,
            product:product(
              title,
              heroimage,
              price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ useAdminOrders: Supabase error:', error);
        throw error;
      }

    

      if (ordersData) {
        const formattedOrders: Order[] = ordersData.map((order) => {
          
          return {
            id: order.id,
            slug: order.slug,
            created_at: order.created_at,
            totalPrice: order.totalprice,
            status: order.status as OrderStatus,
            user_email: order.users?.email,
            users: order.users,
            items: order.items?.map((item: any) => ({
              product: {
                title: item.product?.title || 'Unknown Product',
                heroImage: item.product?.heroimage || '',
              },
              size: item.size,
              quantity: item.quantity,
            })) || [],
          };
        });
        
       
        return formattedOrders;
      }
      
     
      return [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: OrderStatus }) => {
    
      
      // Update order status
      const { error } = await supabase
        .from('order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('❌ Error updating order status:', error);
        throw error;
      }

      

      // If status is cancelled, check if trigger already restored inventory
      if (newStatus === 'cancelled') {
        
        
        // Wait a bit for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if trigger already restored inventory
        const checkIfTriggerRestored = async (orderId: number) => {
          try {
            // Get order items
            const { data: orderItems, error: itemsError } = await supabase
              .from('order_item')
              .select('product_id, size_id, quantity, product, size')
              .eq('order_id', orderId);

            if (itemsError || !orderItems || orderItems.length === 0) {
              return false;
            }

            // Check if quantities seem already restored (higher than expected)
            for (const item of orderItems) {
              const productId = item.product_id || item.product;
              const sizeId = item.size_id;
              
              if (!productId || !sizeId) continue;

              const { data: currentData } = await supabase
                .from('product_size')
                .select('quantity')
                .eq('product_id', productId)
                .eq('size_id', sizeId)
                .single();

              // If current quantity is higher than ordered quantity, trigger likely already restored
              if (currentData && currentData.quantity > item.quantity) {
               
                return true;
              }
            }
            return false;
          } catch (error) {
           
            return false;
          }
        };

        // Check if trigger already restored inventory
        const triggerAlreadyRestored = await checkIfTriggerRestored(orderId);
        
        if (triggerAlreadyRestored) {
       
          
          // Still need to update product statuses since trigger only restores inventory
          try {
            // Get order items to update their product statuses
            const { data: orderItems, error: itemsError } = await supabase
              .from('order_item')
              .select('product_id, product')
              .eq('order_id', orderId);

            if (!itemsError && orderItems) {
              // Update status for each product
              for (const item of orderItems) {
                const productId = item.product_id || item.product;
                if (productId) {
                  try {
                    await updateProductStatus(productId);
                  } catch (statusError) {
                    console.error('❌ Error updating product status:', statusError);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Error updating product statuses after trigger:', error);
          }
        } else {
          
          
          try {
            await restoreInventoryManually(orderId);
           
          } catch (restoreError) {
           
          }
        }
        
        // Invalidate and refetch cache to refresh the UI
        await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        await queryClient.invalidateQueries({ queryKey: ['products'] });
        await queryClient.refetchQueries({ queryKey: ['admin-products'] });
        await queryClient.refetchQueries({ queryKey: ['products'] });
 
      }

      return { orderId, newStatus };
    },
    onMutate: async ({ orderId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['admin-orders']);

      // Optimistically update to the new value
      queryClient.setQueryData(['admin-orders'], (old: Order[] | undefined) => {
        if (!old) return [];
        return old.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        );
      });

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['admin-orders'], context?.previousOrders);
      Toast.show('Error updating order status', { type: 'error' });
    },
    onSuccess: (data) => {
      if (data.newStatus === 'cancelled') {
        Toast.show('Status uspešno promenjen na Otkazano. Količina proizvoda je vraćena na stanje.', { 
          type: 'success', 
          duration: 3000 
        });
      } else {
        Toast.show('Status uspešno promenjen!', { type: 'success' });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      // Also refresh dashboard data when order status changes
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
   
      
      // Postojeći kod za ažuriranje...
      const { error } = await supabase
        .from('order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // DODAJ OVO - invalidate queries nakon ažuriranja
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
  

      Toast.show('Status narudžbe je uspešno ažuriran', { type: 'success' });
    } catch (error) {
      console.error('❌ updateOrderStatus: Error updating order status:', error);
      Toast.show('Greška pri ažuriranju statusa', { type: 'error' });
    }
  };

  // Set up real-time subscription
  // useEffect(() => {
  //   const channel = supabase
  //     .channel('orders-changes')
  //     .on('postgres_changes', 
  //       { 
  //         event: '*', 
  //         schema: 'public', 
  //         table: 'order' 
  //       }, 
  //       () => {
  //         queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [queryClient]);

  return { 
    orders, 
    isLoading, 
    updateOrderStatus,
    refreshOrders: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  };
}