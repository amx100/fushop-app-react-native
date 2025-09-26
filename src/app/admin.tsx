import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { ProductList } from '../components/admin/ProductList';
import { OrderList } from '../components/admin/OrderList';
import { ModernProductModal } from '../components/admin/ProductModal';
import { CategoryModal } from '../components/admin/CategoryModal';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { ProductListSkeleton, OrderListSkeleton, CategoryListSkeleton } from '../components/admin/LoadingSkeleton';


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
  imageurl: '',
};

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'categories' | 'sizes'>('products');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormData);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const {
    products,
    isLoading: productsLoading,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    pickImage,
    tempImageUrl,
    fixAllProductStatuses,
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Prefetch all data when component mounts
  useEffect(() => {
    const prefetchAllData = async () => {
      // Prefetch all admin data in parallel
      await Promise.all([
        queryClient.prefetchQuery({
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
          staleTime: 1000 * 60 * 5,
        }),
        queryClient.prefetchQuery({
          queryKey: ['admin-orders'],
          queryFn: async () => {
            const { data: ordersData, error } = await supabase
              .from('order')
              .select(`
                *,
                user_email:users(email),
                items:order_item(
                  quantity,
                  size,
                  product:product(
                    title,
                    heroimage
                  )
                )
              `)
              .order('created_at', { ascending: false });

            if (error) throw error;

            if (ordersData) {
              return ordersData.map((order) => ({
                id: order.id,
                slug: order.slug,
                created_at: order.created_at,
                totalPrice: order.totalprice,
                status: order.status,
                user_email: order.user_email,
                items: order.items.map((item: any) => ({
                  product: {
                    title: item.product?.title || 'Unknown Product',
                    heroImage: item.product?.heroimage || '',
                  },
                  size: item.size,
                  quantity: item.quantity,
                })),
              }));
            }
            
            return [];
          },
          staleTime: 1000 * 60 * 2,
        }),
        queryClient.prefetchQuery({
          queryKey: ['categories'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('category')
              .select('id, name, slug, imageurl, products, created_at')
              .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
          },
          staleTime: 1000 * 60 * 5,
        }),
      ]);
    };

    prefetchAllData();
  }, [queryClient]);

  // Automatically fix product statuses in background after products load
  useEffect(() => {
    if (products && products.length > 0) {
      // Run status fix in background without blocking UI
      const fixStatusesInBackground = async () => {
        try {
          // Check if any products have incorrect status
          const needsFixing = products.some(product => {
            const totalQuantity = product.sizes?.reduce((sum: number, size: any) => sum + (size.quantity || 0), 0) || 0;
            const shouldBeAvailable = totalQuantity > 0;
            const isAvailable = product.status === 'available';
            return shouldBeAvailable !== isAvailable;
          });

          if (needsFixing) {
            // Run fix in background
            await fixAllProductStatuses();
          }
        } catch (error) {
          console.error('Background status fix failed:', error);
          // Don't show error to user, just log it
        }
      };

      // Run after a short delay to not interfere with initial loading
      const timeoutId = setTimeout(fixStatusesInBackground, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [products, fixAllProductStatuses]);

  // Background refetch when switching tabs (silent refresh)
  const handleTabSwitch = (tab: 'products' | 'orders' | 'categories' | 'sizes') => {
    setActiveTab(tab);
    
    // Silently refresh data for the selected tab
    switch (tab) {
      case 'products':
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        break;
      case 'orders':
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        break;
      case 'categories':
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        break;
    }
  };

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
      await signOut();
      Toast.show('Signed out successfully', { type: 'success' });
      // Redirect will be handled by auth provider
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
      heroImage: product.heroimage,
      category: product.category,
      imagesUrl: product.imagesurl || [],
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


  // Memoized filtered data to prevent unnecessary re-calculations
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearchQuery.trim()) return products;
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    return products.filter(product => {
      const title = (product.title || '').toLowerCase();
      const slug = (product.slug || '').toLowerCase();
      return title.includes(query) || slug.includes(query);
    });
  }, [products, debouncedSearchQuery]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!debouncedSearchQuery.trim()) return orders;
    
    const searchLower = debouncedSearchQuery.toLowerCase();
    
    return orders.filter(order => {
      // Search by order slug/ID
      const slugMatch = (order.slug?.toLowerCase() || '').includes(searchLower);
      // Pretraga po e-pošti kupca
      const emailMatch = typeof order.user_email === 'object' && 
        (order.user_email?.email?.toLowerCase() || '').includes(searchLower) || false;
      
      return slugMatch || emailMatch;
    });
  }, [orders, debouncedSearchQuery]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!debouncedSearchQuery.trim()) return categories;
    
    const query = debouncedSearchQuery.toLowerCase();
    return categories.filter(category => 
      (category.name?.toLowerCase() || '').includes(query) ||
      (category.slug?.toLowerCase() || '').includes(query)
    );
  }, [categories, debouncedSearchQuery]);

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
          onPress={() => handleTabSwitch('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => handleTabSwitch('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => handleTabSwitch('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sizes' && styles.activeTab]}
          onPress={() => handleTabSwitch('sizes')}
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
          {searchQuery !== debouncedSearchQuery && (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          )}
        </View>
      )}

      {activeTab === 'products' && (
        <>
          {searchQuery && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsText}>
                {filteredProducts?.length || 0} od {products?.length || 0} proizvoda
              </Text>
            </View>
          )}
          {productsLoading ? (
            <ProductListSkeleton />
          ) : products && products.length > 0 ? (
            <ProductList
              products={filteredProducts || []}
              isLoading={productsLoading}
              onEdit={handleEdit}
              onDelete={handleDeleteProduct}
              onCreateNew={handleCreateNew}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Greška pri učitavanju proizvoda</Text>
            </View>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <>
          {ordersLoading ? (
            <OrderListSkeleton />
          ) : (
            <OrderList
              orders={filteredOrders ? filteredOrders.map(order => ({
                ...order,
                user_email: typeof order.user_email === 'string' ? order.user_email : order.user_email?.email || 'Unknown'
              })) : []}
              isLoading={ordersLoading}
              onUpdateStatus={updateOrderStatus}
            />
          )}
        </>
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
          {categoriesLoading ? (
            <CategoryListSkeleton />
          ) : (
            <CategoryList
              categories={filteredCategories || []}
              isLoading={categoriesLoading}
              onEdit={(category) => {
                setSelectedCategory(category);
                setCategoryFormData({
                  name: category.name || '',
                  slug: category.slug,
                  imageurl: category.imageurl,
                });
                setIsCategoryModalVisible(true);
              }}
              onDelete={handleDeleteCategory}
            />
          )}
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
  searchLoading: {
    padding: 4,
  },
  searchResultsContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b35',
    textAlign: 'center',
  },
});