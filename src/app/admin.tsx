import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { ProductList } from '../components/admin/ProductList';
import { OrderList } from '../components/admin/OrderList';
import { ProductModal } from '../components/admin/ProductModal';
import { CategoryModal } from '../components/admin/CategoryModal';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Product, ProductFormData, Order, OrderStatus, Category, CategoryFormData, ProductSize, SizeType } from '../types';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { supabase } from '../lib/supabase';
import { Toast } from 'react-native-toast-notifications';
import { randomUUID } from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { CategoryList } from '../components/admin/CategoryList';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import SizeManagement from './admin/sizes';

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
    pickImage: pickImageBase,
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

  const uploadImage = async (uri: string) => {
    if (!uri?.startsWith('file://')) {
      return null;
    }
  
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
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

  const pickCategoryImage = async () => {
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
          setCategoryFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
          Toast.show('Image uploaded successfully', { type: 'success' });
        }
      }
    } catch (error: any) {
      alert('Error picking image: ' + error.message);
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

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      slug: product.slug,
      imagesUrl: product.imagesUrl,
      price: product.price,
      heroImage: product.heroImage,
      category: product.category,
      sizes: product.sizes as (ProductSize[] & { size: SizeType; quantity: number; }[]),
    });
    setPreviewImage(product.heroImage);
    setIsModalVisible(true);
  };

  const filteredProducts = products?.filter(product => 
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductSubmit = async (productData: ProductFormData) => {
    if (selectedProduct) {
      await handleUpdateProduct(selectedProduct.id, productData);
    } else {
      await handleCreateProduct(productData);
    }
    setIsModalVisible(false);
    resetForm();
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {activeTab === 'products' && (
        <>
          <ProductList
            products={filteredProducts || []}
            isLoading={productsLoading}
            onEdit={openEditModal}
            onDelete={handleDeleteProduct}
            onCreateNew={() => {
              resetForm();
              setIsModalVisible(true);
            }}
          />
        </>
      )}

      {activeTab === 'orders' && (
        <OrderList
          orders={orders || []}
          isLoading={ordersLoading}
          onUpdateStatus={(orderId: number, status: OrderStatus) => updateOrderStatus(orderId, status)}
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
            categories={categories || []}
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
            onDelete={(id) => handleDeleteCategory(id)}
          />
        </View>
      )}

      {activeTab === 'sizes' && (
        <SizeManagement />
      )}

      <ProductModal
        visible={isModalVisible}
        formData={formData}
        isEditing={!!selectedProduct}
        onClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
        onSubmit={handleProductSubmit}
        onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
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
        onPickImage={pickCategoryImage}
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
});