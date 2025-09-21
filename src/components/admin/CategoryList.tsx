import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Category } from '../../types';

type CategoryListProps = {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
};

export function CategoryList({ categories, isLoading, onEdit, onDelete }: CategoryListProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {categories.map((category) => (
        <View key={category.id} style={styles.categoryItem}>
          <Image 
            source={{ uri: category.imageurl || 'https://via.placeholder.com/50x50/cccccc/666666?text=No+Image' }} 
            style={styles.categoryImage} 
          />
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{category.name || 'Unnamed Category'}</Text>
            <Text style={styles.categorySlug}>{category.slug}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => onEdit(category)}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => onDelete(category.id)}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categorySlug: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
}); 