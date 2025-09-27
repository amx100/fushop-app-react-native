import React, { useState, useEffect, memo } from 'react';
import { 
  ActivityIndicator,   
  FlatList,   
  StyleSheet,   
  View,   
  Text,   
  TouchableOpacity,   
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';  
import { ProductListItem } from '../../components/product-list-item'; 
import { ListHeader } from '../../components/list-header'; 
import { FilterModal, FilterState } from '../../components/FilterModal';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../providers/auth-provider';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  
  // Search and Filter Styles
  searchAndFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  // Banner Styles
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerGradient: {
    padding: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  shopNowButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  shopNowText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerImageContainer: {
    marginLeft: 16,
  },
  bannerImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  
  // Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '500',
  },
  
  // Brands Styles
  brandsSection: {
    marginBottom: 24,
  },
  brandsScrollView: {
    paddingLeft: 20,
  },
  brandItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  brandLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Categories Styles
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesScrollView: {
    paddingLeft: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  emptyCategoriesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCategoriesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Products Styles
  productsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  productsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  noProducts: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  emptyProductsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  retryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearFiltersButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  clearFiltersButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


// Search and Filter Component
const SearchAndFilter = memo(({ 
  searchQuery, 
  onSearchChange,
  onFilterPress
}: { 
  searchQuery: string, 
  onSearchChange: (text: string) => void,
  onFilterPress: () => void
}) => (
  <View style={styles.searchAndFilterContainer}>
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Pretraga.."
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholderTextColor="#666"
      />
      {searchQuery !== '' && (
        <TouchableOpacity onPress={() => onSearchChange('')}>
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
    <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
      <Ionicons name="options-outline" size={20} color="#333" />
    </TouchableOpacity>
  </View>
));

// Banner Component
const BannerSection = memo(() => (
  <View style={styles.bannerContainer}>
    <LinearGradient
      colors={['#ff9a56', '#ff6b35']}
      style={styles.bannerGradient}
    >
      <View style={styles.bannerContent}>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerSubtitle}>Danas samo</Text>
          <Text style={styles.bannerTitle}>80% POPUST</Text>
          <Text style={styles.bannerDescription}>Super popust</Text>
          <TouchableOpacity style={styles.shopNowButton}>
            <Text style={styles.shopNowText}>Kupi sada</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerImageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face' }}
            style={styles.bannerImage}
          />
        </View>
      </View>
    </LinearGradient>
  </View>
));




// Categories Component
const CategoriesSection = memo(({ categories }: { categories: Tables<'category'>[] }) => {
  const router = useRouter();



  const handleCategoryPress = (slug: string) => {

    router.push(`/categories/${slug}`);
  };

  return (
    <View style={styles.categoriesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kategorije</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>Vidi sve</Text>
        </TouchableOpacity>
      </View>
      {categories && categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScrollView}>
          {categories.map((category) => (
            <TouchableOpacity 
              key={category.id} 
              style={styles.categoryItem}
              onPress={() => handleCategoryPress(category.slug)}
            >
              <Image
                source={{ uri: category.imageurl || 'https://via.placeholder.com/80x120/cccccc/666666?text=No+Image' }}
                style={styles.categoryImage}
              />
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyCategoriesContainer}>
          <Text style={styles.emptyCategoriesText}>Nema kategorija</Text>
        </View>
      )}
    </View>
  );
});

export default function ShopIndex() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Tables<'product'>[]>([]);
  const [categories, setCategories] = useState<Tables<'category'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: { min: 0, max: 5000 },
    sizes: [],
    sortBy: 'created_at',
    inStock: false,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('category')
        .select('id, name, slug, imageurl, products, created_at');
      
      if (categoriesError) throw categoriesError;
      
      // Fetch products with sizes
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select(`
          *,
          product_size:product_size(
            id,
            quantity,
            size_id,
            sizes:sizes(
              id,
              value
            )
          )
        `)
        .order('created_at', { ascending: false }); // Order by newest first
      
      if (productsError) throw productsError;
      
      setCategories(categoriesData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filters.categories.length === 0 || 
      filters.categories.includes(product.category);
    const matchesPrice = product.price >= filters.priceRange.min && 
      product.price <= filters.priceRange.max;
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const onRefresh = useCallback(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <LinearGradient
            colors={['#ff6b35', '#ff4757']}
            style={styles.retryButtonGradient}
          >
            <Text style={styles.retryButtonText}>Pokušaj ponovo</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => setIsFilterModalVisible(true)}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        <BannerSection />
        <CategoriesSection categories={categories} />
        
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Proizvodi</Text>
          </View>
          
          {sortedProducts.length > 0 ? (
            <FlatList
              data={sortedProducts}
              renderItem={({ item }) => <ProductListItem product={item} />}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.productsRow}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Text style={styles.emptyProductsText}>
                {searchQuery || filters.categories.length > 0 || 
                 filters.priceRange.min > 0 || filters.priceRange.max < 5000 || 
                filters.inStock ? 'Nema proizvoda koji odgovaraju vašim filtrom' : 'Nema proizvoda dostupnih'}
              </Text>
              {(searchQuery || filters.categories.length > 0 || 
                filters.priceRange.min > 0 || filters.priceRange.max < 5000 || 
                filters.inStock) && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setFilters({
                      categories: [],
                      priceRange: { min: 0, max: 5000 },
                      sizes: [],
                      sortBy: 'created_at',
                      inStock: false,
                    });
                  }}
                  style={styles.clearFiltersButton}
                >
                  <LinearGradient
                    colors={['#ff6b35', '#ff4757']}
                    style={styles.clearFiltersButtonGradient}
                  >
                    <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <FilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        currentFilters={filters}
        onApplyFilters={setFilters}
        categories={categories}
      />

    </View>
  );
}