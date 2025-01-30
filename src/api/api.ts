import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { generateOrderSlug } from '../utils/utils';

export const getProductsAndCategories = () => {
  return useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        supabase.from('product').select('*'),
        supabase.from('category').select('*'),
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
          product_size (*)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;
      
      // Transform the data to match our Product type
      return {
        ...data,
        sizes: data.product_size // Map the product_size to sizes
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
        .select('*')
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
        .eq('user', id);

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
    async mutationFn({ totalPrice }: { totalPrice: number }) {
      // Check if auth is initialized and user exists
      if (!auth?.user?.id) {
        throw new Error('Please log in to create an order');
      }

      const slug = generateOrderSlug();
      
      const { data: orderData, error: orderError } = await supabase
        .from('order')
        .insert({
          totalPrice,
          slug,
          user: auth.user.id,
          status: 'Pending',
        })
        .select('*')
        .single();

      if (orderError || !orderData) {
        console.error('Order creation error:', orderError);
        throw new Error(
          'An error occurred while creating order: ' + orderError?.message
        );
      }

      return orderData;
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
      }[]
    ) {
      const { data, error } = await supabase
        .from('order_item')
        .insert(
          insertData.map(({ orderId, quantity, productId }) => ({
            order: orderId,
            product: productId,
            quantity,
          }))
        )
        .select('*');

      const productQuantities = insertData.reduce(
        (acc, { productId, quantity }) => {
          if (!acc[productId]) {
            acc[productId] = 0;
          }
          acc[productId] += quantity;
          return acc;
        },
        {} as Record<number, number>
      );

      await Promise.all(
        Object.entries(productQuantities).map(
          async ([productId, totalQuantity]) =>
            supabase.rpc('decrement_size_quantity', {
              p_product_id: Number(productId),
              p_quantity: totalQuantity,
              p_size: "M" // Note: This is a temporary fix - we need size information passed in
            })
        )
      );

      if (error)
        throw new Error(
          'An error occurred while creating order item: ' + error.message
        );

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
        .eq('user', auth.user.id)
        .single();

      if (error || !data) {
        throw new Error('An error occurred while fetching order data: ' + error?.message);
      }

      return data;
    },
  });
};

