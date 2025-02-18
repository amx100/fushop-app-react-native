import React, { useState, useEffect, memo } from 'react';
import { 
  ActivityIndicator,   
  FlatList,   
  StyleSheet,   
  View,   
  Text,   
  TouchableOpacity,   
  TextInput, 
} from 'react-native';  
import { ProductListItem } from '../../components/product-list-item'; 
import { ListHeader } from '../../components/list-header'; 
import { supabase } from '../../lib/supabase';
import { Tables } from '../../types/database.types';
import { Ionicons } from '@expo/vector-icons';

// Izdvajamo SearchHeader kao zasebnu memo komponentu
const SearchHeader = memo(({ 
  categories, 
  searchQuery, 
  onSearchChange 
}: { 
  categories: any[], 
  searchQuery: string, 
  onSearchChange: (text: string) => void 
}) => (
  <View>
    <ListHeader categories={categories} />
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
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
  </View>
));

export default function ShopIndex() {
  const [products, setProducts] = useState<Tables<'product'>[]>([]);
  const [categories, setCategories] = useState<Tables<'category'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Starting data fetch...');
        setIsLoading(true);
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('category')
          .select('*');
        
        console.log('Categories data:', categoriesData);
        console.log('Categories error:', categoriesError);
        
        if (categoriesError) throw categoriesError;
        
        // Fetch products - remove status filter temporarily
        const { data: productsData, error: productsError } = await supabase
          .from('product')
          .select('*');
        
        console.log('Products data:', productsData);
        console.log('Products error:', productsError);
        
        if (productsError) throw productsError;
        
        setCategories(categoriesData || []);
        setProducts(productsData || []);
      } catch (err: any) {
        console.error('FULL Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products?.filter((product) => 
    searchQuery.trim() === '' || (
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading products: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts || []}
        renderItem={({ item }) => <ProductListItem product={item} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <SearchHeader 
            categories={categories} 
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <Text style={styles.noProducts}>
            {searchQuery ? 'No products found matching your search' : 'No products available'}
          </Text>
        )}
        removeClippedSubviews={false}
      />
    </View>
  );
}

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
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginBottom: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  noProducts: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});