import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Animated, Dimensions } from 'react-native';
import { Category } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type CategoryListProps = {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
};

const { width } = Dimensions.get('window');

export function CategoryList({ categories, isLoading, onEdit, onDelete }: CategoryListProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No Categories Found</Text>
        <Text style={styles.emptySubtitle}>Create your first category to get started</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.categoriesGrid}>
        {categories.map((category, index) => (
          <Animated.View 
            key={category.id} 
            style={[
              styles.categoryCard,
              {
                transform: [{ 
                  translateY: new Animated.Value(0).interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.categoryImageContainer}>
              <Image 
                source={{ uri: category.imageurl || 'https://via.placeholder.com/120x120/cccccc/666666?text=No+Image' }} 
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <View style={styles.categoryOverlay}>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onEdit(category)}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => onDelete(category.id)}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName} numberOfLines={1}>
                {category.name || 'Unnamed Category'}
              </Text>
              <Text style={styles.categorySlug} numberOfLines={1}>
                {category.slug}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 40,
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
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
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
    overflow: 'hidden',
  },
  categoryImageContainer: {
    position: 'relative',
    height: 120,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  categoryInfo: {
    padding: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  categorySlug: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
}); 