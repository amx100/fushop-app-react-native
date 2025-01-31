import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
          *,
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
      console.log('Error uploading image:', error);
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

  const handleCreateProduct = async (formData: ProductFormData) => {
    try {
      const { data: productData, error: productError } = await supabase
        .from('product')
        .insert({
          title: formData.title,
          slug: formData.slug,
          price: formData.price,
          heroImage: formData.heroImage,
          category: formData.category,
          imagesUrl: formData.imagesUrl || []
        })
        .select()
        .single();

      if (productError) throw productError;

      if (formData.sizes && formData.sizes.length > 0) {
        const sizesData = formData.sizes.map(size => ({
          product_id: productData.id,
          size_id: size.size_id,
          quantity: size.quantity
        }));

        const { error: sizesError } = await supabase
          .from('product_size')
          .insert(sizesData);

        if (sizesError) throw sizesError;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product created successfully', { type: 'success' });
    } catch (error) {
      Toast.show('Error creating product: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  const handleUpdateProduct = async (id: number, formData: ProductFormData) => {
    try {
      // First get all available sizes from the database
      const { data: allSizes, error: sizesError } = await supabase
        .from('sizes')
        .select('*');

      if (sizesError) throw sizesError;

      // Create a mapping of size values to their IDs
      const sizeValueToId = Object.fromEntries(
        allSizes?.map(size => [size.value, size.id]) || []
      );

      // Map the form sizes to include correct size_ids
      const mappedSizes = formData.sizes?.map(size => ({
        ...size,
        size_id: sizeValueToId[size.size as keyof typeof sizeValueToId] || 0
      })) || [];

      // Check if any sizes couldn't be mapped
      const invalidSizes = mappedSizes.filter(size => size.size_id === 0);
      if (invalidSizes.length > 0) {
        throw new Error(`Some sizes are not valid: ${invalidSizes.map(s => s.size).join(', ')}`);
      }

      // Update the product details
      const { error: productError } = await supabase
        .from('product')
        .update({
          title: formData.title,
          slug: formData.slug,
          price: formData.price,
          heroImage: formData.heroImage,
          category: formData.category,
          imagesUrl: formData.imagesUrl || []
        })
        .eq('id', id);

      if (productError) throw productError;

      if (mappedSizes.length > 0) {
        // Get existing sizes for this product
        const { data: existingSizes } = await supabase
          .from('product_size')
          .select('size_id')
          .eq('product_id', id);

        // Create a set of size_ids that should be deleted
        const newSizeIds = new Set(mappedSizes.map(size => size.size_id));
        const sizesToDelete = existingSizes?.filter(
          size => !newSizeIds.has(size.size_id)
        ) || [];

        // Delete sizes that are no longer present
        if (sizesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('product_size')
            .delete()
            .eq('product_id', id)
            .in('size_id', sizesToDelete.map(size => size.size_id));

          if (deleteError) throw deleteError;
        }

        // Process each size individually
        for (const size of mappedSizes) {
          const { error: sizeError } = await supabase
            .from('product_size')
            .upsert({
              product_id: id,
              size_id: size.size_id,
              quantity: size.quantity
            }, {
              onConflict: 'product_id,size_id'
            });

          if (sizeError) throw sizeError;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product updated successfully', { type: 'success' });
    } catch (error) {
      Toast.show('Error updating product: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      const { error } = await supabase.from('product').delete().eq('id', id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product deleted successfully', { type: 'success' });
    } catch (error) {
      Toast.show('Error deleting product: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  const decrementSizeQuantity = async (productId: number, size: SizeType, quantity: number) => {
    try {
      const { error } = await supabase.rpc('decrement_size_quantity', {
        p_product_id: productId,
        p_size: size,
        p_quantity: quantity
      });

      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (error) {
      throw new Error('Error updating product quantity: ' + (error as Error).message);
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
  };
} 