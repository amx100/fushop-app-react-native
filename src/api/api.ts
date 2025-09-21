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

export const createOrder = () => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    async mutationFn({ totalPrice, items }: { 
      totalPrice: number, 
      items: Array<{id: number, quantity: number, size: string, size_id: number}> 
    }) {
      if (!auth?.user?.id) {
        throw new Error('Please log in to create an order');
      }

      const slug = generateOrderSlug();
      
      // 1. First create the order
      const { data: orderData, error: orderError } = await supabase
        .from('order')
        .insert({
          totalprice: totalPrice,
          slug,
          user_id: auth.user.id,
          status: 'pending',
        })
        .select('*')
        .single();

      if (orderError || !orderData) {
        console.error('Order creation error:', orderError);
        throw new Error(
          'An error occurred while creating order: ' + orderError?.message
        );
      }

      try {
        // 2. Create order items in a single transaction
        const { error: itemsError } = await supabase
          .from('order_item')
          .insert(
            items.map(item => ({
              order_id: orderData.id,
              product: item.id,
              quantity: item.quantity,
              size: item.size,
              size_id: item.size_id
            }))
          );

        if (itemsError) {
          throw new Error('Error creating order items: ' + itemsError.message);
        }

        // 3. Update product quantities one by one to ensure accuracy
        for (const item of items) {
          // First get the current quantity
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
    },

    onError: (error) => {
      console.error('Mutation error:', error);
      throw error;
    },
  });
};

export const createOrderItem = () => {
  return useMutation({
    async mutationFn(
      insertData: {
        orderId: number;
        productId: number;
        quantity: number;
        size: SizeType;
      }[]
    ) {
      // First, create all order items
      const { data, error } = await supabase
        .from('order_item')
        .insert(
          insertData.map(({ orderId, quantity, productId, size }) => ({
            order_id: orderId,
            product: productId,
            quantity,
            size // Make sure size is included here
          }))
        )
        .select('*');

      if (error) {
        console.error('Error creating order items:', error);
        throw new Error(
          'An error occurred while creating order item: ' + error.message
        );
      }

      // Then update the quantities for each product size
      try {
        for (const { productId, quantity, size } of insertData) {
          // Find the size_id for this size value
          const { data: sizeData, error: sizeError } = await supabase
            .from('sizes')
            .select('id')
            .eq('value', size)
            .single();

          if (sizeError || !sizeData) {
            throw new Error(`Size "${size}" not found`);
          }

          // Get current quantity
          const { data: currentSizeData, error: fetchError } = await supabase
            .from('product_size')
            .select('quantity')
            .eq('product_id', productId)
            .eq('size_id', sizeData.id)
            .single();

          if (fetchError) {
            throw new Error(`Error fetching current quantity for product ${productId}: ${fetchError.message}`);
          }

          // Calculate new quantity (don't go below 0)
          const newQuantity = Math.max(0, (currentSizeData.quantity || 0) - quantity);

          // Update the quantity
          const { error: quantityError } = await supabase
            .from('product_size')
            .update({ quantity: newQuantity })
            .eq('product_id', productId)
            .eq('size_id', sizeData.id);

          if (quantityError) {
            throw new Error(`Error updating quantity for product ${productId}: ${quantityError.message}`);
          }
        }
      } catch (error) {
        console.error('Error updating product quantities:', error);
        throw new Error(
          'An error occurred while updating product quantities: ' + 
          (error as Error).message
        );
      }

      return data;
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
        .select('*, order_items:order_item(*, products:product(*))')
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

