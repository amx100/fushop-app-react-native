import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { generateOrderSlug } from '../utils/utils';
import { SizeType } from '../types';

export const getProductsAndCategories = () => {
  return useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        supabase.from('product').select('*'),
        supabase.from('category').select('id, name, slug, imageurl, products, created_at'),
      ]);

      if (products.error || categories.error) {
        throw new Error('An error occurred while fetching data');
      }

      return { products: products.data, categories: categories.data };
    },
  });
};

export const getProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product')
        .select(`
          *,
          product_size:product_size(
            id,
            quantity,
            size_id,
            sizes:sizes(
              id,
              value
            )
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      // Transform the data to include size value from the joined sizes table
      return {
        ...data,
        sizes: data.product_size.map((ps: any) => ({
          ...ps,
          size: ps.sizes.value, // Add the size value from the joined sizes table
          size_id: ps.size_id
        }))
      };
    },
  });
};

export const getCategoryAndProducts = (categorySlug: string) => {
  return useQuery({
    queryKey: ['categoryAndProducts', categorySlug],
    queryFn: async () => {
      const { data: category, error: categoryError } = await supabase
        .from('category')
        .select('id, name, slug, imageurl, products, created_at')
        .eq('slug', categorySlug)
        .single();

      if (categoryError || !category) {
        throw new Error('An error occurred while fetching category data');
      }

      const { data: products, error: productsError } = await supabase
        .from('product')
        .select('*')
        .eq('category', category.id);

      if (productsError) {
        throw new Error('An error occurred while fetching products data');
      }

      return { category, products };
    },
  });
};

export const getMyOrders = () => {
  const {
    user: { id },
  } = useAuth();

  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', id);

      if (error)
        throw new Error(
          'An error occurred while fetching orders: ' + error.message
        );

      return data;
    },
  });
};

// Helper function to validate user profile completeness
const validateUserProfile = async (userId: string) => {
  const { data: userData, error } = await supabase
    .from('users')
    .select('name, last_name, phone, address, city, postal_code')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error('Failed to fetch user profile');
  }

  const missingFields = [];
  
  if (!userData?.name || userData.name.trim() === '') {
    missingFields.push('Ime');
  }
  if (!userData?.last_name || userData.last_name.trim() === '') {
    missingFields.push('Prezime');
  }
  if (!userData?.phone || userData.phone.trim() === '') {
    missingFields.push('Broj telefona');
  }
  if (!userData?.address || userData.address.trim() === '') {
    missingFields.push('Adresa');
  }
  if (!userData?.city || userData.city.trim() === '') {
    missingFields.push('Grad');
  }
  if (!userData?.postal_code || userData.postal_code.trim() === '') {
    missingFields.push('Poštanski broj');
  }

  if (missingFields.length > 0) {
    throw new Error(`Molimo popunite sledeće podatke pre porudžbine: ${missingFields.join(', ')}`);
  }

  return userData;
};

export const createOrder = () => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    async mutationFn({ totalPrice, items, paymentMethod }: { 
      totalPrice: number, 
      items: Array<{id: number, quantity: number, size: string, size_id: number}>,
      paymentMethod?: string
    }) {
      if (!auth?.user?.id) {
        throw new Error('Please log in to create an order');
      }

      // Validate user profile before creating order
      await validateUserProfile(auth.user.id);

      const slug = generateOrderSlug();
      
      // 1. First create the order
      const { data: orderData, error: orderError } = await supabase
        .from('order')
        .insert({
          totalprice: totalPrice,
          slug,
          user_id: auth.user.id,
          status: 'čekanje',
          payment_method: paymentMethod || 'cash_on_delivery',
        })
        .select('*')
        .single();

      if (orderError || !orderData) {
        throw new Error(
          'An error occurred while creating order: ' + orderError?.message
        );
      }

      try {
        // 2. First, check if all items have sufficient quantity BEFORE creating order items
        for (const item of items) {
          const { data: currentSizeData, error: fetchError } = await supabase
            .from('product_size')
            .select('quantity')
            .eq('product_id', item.id)
            .eq('size_id', item.size_id)
            .single();

          if (fetchError) {
            throw new Error(`Error fetching current quantity for product ${item.id}: ${fetchError.message}`);
          }

          if (!currentSizeData || currentSizeData.quantity < item.quantity) {
            throw new Error(`Insufficient quantity for product ${item.id}. Available: ${currentSizeData?.quantity || 0}, Requested: ${item.quantity}`);
          }
        }

        // 3. Create order items
        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_item')
          .insert(
            items.map(item => ({
              order_id: orderData.id,
              product: item.id,  // Keep product field for compatibility
              product_id: item.id,  // Also set product_id
              quantity: item.quantity,
              size: item.size,
              size_id: item.size_id
            }))
          )
          .select('*');

        if (itemsError) {
          throw new Error('Error creating order items: ' + itemsError.message);
        }

        // 4. Update quantities manually since trigger might not be working
        for (const item of items) {
          // Get current quantity
          const { data: currentSizeData, error: fetchError } = await supabase
            .from('product_size')
            .select('quantity')
            .eq('product_id', item.id)
            .eq('size_id', item.size_id)
            .single();

          if (fetchError) {
            throw new Error(`Error fetching current quantity for product ${item.id}: ${fetchError.message}`);
          }

          // Calculate new quantity (don't go below 0)
          const newQuantity = Math.max(0, (currentSizeData.quantity || 0) - item.quantity);

          // Update the quantity
          const { error: quantityError } = await supabase
            .from('product_size')
            .update({ quantity: newQuantity })
            .eq('product_id', item.id)
            .eq('size_id', item.size_id);

          if (quantityError) {
            throw new Error(`Error updating quantity for product ${item.id}: ${quantityError.message}`);
          }

          // Update product status after quantity change
          try {
            // Fetch the current product sizes
            const { data: productSizes, error: sizesError } = await supabase
              .from('product_size')
              .select('quantity')
              .eq('product_id', item.id);

            if (!sizesError && productSizes) {
              // Calculate total quantity across all sizes
              const totalQuantity = productSizes.reduce((sum, size) => sum + size.quantity, 0);

              // Update product status
              const { error: updateError } = await supabase
                .from('product')
                .update({ 
                  status: totalQuantity > 0 ? 'available' : 'out_of_stock' 
                })
                .eq('id', item.id);

            
            }
          } catch (statusError) {
            
          }
        }

        return orderData;
      } catch (error) {
        // If anything fails after order creation, we should delete the order
        await supabase
          .from('order')
          .delete()
          .eq('id', orderData.id);
        
        throw error;
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // Force refresh of product data to show updated quantities
      await queryClient.refetchQueries({ queryKey: ['products'] });
      await queryClient.refetchQueries({ queryKey: ['admin-products'] });
    },

    onError: (error) => {
      throw error;
    },
  });
};


export const getMyOrder = (slug: string) => {
  const auth = useAuth();

  if (!auth?.user?.id) {
    throw new Error('User is not authenticated');
  }

  return useQuery({
    queryKey: ['orders', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order')
        .select(`
          *,
          user:users(email, name, last_name, phone, address, city),
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
        .eq('slug', slug)
        .eq('user_id', auth.user.id)
        .single();

      if (error || !data) {
        throw new Error('An error occurred while fetching order data: ' + error?.message);
      }

      return data;
    },
  });
};

