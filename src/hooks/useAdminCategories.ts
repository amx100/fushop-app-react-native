import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CategoryFormData } from '../types';
import { Toast } from 'react-native-toast-notifications';
import { useEffect } from 'react';

export const useAdminCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category')
        .select('id, name, slug, imageurl, products, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data is fresh
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (formData: CategoryFormData) => {
      const { data, error } = await supabase
        .from('category')
        .insert(formData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Toast.show('Category created successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error creating category: ' + error.message, { type: 'error' });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: CategoryFormData }) => {
      const { error } = await supabase
        .from('category')
        .update(formData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Toast.show('Category updated successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error updating category: ' + error.message, { type: 'error' });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('category')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Toast.show('Category deleted successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error deleting category: ' + error.message, { type: 'error' });
    }
  });

  const handleCreateCategory = async (formData: CategoryFormData) => {
    await createCategoryMutation.mutateAsync(formData);
  };

  const handleUpdateCategory = async (id: number, formData: CategoryFormData) => {
    await updateCategoryMutation.mutateAsync({ id, formData });
  };

  const handleDeleteCategory = async (id: number) => {
    await deleteCategoryMutation.mutateAsync(id);
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'category' 
        }, 
        () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    categories,
    isLoading,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  };
}; 