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
import { getProductsAndCategories } from '../../api/api'; 
import { Product } from '../../types'; 
import { useState, useCallback, memo } from 'react';
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

const Home = () => {   
  const { data, error, isLoading } = getProductsAndCategories();   
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = data?.products?.filter((product) => 
    searchQuery.trim() === '' || (
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  if (isLoading) return <ActivityIndicator />;    

  if (error || !data)     
    return <Text>Error {error?.message || 'An error occurred'}</Text>;    

  return (     
    <View style={styles.container}>       
      <FlatList         
        data={filteredProducts || []}         
        renderItem={({ item }) => <ProductListItem product={item} />}         
        keyExtractor={item => item.id.toString()}         
        numColumns={2}         
        ListHeaderComponent={
          <SearchHeader 
            categories={data.categories} 
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        }         
        contentContainerStyle={styles.flatListContent}         
        columnWrapperStyle={styles.flatListColumn}         
        style={{ paddingHorizontal: 10, paddingVertical: 5 }}         
        ListEmptyComponent={() => (           
          <Text style={styles.noProducts}>             
            {searchQuery ? 'No products found matching your search' : 'No products available'}           
          </Text>         
        )}
        removeClippedSubviews={false} // Ovo će pomoći da se tastatura ne zatvara
      />     
    </View>   
  ); 
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  flatListColumn: {
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