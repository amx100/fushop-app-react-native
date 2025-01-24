import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface Product {
  id: number;
  title: string;
  price: number;
  category: number;
  maxQuantity: number;
  slug: string;
  heroImage: string;
  imagesUrl: string[];
  created_at: string;
}

const AdminPanel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 1,
    maxQuantity: 1,
    slug: '',
    heroImage: '',
    imagesUrl: [] as string[],
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const checkUserRole = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      if (currentUser.user_metadata?.type !== 'ADMIN') {
        Alert.alert('Unauthorized', 'You do not have permission to access this page');
        return;
      }

      setUser(currentUser);
      fetchProducts();
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      if (!newProduct.title || !newProduct.price) {
        Alert.alert('Error', 'Title and price are required');
        return;
      }

      const { data, error } = await supabase
        .from('product')
        .insert([
          {
            title: newProduct.title,
            price: parseFloat(newProduct.price),
            category: newProduct.category,
            maxQuantity: newProduct.maxQuantity,
            slug: newProduct.slug || newProduct.title.toLowerCase().replace(/ /g, '-'),
            heroImage: newProduct.heroImage,
            imagesUrl: newProduct.imagesUrl,
          },
        ])
        .select();

      if (error) throw error;

      if (data) {
        setProducts([...products, data[0]]);
        setNewProduct({
          title: '',
          price: '',
          category: 1,
          maxQuantity: 1,
          slug: '',
          heroImage: '',
          imagesUrl: [],
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const { data, error } = await supabase
        .from('product')
        .update({
          title: editingProduct.title,
          price: editingProduct.price,
          category: editingProduct.category,
          maxQuantity: editingProduct.maxQuantity,
          slug: editingProduct.slug,
          heroImage: editingProduct.heroImage,
          imagesUrl: editingProduct.imagesUrl,
        })
        .eq('id', editingProduct.id)
        .select();

      if (error) throw error;

      if (data) {
        setProducts(products.map(p => (p.id === editingProduct.id ? data[0] : p)));
        setEditingProduct(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      const { error } = await supabase
        .from('product')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  useEffect(() => {
    checkUserRole();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user || user.user_metadata?.type !== 'ADMIN') {
    return (
      <View style={styles.container}>
        <Text>Unauthorized access</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Product Title"
          value={newProduct.title}
          onChangeText={(text) => setNewProduct({ ...newProduct, title: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Price"
          value={newProduct.price}
          onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Hero Image URL"
          value={newProduct.heroImage}
          onChangeText={(text) => setNewProduct({ ...newProduct, heroImage: text })}
        />
        <TouchableOpacity style={styles.button} onPress={handleAddProduct}>
          <Text style={styles.buttonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productItem}>
            {editingProduct?.id === item.id ? (
              <View>
                <TextInput
                  style={styles.input}
                  value={editingProduct.title}
                  onChangeText={(text) =>
                    setEditingProduct({ ...editingProduct, title: text })
                  }
                />
                <TextInput
                  style={styles.input}
                  value={String(editingProduct.price)}
                  onChangeText={(text) =>
                    setEditingProduct({ ...editingProduct, price: parseFloat(text) || 0 })
                  }
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={editingProduct.heroImage}
                  onChangeText={(text) =>
                    setEditingProduct({ ...editingProduct, heroImage: text })
                  }
                />
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleUpdateProduct}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setEditingProduct(null)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.productName}>{item.title}</Text>
                <Text style={styles.productPrice}>${item.price}</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.editButton]}
                    onPress={() => setEditingProduct(item)}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={() => handleDeleteProduct(item.id)}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    flex: 1,
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: '#666',
    flex: 1,
    marginLeft: 5,
  },
});

export default AdminPanel;