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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const useSizes = () => {
  return useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sizes').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
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
  const [scrollY] = useState(new Animated.Value(0));
  const [searchCategory, setSearchCategory] = useState('');
  const [newSize, setNewSize] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [sizeError, setSizeError] = useState<string>('');
  const { data: allCategories } = useCategories();
  const { data: sizes } = useSizes();

  // Animacija zaglavlja pri scrollanju
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [240, 120],
    extrapolate: 'clamp'
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp'
  });

  const handleAddSize = () => {
    if (!newSize || !newQuantity) {
      setSizeError('Molimo unesite veličinu i količinu');
      return;
    }
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setSizeError('Unesite valjanu količinu');
      return;
    }
    const sizeExists = formData.sizes?.some(s => s.size === newSize);
    if (sizeExists) {
      setSizeError(`Veličina ${newSize} već postoji`);
      return;
    }
    const currentSizes = formData.sizes || [];
    onChange({
      sizes: [
        ...currentSizes,
        { 
          size: newSize as SizeType, 
          quantity, 
          id: 0, 
          product_id: 0, 
          size_id: 0, 
          created_at: '' 
        }
      ]
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
      alert('Molimo popunite sva obavezna polja');
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
      console.error('Greška prilikom spremanja proizvoda:', error);
      alert('Greška: ' + (error as Error).message);
    }
  };

  const handlePickImage = async () => {
    try {
      const uploadedUrl = await onPickImage();
      if (uploadedUrl) {
        onChange({ heroImage: '' });
        setTimeout(() => {
          onChange({ heroImage: uploadedUrl });
        }, 50);
      }
    } catch (error) {
      console.error('Greška pri odabiru slike:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <SafeAreaView style={styles.safeContainer}>
        <LinearGradient colors={['#8EC5FC', '#E0C3FC']} style={styles.fullScreen}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <Animated.View style={[styles.header, { height: headerHeight, opacity: headerOpacity }]}>
              <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill}>
                <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']} style={styles.headerGradient}>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={28} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{isEditing ? 'Uredi Proizvod' : 'Novi Proizvod'}</Text>
                </LinearGradient>
              </BlurView>
            </Animated.View>
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >
              {/* Sekcija: Slika */}
              <View style={styles.formSection}>
                <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
                  {formData.heroImage ? (
                    <Image source={{ uri: formData.heroImage }} style={styles.productImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialIcons name="add-a-photo" size={40} color="#888" />
                      <Text style={styles.placeholderText}>Dodaj sliku</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sekcija: Osnovni podaci */}
              <View style={styles.formSection}>
                <Text style={styles.sectionHeader}>Osnovni podaci</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Naziv proizvoda</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.title}
                      onChangeText={(text) => onChange({ title: text })}
                      placeholder="Unesite naziv proizvoda"
                      placeholderTextColor="#AAA"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Cijena</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.price?.toString()}
                      onChangeText={(text) => onChange({ price: Number(text) || 0 })}
                      placeholder="Unesite cijenu"
                      keyboardType="numeric"
                      placeholderTextColor="#AAA"
                    />
                  </View>
                </View>
              </View>

              {/* Sekcija: Veličine i zalihe */}
              <View style={styles.formSection}>
                <Text style={styles.sectionHeader}>Veličine i zalihe</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Veličina</Text>
                    <Picker selectedValue={newSize} onValueChange={setNewSize} style={styles.picker}>
                      {sizes?.map((size) => (
                        <Picker.Item key={size.id} label={size.value} value={size.value} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Količina</Text>
                    <TextInput
                      style={styles.input}
                      value={newQuantity}
                      onChangeText={setNewQuantity}
                      placeholder="Unesite količinu"
                      keyboardType="numeric"
                      placeholderTextColor="#AAA"
                    />
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddSize}>
                    <Ionicons name="add" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                {sizeError ? <Text style={styles.errorText}>{sizeError}</Text> : null}
                <View style={styles.sizesList}>
                  {formData.sizes?.map((size) => (
                    <View key={size.size} style={styles.sizeItem}>
                      <Text style={styles.sizeText}>{size.size} :</Text>
                      <Text style={styles.quantityText}>{size.quantity}</Text>
                      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveSize(size.size || '')}>
                        <Ionicons name="trash-outline" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Sekcija: Kategorije */}
              <View style={styles.formSection}>
                <Text style={styles.sectionHeader}>Kategorija</Text>
                <TextInput
                  style={styles.input}
                  value={searchCategory}
                  onChangeText={setSearchCategory}
                  placeholder="Pretraži kategorije..."
                  placeholderTextColor="#AAA"
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
                      onPress={() => {
                        onChange({ 
                          category: formData.category === category.id ? undefined : category.id 
                        });
                      }}
                    >
                      <Text 
                        style={[
                          styles.categoryChipText,
                          formData.category === category.id && styles.selectedCategoryChipText
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.ScrollView>

            {/* Footer s akcijskim gumbima */}
            <View style={styles.footer}>
              <TouchableOpacity style={[styles.footerButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.footerButtonText}>Odustani</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerButton, styles.submitButton]} onPress={handleSubmit}>
                <Text style={styles.footerButtonText}>{isEditing ? 'Ažuriraj' : 'Kreiraj'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: SPACING,
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING,
    right: SPACING,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING,
    paddingBottom: SPACING * 3,
  },
  formSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: SPACING,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING / 2,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingBottom: SPACING / 2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING,
  },
  inputContainer: {
    flex: 1,
    minWidth: '48%',
    marginBottom: SPACING,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  picker: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  addButton: {
    marginBottom: 21,
    backgroundColor: '#34A853',
    padding: 12,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  errorText: {
    color: '#D93025',
    fontSize: 16,
    marginTop: 5,
  },
  sizesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: SPACING,
  },
  sizeItem: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#D93025',
    padding: 8,
    borderRadius: 15,
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: SPACING,
  },
  categoryChip: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  selectedCategoryChip: {
    backgroundColor: '#0073e6',
    borderColor: '#8EC5FC',
  },
  categoryChipText: {
    fontSize: 16,
    color: '#444',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#D93025',
  },
  submitButton: {
    backgroundColor: '#34A853',
  },
  footerButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
  imageContainer: {
    height: 260,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 30,
    marginBottom: SPACING,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 10,
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ModernProductModal;
