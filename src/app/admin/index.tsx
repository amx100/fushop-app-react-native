import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    View,
    Text,
    Pressable,
    TextInput,
    Image,
    Alert,
  } from 'react-native';
  import { useState, useEffect } from 'react';
  import { supabase } from '../../lib/supabase';
  
  interface Product {
    id: number;
    title: string;
    price: number;
    heroImage: string;
    category: number;
    imagesUrl: string[];
    maxQuantity: number;
    slug: string;
  }
  
  const AdminPanel = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
      title: '',
      price: 0,
      heroImage: '',
      category: 1,
      imagesUrl: [],
      maxQuantity: 1,
      slug: '',
    });
  
    // Fetch products
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('product')
          .select('id, title, price, heroImage, category, imagesUrl, maxQuantity, slug');
  
        if (error) throw error;
  
        setProducts(data as Product[]);
        setLoading(false);
      } catch (error: any) {
        Alert.alert('Error', error.message);
        setLoading(false);
      }
    };
  
    // Create product
    const handleCreateProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('product')
          .insert([
            {
              ...newProduct,
              slug: newProduct.title.toLowerCase().replace(/ /g, '-'),
            },
          ])
          .select()
          .single();
  
        if (error) throw error;
  
        setProducts([...products, data as Product]);
        setNewProduct({
          title: '',
          price: 0,
          heroImage: '',
          category: 1,
          imagesUrl: [],
          maxQuantity: 1,
          slug: '',
        });
        Alert.alert('Success', 'Product created successfully');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    };
  
    // Update product
    const handleUpdateProduct = async (id: number) => {
      if (!editingProduct) return;
  
      try {
        const { error } = await supabase
          .from('product')
          .update({
            ...editingProduct,
            slug: editingProduct.title.toLowerCase().replace(/ /g, '-'),
          })
          .eq('id', id);
  
        if (error) throw error;
  
        setProducts(products.map((p) => (p.id === id ? editingProduct : p)));
        setEditingProduct(null);
        Alert.alert('Success', 'Product updated successfully');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    };
  
    // Delete product
    const handleDeleteProduct = async (id: number) => {
      try {
        const { error } = await supabase.from('product').delete().eq('id', id);
  
        if (error) throw error;
  
        setProducts(products.filter((p) => p.id !== id));
        Alert.alert('Success', 'Product deleted successfully');
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    };
  
    useEffect(() => {
      fetchProducts();
    }, []);
  
    if (loading) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
  
    return (
      <View style={styles.container}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.productContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>${item.price}</Text>
              <Image source={{ uri: item.heroImage }} style={styles.image} />
              <Pressable onPress={() => setEditingProduct(item)}>
                <Text style={styles.editButton}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDeleteProduct(item.id)}>
                <Text style={styles.deleteButton}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: { flex: 1, padding: 10 },
    productContainer: { marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 'bold' },
    image: { width: 100, height: 100 },
    editButton: { color: 'blue' },
    deleteButton: { color: 'red' },
  });
  
  export default AdminPanel;  
