import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Toast } from 'react-native-toast-notifications';
import { Database } from '../../types/database.types';

interface Size {
  id: number;
  value: string;
  created_at: string;
}

export default function SizeManagement() {
  const [newSize, setNewSize] = useState('');
  const queryClient = useQueryClient();

  const { data: sizes, isLoading } = useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('id, value, created_at')
        .order('value');
      
      if (error) throw error;
      return data as Size[];
    }
  });

  const handleAddSize = async () => {
    if (!newSize.trim()) {
      Toast.show('Size value cannot be empty', { type: 'warning' });
      return;
    }

    try {
      const { error } = await supabase
        .from('sizes')
        .insert([{ 
          value: newSize.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      Toast.show('Size added successfully', { type: 'success' });
      setNewSize('');
      await queryClient.invalidateQueries({ queryKey: ['sizes'] });
    } catch (error) {
      Toast.show('Error adding size: ' + (error as Error).message, { type: 'error' });
    }
  };

  const handleDeleteSize = async (id: number) => {
    Alert.alert(
      'Delete Size',
      'Are you sure you want to delete this size? This will affect all products using this size.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sizes')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Toast.show('Size deleted successfully', { type: 'success' });
              await queryClient.invalidateQueries({ queryKey: ['sizes'] });
            } catch (error) {
              Toast.show('Error deleting size: ' + (error as Error).message, { type: 'error' });
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Size Management</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newSize}
          onChangeText={setNewSize}
          placeholder="Enter new size (e.g., S, M, 42, XL)"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddSize}>
          <Text style={styles.buttonText}>Add Size</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sizes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.sizeItem}>
            <Text style={styles.sizeValue}>{item.value}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSize(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sizeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sizeValue: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
  },
}); 