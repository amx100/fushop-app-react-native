import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product, ProductFormData } from '../types';
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
      const { data, error } = await supabase
        .from('product')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
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
      const productData = {
        ...formData,
        imagesUrl: [] // Add required imagesUrl field
      };
      const { error } = await supabase.from('product').insert(productData);
      if (error) throw error;

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
      const { error } = await supabase
        .from('product')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

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

  return {
    products,
    isLoading,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    pickImage,
    tempImageUrl,
  };
} 