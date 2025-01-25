import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image, Alert, Platform } from 'react-native';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toast } from 'react-native-toast-notifications';
import * as zod from 'zod';
import { authSchema } from '../lib/auth';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import RemoteImage from '../components/RemoteImage';
import * as FileSystem from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { decode } from 'base64-arraybuffer';

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

type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit';

type Order = {
  id: number;
  created_at: string;
  status: OrderStatus;
  totalPrice: number;
  user: string;
  description: string | null;
  slug: string;
};

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
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

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

  // Fetch orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
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
        Toast.show('Unauthorized: Admin access only', { type: 'error', placement: 'top', duration: 1500 });
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
    try {
      // First get the product to get the image path
      const { data: product } = await supabase
        .from('product')
        .select('heroImage')
        .eq('id', id)
        .single();

      // Delete the product from the database
      const { error: deleteError } = await supabase
        .from('product')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // If product had an image, delete it from storage
      if (product?.heroImage) {
        try {
          const imagePath = product.heroImage.split('/').pop(); // Get filename from URL
          if (imagePath) {
            await supabase.storage
              .from('app-images')
              .remove([imagePath]);
          }
        } catch (storageError) {
          console.log('Error deleting image:', storageError);
          // Continue even if image deletion fails
        }
      }

      // Refresh the products list
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      Toast.show('Product deleted successfully', { type: 'success' });

    } catch (error) {
      Toast.show('Error deleting product: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  // Update the delete button click handler to show confirmation
  const confirmDelete = (id: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this product?')) {
        handleDeleteProduct(id);
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this product?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => handleDeleteProduct(id)
          }
        ]
      );
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
          setFormData(prev => ({ ...prev, heroImage: uploadedUrl }));
          Toast.show('Image uploaded successfully', { type: 'success' });
        }
      }
    } catch (error: any) {
      alert('Error picking image: ' + error.message);
    }
  };

  // Add function to update order status
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      Toast.show('Order status updated successfully', { type: 'success' });
    } catch (error) {
      Toast.show('Error updating order status: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'products' ? (
        <ScrollView style={styles.productList}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              resetForm();
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Create New Product</Text>
          </TouchableOpacity>

          {isLoading ? (
            <Text>Loading products...</Text>
          ) : (
            products?.map((product) => (
              <View key={product.id} style={styles.productItem}>
                <View style={styles.productHeader}>
                  {product.heroImage ? (
                    <RemoteImage 
                      path={product.heroImage}
                      fallback="https://placehold.co/80x80"
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.noImage}>
                      <Text style={styles.noImageText}>No Image</Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <Text style={styles.productPrice}>Price: ${product.price}</Text>
                    <Text style={styles.productQuantity}>Quantity: {product.maxQuantity}</Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(product)}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => confirmDelete(product.id)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.orderList}>
          {ordersLoading ? (
            <Text>Loading orders...</Text>
          ) : (
            orders?.map((order) => (
              <View key={order.id} style={styles.orderItem}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderTitle}>Order #{order.slug}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.orderPrice}>Total: ${order.totalPrice}</Text>
                <View style={styles.orderStatusContainer}>
                  <Text style={styles.orderStatusLabel}>Status:</Text>
                  <View style={[styles.statusBadge, styles[`statusBadge_${order.status}`]]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
                <View style={styles.statusButtons}>
                  {(['Pending', 'Completed', 'Shipped', 'InTransit'] as OrderStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        styles[`statusButton_${status}`],
                        order.status === status && styles.statusButtonDisabled
                      ]}
                      disabled={order.status === status}
                      onPress={() => updateOrderStatus(order.id, status)}
                    >
                      <Text style={styles.statusButtonText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

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
          
          <View style={styles.imageUploadContainer}>
            {formData.heroImage ? (
              <Image 
                source={{ uri: formData.heroImage }} 
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.imageUploadButton,
                formData.heroImage ? styles.changeImageButton : null
              ]}
              onPress={pickImage}
            >
              <Text style={styles.buttonText}>
                {formData.heroImage ? 'Change Image' : 'Upload Image'}
              </Text>
            </TouchableOpacity>
          </View>
          
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
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  noImageText: {
    color: '#666',
    fontSize: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  productQuantity: {
    fontSize: 16,
    color: '#666',
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
  imageUploadContainer: {
    top: 50,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  imageUploadButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  changeImageButton: {
    backgroundColor: '#1976D2',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  orderList: {
    flex: 1,
    marginBottom: 20,
  },
  orderItem: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderDate: {
    color: '#666',
  },
  orderPrice: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  orderStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderStatusLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  statusBadge: {
    padding: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statusBadge_Pending: {
    backgroundColor: '#ffcc00',
  },
  statusBadge_Completed: {
    backgroundColor: '#4caf50',
  },
  statusBadge_Shipped: {
    backgroundColor: '#2196f3',
  },
  statusBadge_InTransit: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    padding: 8,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButton_Pending: {
    backgroundColor: '#ffcc00',
  },
  statusButton_Completed: {
    backgroundColor: '#4caf50',
  },
  statusButton_Shipped: {
    backgroundColor: '#2196f3',
  },
  statusButton_InTransit: {
    backgroundColor: '#ff9800',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 