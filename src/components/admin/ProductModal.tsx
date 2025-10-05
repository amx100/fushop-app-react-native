import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ProductFormData, Category, SizeType } from '../../types/index';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { generateSlugFromTitle } from '../../utils/utils';
import { useSizes } from '../../hooks/useSizes';

const { width, height } = Dimensions.get('window');

type ProductModalProps = {
  visible: boolean;
  formData: ProductFormData;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  onChange: (data: Partial<ProductFormData>) => void;
  onPickImage: () => Promise<string | null>;
  categories: Category[];
};

const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('category').select('*');
      if (error) throw error;
      return data as Category[];
    },
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
  const [searchCategory, setSearchCategory] = useState('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const titleInputRef = useRef<TextInput>(null);

  const { data: allCategories } = useCategories();
  const { data: sizes } = useSizes();

  useEffect(() => {
    if (visible && titleInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleAddSize = () => {
    if (!selectedSize || !newQuantity) {
      Alert.alert('Greška', 'Molimo odaberite veličinu i unesite količinu');
      return;
    }
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Greška', 'Unesite valjanu količinu');
      return;
    }
    const sizeExists = formData.sizes?.some(s => s.size === selectedSize);
    if (sizeExists) {
      Alert.alert('Greška', `Veličina ${selectedSize} već postoji`);
      return;
    }
    const currentSizes = formData.sizes || [];
    onChange({
      sizes: [
        ...currentSizes,
        { 
          size: selectedSize as SizeType, 
          quantity, 
          id: 0, 
          product_id: 0, 
          size_id: 0, 
          created_at: '' 
        }
      ]
    });
    setSelectedSize('');
    setNewQuantity('');
    setShowSizeDropdown(false);
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = formData.sizes?.filter(s => s.size !== sizeToRemove) || [];
    onChange({ sizes: newSizes });
  };

  const handleUpdateQuantity = (sizeToUpdate: string, newQuantity: number) => {
    const updatedSizes = formData.sizes?.map(s => 
      s.size === sizeToUpdate ? { ...s, quantity: newQuantity } : s
    ) || [];
    onChange({ sizes: updatedSizes });
  };

  const handleIncrementQuantity = (sizeToUpdate: string) => {
    const currentSize = formData.sizes?.find(s => s.size === sizeToUpdate);
    if (currentSize) {
      handleUpdateQuantity(sizeToUpdate, currentSize.quantity + 1);
    }
  };

  const handleDecrementQuantity = (sizeToUpdate: string) => {
    const currentSize = formData.sizes?.find(s => s.size === sizeToUpdate);
    if (currentSize && currentSize.quantity > 0) {
      handleUpdateQuantity(sizeToUpdate, currentSize.quantity - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.category || !formData.heroImage || !formData.sizes?.length) {
      Alert.alert('Greška', 'Molimo popunite sva obavezna polja');
      return;
    }
    
    setIsLoading(true);
    try {
      const finalFormData = {
        ...formData,
        slug: !isEditing ? generateSlugFromTitle(formData.title) : formData.slug,
        imagesUrl: formData.imagesUrl || [],
      };
      await onSubmit(finalFormData);
      onClose();
    } catch (error) {
      Alert.alert('Greška', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const uploadedUrl = await onPickImage();
      if (uploadedUrl) {
        onChange({ heroImage: uploadedUrl });
      }
    } catch (error) {
      Alert.alert('Greška', 'Nije moguće učitati sliku');
    }
  };

  const filteredCategories = allCategories?.filter(cat =>
    cat.name?.toLowerCase().includes(searchCategory.toLowerCase())
  ) || [];

  const SizeDropdown = () => (
    <Modal visible={showSizeDropdown} transparent animationType="fade">
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1}
        onPress={() => setShowSizeDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>Odaberite veličinu</Text>
          <FlatList
            data={sizes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedSize(item.value);
                  setShowSizeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{item.value}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <LinearGradient colors={['#ff9a56', '#ff6b35']} style={styles.gradient}>
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <BlurView intensity={95} tint="dark" style={styles.header}>
              <View style={styles.headerContent}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>
                    {isEditing ? 'Uredi proizvod' : 'Novi proizvod'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Unesite sve potrebne informacije
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {isLoading ? '...' : 'Spremi'}
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            {/* Content */}
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Main Content Grid */}
              <View style={styles.mainGrid}>
                
                {/* Left Column - Image & Basic Info */}
                <View style={styles.leftColumn}>
                  
                  {/* Image Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="image" size={18} color="#ff6b35" />
                      <Text style={styles.sectionTitle}>Slika proizvoda</Text>
                    </View>
                    
                    <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
                      {formData.heroImage ? (
                        <View style={styles.imageWrapper}>
                          <Image source={{ uri: formData.heroImage }} style={styles.productImage} />
                          <View style={styles.imageOverlay}>
                            <Feather name="edit-3" size={20} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <View style={styles.uploadIconContainer}>
                            <Feather name="upload" size={32} color="#ff6b35" />
                          </View>
                          <Text style={styles.uploadText}>Dodaj sliku</Text>
                          <Text style={styles.uploadSubtext}>Dodirnite za odabir</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Basic Info Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="edit-3" size={18} color="#ff6b35" />
                      <Text style={styles.sectionTitle}>Osnovni podaci</Text>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Naziv proizvoda *</Text>
                      <TextInput
                        ref={titleInputRef}
                        style={styles.textInput}
                        value={formData.title}
                        onChangeText={(text) => onChange({ title: text })}
                        placeholder="Unesite naziv proizvoda"
                        placeholderTextColor="#94a3b8"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Cijena (€) *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.price?.toString() || ''}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9.]/g, '');
                          onChange({ price: numericValue === '' ? undefined : parseFloat(numericValue) });
                        }}
                        placeholder="Unesite cijenu"
                        keyboardType="decimal-pad"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>

                {/* Right Column - Sizes & Categories */}
                <View style={styles.rightColumn}>
                  
                  {/* Sizes Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="package" size={18} color="#ff6b35" />
                      <Text style={styles.sectionTitle}>Veličine i zalihe</Text>
                    </View>
                    
                    <View style={styles.sizeInputContainer}>
                      <View style={styles.sizeInputRow}>
                        <TouchableOpacity 
                          style={styles.customDropdown}
                          onPress={() => setShowSizeDropdown(true)}
                        >
                          <Text style={[
                            styles.dropdownText, 
                            !selectedSize && styles.dropdownPlaceholder
                          ]}>
                            {selectedSize || 'Odaberite veličinu'}
                          </Text>
                          <Feather name="chevron-down" size={18} color="#ff6b35" />
                        </TouchableOpacity>
                        
                        <TextInput
                          style={styles.quantityInput}
                          value={newQuantity}
                          onChangeText={setNewQuantity}
                          placeholder="Količina"
                          keyboardType="numeric"
                          placeholderTextColor="#94a3b8"
                        />
                        
                        <TouchableOpacity style={styles.addButton} onPress={handleAddSize}>
                          <Feather name="plus" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.sizesGrid}>
                      {formData.sizes?.map((size, index) => (
                        <View key={`${size.size}-${index}`} style={styles.sizeCard}>
                          <View style={styles.sizeInfo}>
                            <Text style={styles.sizeText}>{size.size}</Text>
                          </View>
                          
                          <View style={styles.quantityControls}>
                            <TouchableOpacity 
                              style={[styles.quantityButton, size.quantity === 0 && styles.quantityButtonDisabled]}
                              onPress={() => handleDecrementQuantity(size.size || '')}
                              disabled={size.quantity === 0}
                            >
                              <Feather name="minus" size={14} color={size.quantity === 0 ? "#94a3b8" : "#ef4444"} />
                            </TouchableOpacity>
                            
                            <TextInput
                              style={styles.quantityInputField}
                              value={size.quantity.toString()}
                              onChangeText={(text) => {
                                const newQuantity = parseInt(text) || 0;
                                if (newQuantity >= 0) {
                                  handleUpdateQuantity(size.size || '', newQuantity);
                                }
                              }}
                              keyboardType="numeric"
                              textAlign="center"
                            />
                            
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => handleIncrementQuantity(size.size || '')}
                            >
                              <Feather name="plus" size={14} color="#10b981" />
                            </TouchableOpacity>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.removeSizeButton} 
                            onPress={() => handleRemoveSize(size.size || '')}
                          >
                            <Feather name="x" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Categories Section */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="tag" size={18} color="#ff6b35" />
                      <Text style={styles.sectionTitle}>Kategorija</Text>
                    </View>
                    
                    <TextInput
                      style={styles.searchInput}
                      value={searchCategory}
                      onChangeText={setSearchCategory}
                      placeholder="Pretraži kategorije..."
                      placeholderTextColor="#94a3b8"
                    />
                    
                    <View style={styles.categoriesGrid}>
                      {filteredCategories.slice(0, 8).map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryCard,
                            formData.category === category.id && styles.selectedCategoryCard
                          ]}
                          onPress={() => onChange({ 
                            category: formData.category === category.id ? undefined : category.id 
                          })}
                        >
                          <Text style={[
                            styles.categoryText,
                            formData.category === category.id && styles.selectedCategoryText
                          ]}>
                            {category.name || 'Unnamed'}
                          </Text>
                          {formData.category === category.id && (
                            <Feather name="check" size={14} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
        <SizeDropdown />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  mainGrid: {
    flexDirection: width > 600 ? 'row' : 'column',
    gap: 20,
  },
  leftColumn: {
    flex: width > 600 ? 1 : undefined,
    gap: 20,
  },
  rightColumn: {
    flex: width > 600 ? 1 : undefined,
    gap: 20,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#ff6b35',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  imageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  imageWrapper: {
    position: 'relative',
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 8,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  sizeInputContainer: {
    marginBottom: 16,
  },
  sizeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customDropdown: {
    flex: 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  quantityInputField: {
    width: 50,
    height: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  removeSizeButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCategoryCard: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: 300,
    width: '80%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default ModernProductModal;