import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product, ProductFormData, SizeType } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
          heroimage,
          category,
          imagesurl,
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

      return productsData?.map((product: any) => ({
        ...product,
        sizes: product.product_size?.map((ps: any) => ({
          ...ps,
          size: ps.sizes?.value || 'Unknown'
        })) || []
      })) || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data is fresh
  });

  const uploadImage = async (uri: string) => {
    if (!uri?.startsWith('file://')) {
 
      return null;
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      // Generate a truly unique file path each time
      const filePath = `product-images/${Date.now()}-${randomUUID()}.png`;
      const contentType = 'image/png';

      const { data, error } = await supabase.storage
        .from('app-images')
        .upload(filePath, decode(base64), { 
          contentType,
          upsert: true  // Allow overwriting existing files
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('app-images')
          .getPublicUrl(data.path);
        
     
        return publicUrl;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Toast.show('Failed to upload image', { type: 'error' });
      return null;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera roll permissions are required!');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

     

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
      

        // Force a new upload each time by generating a unique file path
        const uploadedUrl = await uploadImage(uri);
        if (uploadedUrl) {
          // Clear previous temp URL first
          setTempImageUrl('');
          
          // Short timeout to ensure state update
          setTimeout(() => {
            setTempImageUrl(uploadedUrl);
          }, 50);

          Toast.show('Image uploaded successfully', { type: 'success' });
          return uploadedUrl;
        } else {
          Toast.show('Failed to upload image', { type: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Image picking error:', error);
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

      const insertData = {
        title: formData.title,
        slug: formData.slug,
        price: formData.price,
        heroimage: formData.heroImage,
        category: formData.category || undefined,
        imagesurl: formData.imagesUrl || [],
        status: initialStatus
      };

      const { data: productData, error: productError } = await supabase
        .from('product')
        .insert(insertData as any)
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

      // Update product status based on actual stock after inserting sizes
      await updateProductStatus(productData.id);

      return productData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // Also refresh dashboard data when product is created
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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

      const updateData = {
        title: formData.title,
        slug: formData.slug,
        price: formData.price,
        heroimage: formData.heroImage,
        category: formData.category || undefined,
        imagesurl: formData.imagesUrl || [],
        status: initialStatus
      };

      const { error: productError } = await supabase
        .from('product')
        .update(updateData as any)
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

      // Update product status based on actual stock after updating sizes
      await updateProductStatus(id);

      return { id, formData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // Also refresh dashboard data when product is updated
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
      // Also refresh dashboard data when product is deleted
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
      // First, find the size_id for this size value
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
        throw new Error(`Error fetching current quantity: ${fetchError.message}`);
      }

      // Calculate new quantity (don't go below 0)
      const newQuantity = Math.max(0, (currentSizeData.quantity || 0) - quantity);

      // Update the quantity
      const { error: updateError } = await supabase
        .from('product_size')
        .update({ quantity: newQuantity })
        .eq('product_id', productId)
        .eq('size_id', sizeData.id);

      if (updateError) throw updateError;

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

  // Function to fix status for all products (useful for manually added products)
  const fixAllProductStatuses = async () => {
    try {
      // Get all products
      const { data: allProducts, error: productsError } = await supabase
        .from('product')
        .select('id');

      if (productsError) throw productsError;

      if (allProducts) {
        // Update status for each product
        for (const product of allProducts) {
          await updateProductStatus(product.id);
        }
      }

      // Refresh the products list
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('All product statuses updated', { type: 'success' });
    } catch (error) {
      console.error('Error fixing product statuses:', error);
      Toast.show('Error fixing product statuses', { type: 'error' });
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
    updateProductStatus,
    fixAllProductStatuses,  // New function to fix all statuses
  };
} 