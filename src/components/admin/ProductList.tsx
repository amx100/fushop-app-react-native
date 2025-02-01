import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Product } from '../../types';
import RemoteImage from '../RemoteImage';
// ... import other necessary components

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
};

export function ProductList({ products, isLoading, onEdit, onDelete, onCreateNew }: ProductListProps) {
  return (
    <ScrollView style={styles.productList}>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={onCreateNew}
      >
        <Text style={styles.buttonText}>Create New Product</Text>
      </TouchableOpacity>

      {isLoading ? (
        <Text>Loading products...</Text>
      ) : (
        products?.map((product) => (
          <View key={product.id} style={styles.productItem}>
            <View style={styles.productHeader}>
              {product.heroImage ? (
                <RemoteImage 
                  path={product.heroImage}
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
  
              </View>
            </View>
            <View style={styles.productActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => onEdit(product)}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onDelete(product.id)}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
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
      backgroundColor: '#4CAF50',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 20,
    },
    productList: {
      flex: 1,
      marginBottom: 20,
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
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 15,
    },
    noImage: {
      width: 80,
      height: 80,
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
      backgroundColor: '#2196F3',
    },
    deleteButton: {
      backgroundColor: '#f44336',
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
  }); 