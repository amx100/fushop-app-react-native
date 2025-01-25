import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toast } from 'react-native-toast-notifications';
import * as zod from 'zod';
import { authSchema } from '../lib/auth';

type Product = {
  id: number;
  title: string;
  price: number;
  maxQuantity: number;
  heroImage: string;
  category: number;
  slug: string;
};

type ProductFormData = Omit<Product, 'id'>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    price: 0,
    maxQuantity: 0,
    heroImage: '',
    category: 1,
    slug: '',
  });

  // Fetch products
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

  // Verify admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('type')
        .eq('id', user.id)
        .single();

      if (error || data?.type !== 'ADMIN') {
        Toast.show('Unauthorized: Admin access only', {
          type: 'error',
          placement: 'top',
          duration: 1500,
        });
        router.replace('/');
      }
    };

    checkAdminAccess();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      price: 0,
      maxQuantity: 0,
      heroImage: '',
      category: 1,
      slug: '',
    });
    setSelectedProduct(null);
  };

  const handleCreateProduct = async () => {
    try {
      const { error } = await supabase.from('product').insert({
        ...formData,
        imagesUrl: [formData.heroImage], // Adding heroImage as the first image
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      alert('Error creating product: ' + (error as Error).message);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      const { error } = await supabase
        .from('product')
        .update(formData)
        .eq('id', selectedProduct.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      alert('Error updating product: ' + (error as Error).message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('product').delete().eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (error) {
      alert('Error deleting product: ' + (error as Error).message);
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      price: product.price,
      maxQuantity: product.maxQuantity,
      heroImage: product.heroImage,
      category: product.category,
      slug: product.slug,
    });
    setIsModalVisible(true);
  };

  // Regular sign in should redirect to home page
  const signIn = async (data: zod.infer<typeof authSchema>) => {
    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      alert(error.message);
    } else {
      Toast.show('Signed in successfully', {
        type: 'success',
        placement: 'top',
        duration: 1500,
      });
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => {
          resetForm();
          setIsModalVisible(true);
        }}
      >
        <Text style={styles.buttonText}>Create New Product</Text>
      </TouchableOpacity>

      <ScrollView style={styles.productList}>
        {isLoading ? (
          <Text>Loading products...</Text>
        ) : (
          products?.map((product) => (
            <View key={product.id} style={styles.productItem}>
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text>Price: ${product.price}</Text>
              <Text>Quantity: {product.maxQuantity}</Text>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(product)}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteProduct(product.id)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {selectedProduct ? 'Edit Product' : 'Create Product'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Price"
            value={formData.price.toString()}
            onChangeText={(text) => setFormData({ ...formData, price: Number(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Quantity"
            value={formData.maxQuantity.toString()}
            onChangeText={(text) => setFormData({ ...formData, maxQuantity: Number(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Hero Image URL"
            value={formData.heroImage}
            onChangeText={(text) => setFormData({ ...formData, heroImage: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Category ID"
            value={formData.category.toString()}
            onChangeText={(text) => setFormData({ ...formData, category: Number(text) || 1 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Slug"
            value={formData.slug}
            onChangeText={(text) => setFormData({ ...formData, slug: text })}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={selectedProduct ? handleUpdateProduct : handleCreateProduct}
            >
              <Text style={styles.buttonText}>
                {selectedProduct ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  productList: {
    flex: 1,
    marginBottom: 20,
  },
  productItem: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  signOutButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    top: 50,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    top: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    top:50,
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
}); 