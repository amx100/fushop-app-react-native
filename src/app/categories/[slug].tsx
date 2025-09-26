import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { ProductListItem } from '../../components/product-list-item';
import { getCategoryAndProducts } from '../../api/api';

const Category = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();


  const { data, error, isLoading } = getCategoryAndProducts(slug);
  
 

  if (isLoading) return <ActivityIndicator />;
  if (error || !data) return <Text>Error: {error?.message}</Text>;
  if (!data.category || !data.products) return <Redirect href='/404' />;

  const { category, products } = data;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: category.name || 'Category' }} />
      <Image
        source={{ uri: category.imageurl || 'https://via.placeholder.com/400x200/cccccc/666666?text=No+Image', cache: 'force-cache' }} // Cache applied here
        style={styles.categoryImage}
      />
  
      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ProductListItem product={item} />}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productsList}
      />
    </View>
  );
};

export default React.memo(Category);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  categoryImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  productsList: {
    flexGrow: 1,
  },
  productRow: {
    justifyContent: 'space-between',
  },
});
