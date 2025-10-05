import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
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
import { ReservationsManagement } from '../components/admin/ReservationsManagement';
import ProfitAnalysis from '../components/admin/ProfitAnalysis';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import SizeManagement from '../components/admin/SizeModal';
import { useQueryClient } from '@tanstack/react-query';
import { ProductListSkeleton, OrderListSkeleton, CategoryListSkeleton } from '../components/admin/LoadingSkeleton';
import { LinearGradient } from 'expo-linear-gradient';


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

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'categories' | 'sizes' | 'reservations' | 'profit'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormData);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          // Don't show error to user, just log it
        }
      };

      // Run after a short delay to not interfere with initial loading
      const timeoutId = setTimeout(fixStatusesInBackground, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [products, fixAllProductStatuses]);

  // Dashboard statistics calculation
  const dashboardStats = useMemo(() => {
   
    
    if (!products || !orders || !categories) {
     
      return {
        totalProducts: 0,
        availableProducts: 0,
        outOfStockProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCategories: 0,
        totalRevenue: 0,
        totalStock: 0,
        sizeStats: {} as Record<string, number>
      };
    }

    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.status === 'available').length;
    const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length;
    
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'čekanje' as OrderStatus).length;
    const completedOrders = orders.filter(o => o.status === 'Completed' as OrderStatus).length;
    
    const totalCategories = categories.length;
    const totalRevenue = orders
      .filter(o => o.status === 'Completed' as OrderStatus)
      .reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    
    // Calculate stock statistics
    const sizeStats = products.reduce((acc, product) => {
      if (product.sizes) {
        product.sizes.forEach((size: any) => {
          const sizeName = size.size;
          if (sizeName && !acc[sizeName]) {
            acc[sizeName] = 0;
          }
          if (sizeName) {
            acc[sizeName] += size.quantity || 0;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const totalStock = Object.values(sizeStats).reduce((sum: number, qty: any) => sum + (qty as number), 0);

   

    return {
      totalProducts,
      availableProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalCategories,
      totalRevenue,
      totalStock,
      sizeStats
    };
  }, [products, orders, categories]);

  // Auto-refresh dashboard when data changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Refresh dashboard data when products or orders change
      const refreshDashboard = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      };

      // Set up interval for periodic refresh when on dashboard
      const interval = setInterval(refreshDashboard, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab, queryClient]);

  // Auto-refresh dashboard when returning from other tabs
  useEffect(() => {
    if (activeTab === 'dashboard') {
     
      
      // Force refresh svih podataka
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      ]).then(() => {
      
      });
    }
  }, [activeTab, queryClient]);

  // Background refetch when switching tabs (silent refresh)
  const handleTabSwitch = (tab: 'dashboard' | 'products' | 'orders' | 'categories' | 'sizes' | 'reservations' | 'profit') => {
  
    setActiveTab(tab);
    setIsMenuOpen(false); // Close menu when switching tabs
    
    // Force refresh za svaki tab
    switch (tab) {
      case 'dashboard':
       
        // Za dashboard refresh sve
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        break;
      case 'products':
       
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        break;
      case 'orders':
       
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        break;
      case 'categories':    
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        break;
      case 'reservations':
        
        // Reservations component će fetchovati svoje podatke
        break;
      case 'profit':
        
        // Profit component će koristiti postojeće podatke
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
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

  // Helper function to translate order status to Serbian
  const getStatusTranslation = (status: OrderStatus): string => {
    const statusTranslations: Record<OrderStatus, string> = {
      'čekanje': 'Na čekanju',
      'Completed': 'Završeno',
      'Shipped': 'Poslato',
      'InTransit': 'U Tranzitu',
      'cancelled': 'Otkazano'
    };
    return statusTranslations[status] || status;
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by search query
    if (debouncedSearchQuery.trim()) {
      const searchLower = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        // Search by order slug/ID
        const slugMatch = (order.slug?.toLowerCase() || '').includes(searchLower);
        // Search by customer email
        const emailMatch = typeof order.user_email === 'object' && 
          order.user_email && 'email' in order.user_email &&
          ((order.user_email as any).email?.toLowerCase() || '').includes(searchLower) || false;
        // Search by status translation
        const statusMatch = getStatusTranslation(order.status).toLowerCase().includes(searchLower);
        
        return slugMatch || emailMatch || statusMatch;
      });
    }
    
    return filtered;
  }, [orders, debouncedSearchQuery, statusFilter]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!debouncedSearchQuery.trim()) return categories;
    
    const query = debouncedSearchQuery.toLowerCase();
    return categories.filter(category => 
      (category.name?.toLowerCase() || '').includes(query) ||
      (category.slug?.toLowerCase() || '').includes(query)
    );
  }, [categories, debouncedSearchQuery]);

  // Dashboard Component
  const DashboardComponent = () => (
    <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
      {/* Welcome Header with Refresh Button */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.dashboardTitle}>Kontrolna tabla</Text>
          <Text style={styles.dashboardSubtitle}>Pregled svih aktivnosti</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={async () => {
            
            setIsRefreshing(true);
            try {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
                queryClient.invalidateQueries({ queryKey: ['categories'] })
              ]);
              
              // Sačekaj da se podaci učitaju
              await Promise.all([
                queryClient.refetchQueries({ queryKey: ['admin-products'] }),
                queryClient.refetchQueries({ queryKey: ['admin-orders'] }),
                queryClient.refetchQueries({ queryKey: ['categories'] })
              ]);
              
             
              Toast.show('Podaci su osveženi', { type: 'success' });
            } catch (error) {
             
              Toast.show('Greška pri osvežavanju podataka', { type: 'error' });
            } finally {
              setIsRefreshing(false);
            }
          }}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color="#667eea" 
            style={isRefreshing ? { transform: [{ rotate: '180deg' }] } : {}}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStatsRow}>
          <View style={[styles.quickStatCard, { backgroundColor: '#2ECC71' }]}>
            <Ionicons name="cube-outline" size={24} color="white" />
            <Text style={styles.quickStatNumber}>{dashboardStats.totalProducts}</Text>
            <Text style={styles.quickStatLabel}>Proizvoda</Text>
          </View>
          <View style={[styles.quickStatCard, { backgroundColor: '#3498DB' }]}>
            <Ionicons name="receipt-outline" size={24} color="white" />
            <Text style={styles.quickStatNumber}>{dashboardStats.totalOrders}</Text>
            <Text style={styles.quickStatLabel}>Narudžbina</Text>
          </View>
        </View>
        <View style={styles.quickStatsRow}>
          <View style={[styles.quickStatCard, { backgroundColor: '#E67E22' }]}>
            <Ionicons name="cash-outline" size={24} color="white" />
            <Text style={styles.quickStatNumber}>{dashboardStats.totalRevenue.toLocaleString()} RSD</Text>
            <Text style={styles.quickStatLabel}>Prihod</Text>
          </View>
          <View style={[styles.quickStatCard, { backgroundColor: '#8E44AD' }]}>
            <Ionicons name="layers-outline" size={24} color="white" />
            <Text style={styles.quickStatNumber}>{dashboardStats.totalCategories}</Text>
            <Text style={styles.quickStatLabel}>Kategorija</Text>
          </View>
        </View>
      </View>

      {/* Detailed Statistics */}
      <View style={styles.detailedStatsContainer}>
        <Text style={styles.sectionTitle}>Detaljne statistike</Text>
        
        {/* Products Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="cube-outline" size={20} color="#667eea" />
            <Text style={styles.statsCardTitle}>Proizvodi</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{dashboardStats.totalProducts}</Text>
              <Text style={styles.statLabel}>Ukupno</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#2ECC71' }]}>{dashboardStats.availableProducts}</Text>
              <Text style={styles.statLabel}>Dostupni</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#E74C3C' }]}>{dashboardStats.outOfStockProducts}</Text>
              <Text style={styles.statLabel}>Nema na stanju</Text>
            </View>
          </View>
        </View>

         {/* Stock Stats */}
         <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="storefront-outline" size={20} color="#667eea" />
            <Text style={styles.statsCardTitle}>Zalihe</Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockTotal}>Ukupne zalihe: {dashboardStats.totalStock as number} komada</Text>
            {Object.keys(dashboardStats.sizeStats).length > 0 && (
              <View style={styles.sizeStatsContainer}>
                {Object.entries(dashboardStats.sizeStats)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([size, quantity]) => (
                    <View key={size} style={styles.sizeStatItem}>
                      <Text style={styles.sizeStatText}>{size}: {quantity as number}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>

         {/* Orders Stats */}
         <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="receipt-outline" size={20} color="#667eea" />
            <Text style={styles.statsCardTitle}>Narudžbine</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{dashboardStats.totalOrders}</Text>
              <Text style={styles.statLabel}>Ukupno</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F39C12' }]}>{dashboardStats.pendingOrders}</Text>
              <Text style={styles.statLabel}>Na čekanju</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#27AE60' }]}>{dashboardStats.completedOrders}</Text>
              <Text style={styles.statLabel}>Završene</Text>
            </View>
          </View>
        </View>

      </View>

       

       

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Brze akcije</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleTabSwitch('products')}
          >
            <LinearGradient colors={['#2ECC71', '#27AE60']} style={styles.quickActionGradient}>
              <Ionicons name="cube-outline" size={24} color="white" />
              <Text style={styles.quickActionText}>Proizvodi</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleTabSwitch('orders')}
          >
            <LinearGradient colors={['#3498DB', '#2980B9']} style={styles.quickActionGradient}>
              <Ionicons name="receipt-outline" size={24} color="white" />
              <Text style={styles.quickActionText}>Narudžbine</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleTabSwitch('categories')}
          >
            <LinearGradient colors={['#8E44AD', '#9B59B6']} style={styles.quickActionGradient}>
              <Ionicons name="layers-outline" size={24} color="white" />
              <Text style={styles.quickActionText}>Kategorije</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleTabSwitch('reservations')}
          >
            <LinearGradient colors={['#E67E22', '#D35400']} style={styles.quickActionGradient}>
              <Ionicons name="calendar-outline" size={24} color="white" />
              <Text style={styles.quickActionText}>Rezervacije</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Collapsible Menu Header */}
      <View style={styles.menuHeader}>
        <TouchableOpacity 
          style={styles.menuToggle}
          onPress={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Ionicons 
            name={isMenuOpen ? "close" : "menu"} 
            size={24} 
            color="#667eea" 
          />
        </TouchableOpacity>
        <Text style={styles.menuTitle}>Admin Panel</Text>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Collapsible Menu */}
      {isMenuOpen && (
        <View style={styles.collapsibleMenu}>
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'dashboard' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('dashboard')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'dashboard' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="grid-outline" 
                  size={20} 
                  color={activeTab === 'dashboard' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'dashboard' && styles.activeMenuText]}>
                Kontrola
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'products' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('products')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'products' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="cube-outline" 
                  size={20} 
                  color={activeTab === 'products' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'products' && styles.activeMenuText]}>
                Proizvodi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'orders' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('orders')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'orders' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="receipt-outline" 
                  size={20} 
                  color={activeTab === 'orders' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'orders' && styles.activeMenuText]}>
                Narudžbine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'categories' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('categories')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'categories' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="layers-outline" 
                  size={20} 
                  color={activeTab === 'categories' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'categories' && styles.activeMenuText]}>
                Kategorije
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'sizes' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('sizes')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'sizes' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="resize-outline" 
                  size={20} 
                  color={activeTab === 'sizes' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'sizes' && styles.activeMenuText]}>
                Veličine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'reservations' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('reservations')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'reservations' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color={activeTab === 'reservations' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'reservations' && styles.activeMenuText]}>
                Rezervacije
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, activeTab === 'profit' && styles.activeMenuItem]}
              onPress={() => handleTabSwitch('profit')}
            >
              <View style={[styles.menuIconContainer, activeTab === 'profit' && styles.activeMenuIconContainer]}>
                <Ionicons 
                  name="analytics-outline" 
                  size={20} 
                  color={activeTab === 'profit' ? '#fff' : '#667eea'} 
                />
              </View>
              <Text style={[styles.menuText, activeTab === 'profit' && styles.activeMenuText]}>
                Profit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && <DashboardComponent />}

      {(activeTab === 'products' || activeTab === 'orders') && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'orders' 
                ? "Pretraži narudžbine po email-u, ID-u ili statusu..." 
                : "Pretraži proizvode..."
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

      {/* Status Filter for Orders */}
      {activeTab === 'orders' && (
        <View style={styles.statusFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'all' ? '#2ECC71' : '#f3f4f6',
                  borderColor: statusFilter === 'all' ? '#2ECC71' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'all' && styles.activeStatusFilterText]}>
                Sve
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'čekanje' ? '#F39C12' : '#f3f4f6',
                  borderColor: statusFilter === 'čekanje' ? '#F39C12' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('čekanje')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'čekanje' && styles.activeStatusFilterText]}>
                Na čekanju
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'InTransit' ? '#3498DB' : '#f3f4f6',
                  borderColor: statusFilter === 'InTransit' ? '#3498DB' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('InTransit')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'InTransit' && styles.activeStatusFilterText]}>
                U Tranzitu
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'Shipped' ? '#9B59B6' : '#f3f4f6',
                  borderColor: statusFilter === 'Shipped' ? '#9B59B6' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('Shipped')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'Shipped' && styles.activeStatusFilterText]}>
                Poslato
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'Completed' ? '#27AE60' : '#f3f4f6',
                  borderColor: statusFilter === 'Completed' ? '#27AE60' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('Completed')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'Completed' && styles.activeStatusFilterText]}>
                Završeno
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusFilterButton, 
                { 
                  backgroundColor: statusFilter === 'cancelled' ? '#E74C3C' : '#f3f4f6',
                  borderColor: statusFilter === 'cancelled' ? '#E74C3C' : '#e9ecef'
                }
              ]}
              onPress={() => setStatusFilter('cancelled')}
            >
              <Text style={[styles.statusFilterText, statusFilter === 'cancelled' && styles.activeStatusFilterText]}>
                Otkazano
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
                user_email: typeof order.user_email === 'string' ? order.user_email : 
                  (typeof order.user_email === 'object' && order.user_email && 'email' in order.user_email ? (order.user_email as any).email : 'Unknown'),
                status: getStatusTranslation(order.status) as any // Translate status for display
              })) : []}
              isLoading={ordersLoading}
              onUpdateStatus={updateOrderStatus}
            />
          )}
        </>
      )}

      {activeTab === 'categories' && (
        <View style={styles.categoryContainer}>
          <View style={styles.categoriesHeader}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search categories..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => {
                resetCategoryForm();
                setIsCategoryModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.buttonText}>Kreiraj novu kategoriju</Text>
            </TouchableOpacity>
          </View>
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

      {activeTab === 'reservations' && (
        <>
         
          <ReservationsManagement />
        </>
      )}

      {activeTab === 'profit' && (
        <ProfitAnalysis 
          products={products || []} 
          isLoading={productsLoading} 
        />
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
    backgroundColor: '#f8f9fa',
  },
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  welcomeHeader: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 50,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  quickStatsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  detailedStatsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  stockInfo: {
    marginTop: 8,
  },
  stockTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  sizeStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  sizeStatItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sizeStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  // Collapsible Menu Styles
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  collapsibleMenu: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (width - 80) / 2, // 2 items per row with more spacing
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  activeMenuItem: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    elevation: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  activeMenuIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuText: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  activeMenuText: {
    color: 'white',
    fontWeight: '600',
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Existing styles for other components
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
    backgroundColor: '#f8fafc',
  },
  categoriesHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  createButton: {
    backgroundColor: '#ff6b35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
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
  // Status Filter Styles
  statusFilterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statusFilterScroll: {
    paddingHorizontal: 16,
  },
  statusFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeStatusFilter: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  statusFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  activeStatusFilterText: {
    color: 'white',
    fontWeight: '600',
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