import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { ProductList } from '../components/admin/ProductList';
import { OrderList } from '../components/admin/OrderList';
import { ModernProductModal } from '../components/admin/ProductModal';
import { CategoryModal } from '../components/admin/CategoryModal';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Product, ProductFormData, Order, OrderStatus, Category, CategoryFormData, ProductSize, SizeType } from '../types/index';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { supabase } from '../lib/supabase';
import { Toast } from 'react-native-toast-notifications';
import { CategoryList } from '../components/admin/CategoryList';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import SizeManagement from '../components/admin/SizeModal';


const initialFormData: ProductFormData = {
  title: '',
  price: 0,
  heroImage: '',
  category: 0,
  slug: '',
  imagesUrl: [],
  sizes: [],
};

const initialCategoryFormData: CategoryFormData = {
  name: '',
  slug: '',
  imageUrl: '',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'categories' | 'sizes'>('products');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormData);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    products,
    isLoading: productsLoading,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    pickImage,
    tempImageUrl,
  } = useAdminProducts();

  const {
    orders,
    isLoading: ordersLoading,
    updateOrderStatus,
  } = useAdminOrders();

  const {
    categories,
    isLoading: categoriesLoading,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  } = useAdminCategories();

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedProduct(null);
    setPreviewImage(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData(initialCategoryFormData);
    setSelectedCategory(null);
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

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setIsModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      slug: product.slug,
      price: product.price,
      heroImage: product.heroImage,
      category: product.category,
      imagesUrl: product.imagesUrl || [],
      sizes: product.sizes || []
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      if (selectedProduct) {
        await handleUpdateProduct(selectedProduct.id, data);
      } else {
        await handleCreateProduct(data);
      }
      setIsModalVisible(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error submitting product:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setFormData(initialFormData);
  };

  const handleFormChange = (changes: Partial<ProductFormData>) => {
    setFormData(prev => ({ ...prev, ...changes }));
  };

  const filteredProducts = products?.filter(product => 
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    
    // Search by order slug/ID
    const slugMatch = order.slug.toLowerCase().includes(searchLower);
    // Pretraga po e-pošti kupca
    const emailMatch = typeof order.user_email === 'object' && order.user_email.email.toLowerCase().includes(searchLower) || false;
    
    return slugMatch || emailMatch;
  });

  const filteredCategories = categories?.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sizes' && styles.activeTab]}
          onPress={() => setActiveTab('sizes')}
        >
          <Text style={[styles.tabText, activeTab === 'sizes' && styles.activeTabText]}>
            Sizes
          </Text>
        </TouchableOpacity>
      </View>

      {(activeTab === 'products' || activeTab === 'orders') && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'orders' 
                ? "Search orders by email or order ID..." 
                : "Search products..."
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'products' && (
        <ProductList
          products={filteredProducts || []}
          isLoading={productsLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteProduct}
          onCreateNew={handleCreateNew}
        />
      )}

      {activeTab === 'orders' && (
        <OrderList
          orders={filteredOrders ? filteredOrders.map(order => ({
            ...order,
            user_email: typeof order.user_email === 'string' ? order.user_email : order.user_email?.email || 'Unknown'
          })) : []}
          isLoading={ordersLoading}
          onUpdateStatus={updateOrderStatus}
        />
      )}

      {activeTab === 'categories' && (
        <View style={styles.categoryContainer}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              resetCategoryForm();
              setIsCategoryModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Create New Category</Text>
          </TouchableOpacity>
          <CategoryList
            categories={filteredCategories || []}
            isLoading={categoriesLoading}
            onEdit={(category) => {
              setSelectedCategory(category);
              setCategoryFormData({
                name: category.name,
                slug: category.slug,
                imageUrl: category.imageUrl,
              });
              setIsCategoryModalVisible(true);
            }}
            onDelete={handleDeleteCategory}
          />
        </View>
      )}

      {activeTab === 'sizes' && (
        <SizeManagement />
      )}

      <ModernProductModal
        visible={isModalVisible}
        formData={formData}
        isEditing={!!selectedProduct}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        onPickImage={pickImage}
        categories={categories || []}
      />

      <CategoryModal
        visible={isCategoryModalVisible}
        formData={categoryFormData}
        isEditing={!!selectedCategory}
        onClose={() => {
          setIsCategoryModalVisible(false);
          resetCategoryForm();
        }}
        onSubmit={() => {
          if (selectedCategory) {
            handleUpdateCategory(selectedCategory.id, categoryFormData);
          } else {
            handleCreateCategory(categoryFormData);
          }
          setIsCategoryModalVisible(false);
          resetCategoryForm();
        }}
        onChange={(data) => setCategoryFormData(prev => ({ ...prev, ...data }))}
        onPickImage={pickImage}
      />

      {previewImage && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Image Preview:</Text>
          <Image source={{ uri: previewImage }} style={styles.previewImage} />
        </View>
      )}
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
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
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
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  categoryContainer: {
    flex: 1,
    padding: 10,
  },
  createButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
});