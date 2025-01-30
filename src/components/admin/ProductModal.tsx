import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { ProductFormData, Category, SizeType } from '../../types';
import RemoteImage from '../RemoteImage';
import { Picker } from '@react-native-picker/picker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { generateSlugFromTitle } from '../../utils/utils';

type ProductModalProps = {
  visible: boolean;
  formData: ProductFormData;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  onChange: (data: Partial<ProductFormData>) => void;
  onPickImage: () => void;
  categories: Category[];
};

const SIZES: SizeType[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

// Add this function to fetch categories
const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category')
        .select('*');
      
      if (error) throw error;
      return data as Category[];
    }
  });
};

export function ProductModal({ 
  visible, 
  formData, 
  isEditing, 
  onClose, 
  onSubmit, 
  onChange,
  onPickImage,
  categories
}: ProductModalProps) {
  const { data: allCategories, isLoading } = useCategories();
  const [searchCategory, setSearchCategory] = useState('');

  const filteredCategories = allCategories?.filter(category =>
    category.name.toLowerCase().includes(searchCategory.toLowerCase())
  );

  const handleSizeQuantityChange = (size: SizeType, quantity: number) => {
    const currentSizes = formData.sizes || [];
    const sizeIndex = currentSizes.findIndex(s => s.size === size);
    
    if (sizeIndex >= 0) {
      // Update existing size
      const newSizes = [...currentSizes];
      if (quantity <= 0) {
        // Remove size if quantity is 0 or negative
        newSizes.splice(sizeIndex, 1);
      } else {
        newSizes[sizeIndex] = { ...newSizes[sizeIndex], quantity };
      }
      onChange({ sizes: newSizes });
    } else if (quantity > 0) {
      // Add new size
      onChange({ sizes: [...currentSizes, { size, quantity, id: 0, product_id: 0, created_at: '' }] });
    }
  };


  const getSizeQuantity = (size: SizeType): number => {
    return formData.sizes?.find(s => s.size === size)?.quantity || 0;
  };

  const handleSubmit = async () => {
    console.log('Starting submit with formData:', formData);

    // Validation
    if (!formData.title.trim()) {
      console.log('Validation failed: Missing title');
      alert('Please enter a title');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      console.log('Validation failed: Invalid price', formData.price);
      alert('Please enter a valid price');
      return;
    }

    if (!formData.category || formData.category === 0) {
      console.log('Validation failed: Missing category', formData.category);
      alert('Please select a category');
      return;
    }
    if (!formData.heroImage) {
      console.log('Validation failed: Missing hero image');
      alert('Please upload an image');
      return;
    }
    if (!formData.sizes || formData.sizes.length === 0) {
      console.log('Validation failed: Missing sizes');
      alert('Please add at least one size with quantity');
      return;
    }

    try {
      // Generate unique slug if not editing
      if (!isEditing) {
        const uniqueSlug = generateSlugFromTitle(formData.title);
        console.log('Generated unique slug:', uniqueSlug);
        
        // Create new formData object with the unique slug
        const finalFormData = {
          ...formData,
          slug: uniqueSlug,
          imagesUrl: formData.imagesUrl || [], // Ensure imagesUrl is defined
        };
        
        console.log('Submitting with final form data:', finalFormData);
        
        // Call onSubmit directly with the final form data
        onSubmit(finalFormData);
      } else {
        onSubmit(formData);
      }
      
      // Close modal after successful submission
      onClose();
    } catch (error) {
      console.error('Error in onSubmit:', error);
      alert('Error creating product: ' + (error as Error).message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit Product' : 'Create Product'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={formData.title}
            onChangeText={(text) => onChange({ title: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Price"
            value={formData.price ? formData.price.toString() : ''}
            onChangeText={(text) => onChange({ price: Number(text) || 0 })}
            keyboardType="numeric"
          />
          {/* Size Management Section */}
          <View style={styles.sizesContainer}>
            <Text style={styles.sectionTitle}>Sizes and Quantities</Text>
            <View style={styles.sizesGrid}>
              {SIZES.map((size) => (
                <View key={size} style={styles.sizeItem}>
                  <Text style={styles.sizeLabel}>{size}</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={getSizeQuantity(size).toString()}
                    onChangeText={(text) => 
                      handleSizeQuantityChange(size, parseInt(text) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              value={searchCategory}
              onChangeText={setSearchCategory}
              placeholderTextColor="#666"
            />
            {searchCategory !== '' && (
              <TouchableOpacity onPress={() => setSearchCategory('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.categoriesContainer}>
            {filteredCategories?.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  formData.category === category.id && styles.selectedCategory
                ]}
                onPress={() => onChange({ category: category.id })}
              >
                <Text style={[
                  styles.categoryText,
                  formData.category === category.id && styles.selectedCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.imageUploadContainer}>
            {formData.heroImage ? (
              <Image 
                source={{ uri: formData.heroImage }} 
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.imageUploadButton,
                formData.heroImage ? styles.changeImageButton : null
              ]}
              onPress={onPickImage}
            >
              <Text style={styles.buttonText}>
                {formData.heroImage ? 'Change Image' : 'Upload Image'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>
              {isEditing ? 'Update' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  input: {
    top: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    height: 50, // Ensures consistent height
    width: '100%', // Matches width with searchInput
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40, // Extra padding for the bottom
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  pickerContainer: {
    top: 50,
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  searchContainer: {
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    height: 50, // Consistent height
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    height: '100%', // Matches container height
    color: '#333',
  },
  categoriesContainer: {
    top: 50,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryItem: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategory: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  modalTitle: {
    top: 50,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  sizesContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  sizeItem: {
    width: '30%',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  quantityInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    textAlign: 'center',
  },
});
