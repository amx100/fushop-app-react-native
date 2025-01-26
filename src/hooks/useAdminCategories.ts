import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CategoryFormData } from '../types';
import { Toast } from 'react-native-toast-notifications';

export const useAdminCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error: queryError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      return data;
    },
  });



  const handleCreateCategory = async (formData: CategoryFormData) => {
    try {

      const { data, error } = await supabase
        .from('category')
        .insert(formData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating category:', error);
        throw error;
      }
      

      Toast.show('Category created successfully', { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      console.error('Error creating category:', error);
      Toast.show('Error creating category: ' + error.message, { type: 'error' });
    }
  };

  const handleUpdateCategory = async (id: number, formData: CategoryFormData) => {
    try {
      const { error } = await supabase
        .from('category')
        .update(formData)
        .eq('id', id);
      
      if (error) throw error;
      
      Toast.show('Category updated successfully', { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      Toast.show('Error updating category: ' + error.message, { type: 'error' });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const { error } = await supabase.from('category').delete().eq('id', id);
      
      if (error) throw error;
      
      Toast.show('Category deleted successfully', { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error: any) {
      Toast.show('Error deleting category: ' + error.message, { type: 'error' });
    }
  };

  return {
    categories,
    isLoading,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  };
}; 