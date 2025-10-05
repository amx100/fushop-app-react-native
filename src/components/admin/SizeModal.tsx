import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Toast } from 'react-native-toast-notifications';
import { Database } from '../../types/database.types';
import { Ionicons } from '@expo/vector-icons';

interface Size {
  id: number;
  value: string;
  created_at: string;
}

const { width } = Dimensions.get('window');

export default function SizeManagement() {
  const [newSize, setNewSize] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pokreni animaciju kada se komponenta učita
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const { data: sizes, isLoading } = useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('id, value, created_at')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Size[];
    }
  });

  // Filter sizes based on search query
  const filteredSizes = sizes?.filter(size => 
    size.value.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddSize = async () => {
    if (!newSize.trim()) {
      Toast.show('Veličina ne može biti prazna', { type: 'warning' });
      return;
    }

    try {
      const { error } = await supabase
        .from('sizes')
        .insert([{ 
          value: newSize.trim(),
        
        }]);

      if (error) throw error;

      Toast.show('Veličina dodata uspešno', { type: 'success' });
      setNewSize('');
      await queryClient.invalidateQueries({ queryKey: ['sizes'] });
    } catch (error) {
        Toast.show('Greška pri dodavanju veličine: ' + (error as Error).message, { type: 'error' });
    }
  };

  const handleDeleteSize = async (id: number) => {
    Alert.alert(
      'Obriši Veličinu',
      'Da li ste sigurni da želite da obrišete ovu veličinu? Ovo će uticati na sve proizvode koji koriste ovu veličinu.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sizes')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Toast.show('Veličina obrisana uspešno', { type: 'success' });
              await queryClient.invalidateQueries({ queryKey: ['sizes'] });
            } catch (error) {
              Toast.show('Greška pri brisanju veličine: ' + (error as Error).message, { type: 'error' });
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Učitavanje veličina...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
            <Ionicons name="resize-outline" size={24} color="#ff6b35" />
          <Text style={styles.title}>Upravljanje Veličinama</Text>
        </View>
        <Text style={styles.subtitle}>Upravljajte veličinama proizvoda</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Pretraži veličine..."
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.addSizeContainer}>
        <View style={styles.addSizeInputContainer}>
          <TextInput
            style={styles.addSizeInput}
            value={newSize}
            onChangeText={setNewSize}
            placeholder="Unesite novu veličinu (npr., S, M, 42, XL)"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddSize}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sizesHeader}>
        <Text style={styles.sizesCount}>
          {filteredSizes.length} veličina{filteredSizes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredSizes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View 
            style={[
              styles.sizeCard,
              { 
                transform: [{ 
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.sizeInfo}>
              <View style={styles.sizeIconContainer}>
                <Ionicons name="resize" size={20} color="#ff6b35" />
              </View>
              <View style={styles.sizeDetails}>
                <Text style={styles.sizeValue}>{item.value}</Text>

              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSize(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sizesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="resize-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Nema veličina</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Pokušajte drugu pretragu' : 'Dodajte prvu veličinu iznad'}
            </Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 36,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
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
  addSizeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  addSizeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addSizeInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#ff6b35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sizesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  sizesCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  sizesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sizeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sizeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sizeDetails: {
    flex: 1,
  },
  sizeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
 
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 