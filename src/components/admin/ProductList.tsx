import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Product } from '../../types';
import RemoteImage from '../RemoteImage';
import Icon from '@rneui/themed/dist/Icon';
import React, { memo, useCallback } from 'react';

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
};

// Memoized ProductItem component to prevent unnecessary re-renders
const ProductItem = memo(({ 
  product, 
  onEdit, 
  onDelete 
}: { 
  product: Product; 
  onEdit: (product: Product) => void; 
  onDelete: (id: number) => void; 
}) => (
  <View style={styles.productItem}>
    <View style={styles.productHeader}>
      {product.heroimage ? (
        <RemoteImage 
          path={product.heroimage}
          fallback="https://placehold.co/80x80"
          style={styles.productImage}
        />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>Price: ${product.price}</Text>
        
        <View style={styles.sizesContainer}>
          <Text style={styles.sizesTitle}>Available Sizes:</Text>
          <View style={styles.sizesGrid}>
            {product.sizes?.map((size) => (
              <View key={size.id} style={styles.sizeItem}>
                <Text style={styles.sizeText}>
                  {size.size}: {size.quantity}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
    <View style={styles.productStatusContainer}>
      <Text style={styles.productStatusLabel}>Status:</Text>
      <View 
        style={[
          styles.productStatusBadge, 
          product.status === 'available' 
            ? styles.availableStatus 
            : styles.outOfStockStatus
        ]}
      >
        <Text style={styles.productStatusText}>
          {product.status === 'available' ? 'Available' : 'Out of Stock'}
        </Text>
      </View>
    </View>
    <View style={styles.productActions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => onEdit(product)}
      >
        <Icon name="edit" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => onDelete(product.id)}
      >
        <Icon name="delete" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

// Header component for the create button
const ListHeader = memo(({ onCreateNew }: { onCreateNew: () => void }) => (
  <TouchableOpacity 
    style={styles.createButton}
    onPress={onCreateNew}
  >
    <Text style={styles.buttonText}>Create New Product</Text>
  </TouchableOpacity>
));

// Footer component for loading indicator
const ListFooter = memo(({ isLoading }: { isLoading: boolean }) => (
  isLoading ? (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Loading more products...</Text>
    </View>
  ) : null
));

export function ProductList({ products, isLoading, onEdit, onDelete, onCreateNew }: ProductListProps) {
  // Memoized render function to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      product={item} 
      onEdit={onEdit} 
      onDelete={onDelete} 
    />
  ), [onEdit, onDelete]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Product) => item.id.toString(), []);

  // Get item layout for better performance (if all items have same height)
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate height of each product item
    offset: 200 * index,
    index,
  }), []);

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListHeaderComponent={<ListHeader onCreateNew={onCreateNew} />}
      ListFooterComponent={<ListFooter isLoading={isLoading} />}
      style={styles.productList}
      contentContainerStyle={styles.productListContent}
      removeClippedSubviews={true} // Remove off-screen items from memory
      maxToRenderPerBatch={10} // Render 10 items per batch
      updateCellsBatchingPeriod={50} // Update every 50ms
      initialNumToRender={10} // Initial render count
      windowSize={10} // Keep 10 screens worth of items in memory
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      disableVirtualization={false}
      legacyImplementation={false}
    />
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 20,
    },
    createButton: {
      backgroundColor: '#13293D',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 20,
    },
    productList: {
      flex: 1,
      marginBottom: 20,
    },
    productListContent: {
      paddingBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingFooter: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
    },
    productItem: {
      padding: 15,
      borderRadius: 8,
      backgroundColor: '#f5f5f5',
      marginBottom: 10,
    },
    productHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    productImage: {
      width: 100,
      height: 100,
      borderRadius: 8,
      marginRight: 15,
    },
    noImage: {
      width: 100,
      height: 100,
      borderRadius: 8,
      backgroundColor: '#ddd',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    noImageText: {
      color: '#666',
      fontSize: 12,
    },
    productInfo: {
      flex: 1,
    },
    productTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    productPrice: {
      fontSize: 16,
      color: '#666',
      marginBottom: 3,
    },
    productQuantity: {
      fontSize: 16,
      color: '#666',
    },
    productActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
    },
    actionButton: {
      padding: 8,
      borderRadius: 4,
      marginLeft: 10,
      minWidth: 70,
      alignItems: 'center',
    },
    editButton: {
      backgroundColor: '#B3A394',
    },
    deleteButton: {
      backgroundColor: '#D64933',
    },
    signOutButton: {
      backgroundColor: '#d32f2f',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalContainer: {
      flex: 1,
      padding: 20,
      backgroundColor: '#fff',
    },
    modalTitle: {
      top: 50,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    input: {
      top: 50,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      fontSize: 16,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      top:50,
      padding: 15,
      borderRadius: 8,
      flex: 0.48,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: '#9e9e9e',
    },
    saveButton: {
      backgroundColor: '#4CAF50',
    },
    imageUploadContainer: {
      top: 50,
      alignItems: 'center',
      marginBottom: 20,
      width: '100%',
    },
    previewImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 10,
      backgroundColor: '#f0f0f0',
    },
    imagePlaceholder: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    placeholderText: {
      color: '#666',
      fontSize: 16,
    },
    imageUploadButton: {
      backgroundColor: '#2196F3',
      padding: 12,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    changeImageButton: {
      backgroundColor: '#1976D2',
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    tab: {
      flex: 1,
      padding: 15,
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      marginHorizontal: 5,
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: '#2196F3',
    },
    tabText: {
      fontSize: 16,
      color: '#666',
    },
    activeTabText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    orderList: {
      flex: 1,
      marginBottom: 20,
    },
    orderItem: {
      padding: 15,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      marginBottom: 10,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    orderTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    orderDate: {
      color: '#666',
    },
    orderPrice: {
      fontSize: 16,
      color: '#666',
      marginBottom: 10,
    },
    orderStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    orderStatusLabel: {
      fontSize: 16,
      marginRight: 10,
    },
    statusBadge: {
      padding: 5,
      borderRadius: 4,
      minWidth: 80,
      alignItems: 'center',
    },
    statusBadge_Pending: {
      backgroundColor: '#ffcc00',
    },
    statusBadge_Completed: {
      backgroundColor: '#4caf50',
    },
    statusBadge_Shipped: {
      backgroundColor: '#2196f3',
    },
    statusBadge_InTransit: {
      backgroundColor: '#ff9800',
    },
    statusText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    statusButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statusButton: {
      padding: 8,
      borderRadius: 4,
      minWidth: 70,
      alignItems: 'center',
    },
    statusButtonDisabled: {
      opacity: 0.5,
    },
    statusButton_Pending: {
      backgroundColor: '#ffcc00',
    },
    statusButton_Completed: {
      backgroundColor: '#4caf50',
    },
    statusButton_Shipped: {
      backgroundColor: '#2196f3',
    },
    statusButton_InTransit: {
      backgroundColor: '#ff9800',
    },
    statusButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    sizesContainer: {
      marginTop: 8,
    },
    sizesTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#666',
      marginBottom: 4,
    },
    sizesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    sizeItem: {
      backgroundColor: '#e3e3e3',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    sizeText: {
      fontSize: 12,
      color: '#333',
    },
    productStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    productStatusLabel: {
      marginRight: 10,
      fontWeight: 'bold',
    },
    productStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
    },
    availableStatus: {
      backgroundColor: '#4CAF50',
    },
    outOfStockStatus: {
      backgroundColor: '#F44336',
    },
    productStatusText: {
      color: 'white',
      fontWeight: 'bold',
    },
  }); 