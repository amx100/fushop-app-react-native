import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { ProductFormData, Category, SizeType } from '../../types/index';
import { Picker } from '@react-native-picker/picker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { generateSlugFromTitle } from '../../utils/utils';

const { width } = Dimensions.get('window');
const SPACING = 20;

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

const useSizes = () => {
  return useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });
};

export function ModernProductModal({
  visible,
  formData,
  isEditing,
  onClose,
  onSubmit,
  onChange,
  onPickImage,
  categories
}: ProductModalProps) {
  const [scrollY] = useState(new Animated.Value(0));
  const [searchCategory, setSearchCategory] = useState('');
  const [newSize, setNewSize] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [sizeError, setSizeError] = useState<string>('');
  const { data: allCategories } = useCategories();
  const { data: sizes, isLoading: sizesLoading } = useSizes();

  // Animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 100],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp'
  });

  const handleAddSize = () => {
    if (!newSize || !newQuantity) {
      setSizeError('Please fill in both size and quantity');
      return;
    }

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setSizeError('Please enter a valid quantity');
      return;
    }

    // Check if size already exists
    const sizeExists = formData.sizes?.some(s => s.size === newSize);
    if (sizeExists) {
      setSizeError(`Size ${newSize} is already added`);
      return;
    }

    const currentSizes = formData.sizes || [];
    onChange({
      sizes: [...currentSizes, { 
        size: newSize as SizeType, 
        quantity, 
        id: 0, 
        product_id: 0, 
        size_id: 0, 
        created_at: '' 
      }]
    });

    setNewSize('');
    setNewQuantity('');
    setSizeError('');
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = formData.sizes?.filter(s => s.size !== sizeToRemove) || [];
    onChange({ sizes: newSizes });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.category || !formData.heroImage || !formData.sizes?.length) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const finalFormData = {
        ...formData,
        slug: !isEditing ? generateSlugFromTitle(formData.title) : formData.slug,
        imagesUrl: formData.imagesUrl || [],
      };
      
      await onSubmit(finalFormData);
      onClose();
    } catch (error) {
      alert('Error saving product: ' + (error as Error).message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.header, { height: headerHeight, opacity: headerOpacity }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Product' : 'New Product'}
          </Text>
        </Animated.View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
        >
          <TouchableOpacity onPress={onPickImage} style={styles.imageContainer}>
            {formData.heroImage ? (
              <Image
                source={{ uri: formData.heroImage }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={40} color="#666" />
                <Text style={styles.placeholderText}>Add Product Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => onChange({ title: text })}
                placeholder="Enter product name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={formData.price?.toString()}
                onChangeText={(text) => onChange({ price: Number(text) || 0 })}
                placeholder="Enter price"
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.sizesContainer}>
              <Text style={styles.sectionTitle}>Sizes & Stock</Text>
              <View style={styles.sizeInputGroup}>
                <Picker
                  selectedValue={newSize}
                  onValueChange={setNewSize}
                  style={styles.sizePicker}
                >
                  <Picker.Item label="Select size" value="" />
                  {sizes?.map((size) => (
                    <Picker.Item 
                      key={size.id} 
                      label={size.value} 
                      value={size.value} 
                    />
                  ))}
                </Picker>
                <TextInput
                  style={styles.quantityInput}
                  value={newQuantity}
                  onChangeText={setNewQuantity}
                  placeholder="Qty"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddSize}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {sizeError ? <Text style={styles.errorText}>{sizeError}</Text> : null}

              <View style={styles.sizesList}>
                {formData.sizes?.map((size) => (
                  <Animated.View
                    key={size.size}
                    style={styles.sizeItem}
                  >
                    <Text style={styles.sizeText}>{size.size}</Text>
                    <Text style={styles.quantityText}>{size.quantity}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => size.size && handleRemoveSize(size.size)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>

            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TextInput
                style={styles.searchInput}
                value={searchCategory}
                onChangeText={setSearchCategory}
                placeholder="Search categories..."
                placeholderTextColor="#666"
              />
              <View style={styles.categoriesList}>
                {allCategories?.filter(cat =>
                  cat.name.toLowerCase().includes(searchCategory.toLowerCase())
                ).map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      formData.category === category.id && styles.selectedCategoryChip
                    ]}
                    onPress={() => onChange({ category: category.id })}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      formData.category === category.id && styles.selectedCategoryChipText
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Animated.ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButton}>
              {isEditing ? 'Update' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: SPACING,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING * 2,
    right: SPACING,
    zIndex: 1,
  },
  scrollContent: {
    padding: SPACING,
  },
  imageContainer: {
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: SPACING,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: SPACING,
    marginBottom: SPACING,
  },
  inputGroup: {
    marginBottom: SPACING,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  sizesContainer: {
    marginBottom: SPACING,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sizeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sizePicker: {
    flex: 2,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 5,
  },
  sizesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  sizeItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 8,
  },
  categoriesSection: {
    marginBottom: SPACING,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryChip: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
});