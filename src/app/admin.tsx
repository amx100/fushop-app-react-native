import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProductList } from '../components/admin/ProductList';
import { OrderList } from '../components/admin/OrderList';
import { ProductModal } from '../components/admin/ProductModal';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Product, ProductFormData, Order, OrderStatus } from '../types';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { supabase } from '../lib/supabase';
import { Toast } from 'react-native-toast-notifications';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
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

  const {
    products,
    isLoading: productsLoading,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    pickImage: pickImageBase,
  } = useAdminProducts();
  const {
    orders,
    isLoading: ordersLoading,
    updateOrderStatus,
  } = useAdminOrders();

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

  const pickImage = async () => {
    const imageUrl = await pickImageBase();
    if (imageUrl) {
      setFormData(prev => ({ ...prev, heroImage: imageUrl }));
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      Toast.show('Signed out successfully', { type: 'success' });
      router.replace('/auth');
    } catch (error) {
      Toast.show('Error signing out: ' + (error as Error).message, { 
        type: 'error' 
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.email}</Text>
        </View>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

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
        <ProductList
          products={products || []}
          isLoading={productsLoading}
          onEdit={openEditModal}
          onDelete={handleDeleteProduct}
          onCreateNew={() => {
            resetForm();
            setIsModalVisible(true);
          }}
        />
      ) : (
        <OrderList
          orders={orders || []}
          isLoading={ordersLoading}
          onUpdateStatus={(orderId: number, status: OrderStatus) => updateOrderStatus(orderId, status)}
        />
      )}

      <ProductModal
        visible={isModalVisible}
        formData={formData}
        isEditing={!!selectedProduct}
        onClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
        onSubmit={() => {
          if (selectedProduct) {
            handleUpdateProduct(selectedProduct.id, formData);
          } else {
            handleCreateProduct(formData);
          }
          setIsModalVisible(false);
          resetForm();
        }}
        onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onPickImage={pickImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 0,
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
  signOutButton: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});