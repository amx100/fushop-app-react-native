import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product, ProductFormData, SizeType } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { Toast } from 'react-native-toast-notifications';

export function useAdminProducts() {
  const queryClient = useQueryClient();
  const [tempImageUrl, setTempImageUrl] = useState<string>('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select(`
          id,
          title,
          slug,
          price,
          heroImage,
          category,
          imagesUrl,
          created_at,
          status,
          product_size:product_size(
            id,
            quantity,
            size_id,
            sizes:sizes(value)
          )
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      return productsData.map(product => ({
        ...product,
        sizes: product.product_size.map((ps: any) => ({
          ...ps,
          size: ps.sizes.value
        }))
      }));
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const uploadImage = async (uri: string) => {
    if (!uri?.startsWith('file://')) {
      return null;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const filePath = `${randomUUID()}.png`;
      const contentType = 'image/png';

      const { data, error } = await supabase.storage
        .from('app-images')
        .upload(filePath, decode(base64), { contentType });

      if (error) throw error;

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('app-images')
          .getPublicUrl(data.path);
        return publicUrl;
      }
    } catch (error) {
   
      return null;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera roll permissions are required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const uploadedUrl = await uploadImage(result.assets[0].uri);
        if (uploadedUrl) {
          setTempImageUrl(uploadedUrl);
          Toast.show('Image uploaded successfully', { type: 'success' });
          return uploadedUrl;
        }
      }
    } catch (error: any) {
      alert('Error picking image: ' + error.message);
    }
    return null;
  };

  const createProductMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      const { data: allSizes, error: sizesError } = await supabase
        .from('sizes')
        .select('*');

      if (sizesError) throw sizesError;



      const sizeValueToId = Object.fromEntries(
        allSizes?.map(size => [
          size.value.toUpperCase().replace(/\s+/g, ''),
          size.id
        ]) || []
      );

      const mappedSizes = formData.sizes?.map(size => {
        if (!size.size) {
          throw new Error('Size is undefined');
        }
        const sizeValue = size.size.toUpperCase().replace(/\s+/g, '');
        const size_id = sizeValueToId[sizeValue];
        
        if (!size_id) {

          throw new Error(`Invalid size: ${size.size}. Available sizes: ${allSizes?.map(s => s.value).join(', ')}`);
        }

        return {
          ...size,
          size_id
        };
      }) || [];

      // Set initial status based on sizes
      const initialStatus = mappedSizes.some(size => size.quantity > 0) 
        ? 'available' 
        : 'out_of_stock';

      const { data: productData, error: productError } = await supabase
        .from('product')
        .insert({
          title: formData.title,
          slug: formData.slug,
          price: formData.price,
          heroImage: formData.heroImage,
          category: formData.category,
          imagesUrl: formData.imagesUrl || [],
          status: initialStatus  // Add status here
        })
        .select()
        .single();

      if (productError) throw productError;

      if (mappedSizes.length > 0) {
        const sizesData = mappedSizes.map(size => ({
          product_id: productData.id,
          size_id: size.size_id,
          quantity: size.quantity
        }));

        const { error: sizesInsertError } = await supabase
          .from('product_size')
          .insert(sizesData);

        if (sizesInsertError) throw sizesInsertError;
      }

      return productData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product created successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error creating product: ' + error.message, { type: 'error' });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: ProductFormData }) => {
      const { data: allSizes, error: sizesError } = await supabase
        .from('sizes')
        .select('*');

      if (sizesError) throw sizesError;

 

      const sizeValueToId = Object.fromEntries(
        allSizes?.map(size => [
          size.value.toUpperCase().replace(/\s+/g, ''),
          size.id
        ]) || []
      );

      const mappedSizes = formData.sizes?.map(size => {
        if (!size.size) {
          throw new Error('Size is undefined');
        }
        const sizeValue = size.size.toUpperCase().replace(/\s+/g, '');
        const size_id = sizeValueToId[sizeValue];
        
        if (!size_id) {
    
          throw new Error(`Invalid size: ${size.size}. Available sizes: ${allSizes?.map(s => s.value).join(', ')}`);
        }

        return {
          ...size,
          size_id
        };
      }) || [];

      // Determine status based on sizes
      const initialStatus = mappedSizes.some(size => size.quantity > 0) 
        ? 'available' 
        : 'out_of_stock';

      const { error: productError } = await supabase
        .from('product')
        .update({
          title: formData.title,
          slug: formData.slug,
          price: formData.price,
          heroImage: formData.heroImage,
          category: formData.category,
          imagesUrl: formData.imagesUrl || [],
          status: initialStatus  // Update status here
        })
        .eq('id', id);

      if (productError) throw productError;

      if (mappedSizes.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_size')
          .delete()
          .eq('product_id', id);

        if (deleteError) throw deleteError;

        const sizesData = mappedSizes.map(size => ({
          product_id: id,
          size_id: size.size_id,
          quantity: size.quantity
        }));

        const { error: sizesInsertError } = await supabase
          .from('product_size')
          .insert(sizesData);

        if (sizesInsertError) throw sizesInsertError;
      }

      return { id, formData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product updated successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error updating product: ' + error.message, { type: 'error' });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('product').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product deleted successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error deleting product: ' + error.message, { type: 'error' });
    }
  });

  const handleCreateProduct = async (formData: ProductFormData) => {
    await createProductMutation.mutateAsync(formData);
  };

  const handleUpdateProduct = async (id: number, formData: ProductFormData) => {
    await updateProductMutation.mutateAsync({ id, formData });
  };

  const handleDeleteProduct = async (id: number) => {
    await deleteProductMutation.mutateAsync(id);
  };

  const decrementSizeQuantity = async (productId: number, size: SizeType, quantity: number) => {
    try {
      // First, decrement the size quantity
      const { error } = await supabase.rpc('decrement_size_quantity', {
        p_product_id: productId,
        p_size: size,
        p_quantity: quantity
      });

      if (error) throw error;

      // Then, check and update product status
      await updateProductStatus(productId);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (error) {
      throw new Error('Error updating product quantity: ' + (error as Error).message);
    }
  };

  // New function to update product status based on size quantities
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
      console.error('Error updating product status:', error);
      throw error;
    }
  };

  return {
    products,
    isLoading,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    pickImage,
    tempImageUrl,
    decrementSizeQuantity,
    updateProductStatus,  // Expose this method if needed
  };
} 