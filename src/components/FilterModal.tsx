import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tables } from '../types/database.types';
import { useSizes } from '../hooks/useSizes';

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  categories: Tables<'category'>[];
  onApplyFilters: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export interface FilterState {
  categories: number[];
  priceRange: {
    min: number;
    max: number;
  };
  sizes: string[];
  sortBy: 'name' | 'price_asc' | 'price_desc' | 'created_at';
  inStock: boolean;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isVisible,
  onClose,
  categories,
  onApplyFilters,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterState>(currentFilters);
  const { data: sizes, isLoading: sizesLoading } = useSizes();

  const handleCategoryToggle = (categoryId: number) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleSizeToggle = (size: string) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      categories: [],
      priceRange: { min: 0, max: 5000 },
      sizes: [],
      sortBy: 'created_at',
      inStock: false,
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Filteri</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Resetuj</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cenonvi opseg</Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Minimalna cena</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange.min.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: value }
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <Text style={styles.priceSeparator}>-</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Maksimalna cena</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange.max.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 5000;
                    setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: value }
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="5000"
                />
              </View>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategorije</Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryToggle(category.id)}
              >
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={[
                  styles.checkbox,
                  filters.categories.includes(category.id) && styles.checkboxChecked
                ]}>
                  {filters.categories.includes(category.id) && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sizes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veličine</Text>
            <View style={styles.sizesContainer}>
              {sizesLoading ? (
                <Text style={styles.loadingText}>Učitavanje veličina...</Text>
              ) : (
                sizes?.map((size) => (
                  <TouchableOpacity
                    key={size.id}
                    style={[
                      styles.sizeButton,
                      filters.sizes.includes(size.value) && styles.sizeButtonSelected
                    ]}
                    onPress={() => handleSizeToggle(size.value)}
                  >
                    <Text style={[
                      styles.sizeButtonText,
                      filters.sizes.includes(size.value) && styles.sizeButtonTextSelected
                    ]}>
                      {size.value}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {/* Sort By */}
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sortiraj po</Text>
            {[
              { key: 'created_at', label: 'Najnovije prvo' },
              { key: 'name', label: 'Name A-Z' },
              { key: 'price_asc', label: 'Cena: Niska do visoka' },
              { key: 'price_desc', label: 'Cena: Visoka do niska' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortItem}
                onPress={() => handleSortChange(option.key as FilterState['sortBy'])}
              >
                <Text style={styles.sortText}>{option.label}</Text>
                <View style={[
                  styles.radio,
                  filters.sortBy === option.key && styles.radioChecked
                ]}>
                  {filters.sortBy === option.key && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* In Stock Only */}
          <View style={styles.section}>
            <View style={styles.switchItem}>
              <Text style={styles.switchLabel}>Samo na stanju</Text>
              <Switch
                value={filters.inStock}
                onValueChange={(value) => setFilters(prev => ({ ...prev, inStock: value }))}
                trackColor={{ false: '#e0e0e0', true: '#ff6b35' }}
                thumbColor={filters.inStock ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Primeni filtre</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resetText: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  sortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortText: {
    fontSize: 16,
    color: '#333',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioChecked: {
    borderColor: '#ff6b35',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b35',
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  applyButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  sizeButtonSelected: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  sizeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sizeButtonTextSelected: {
    color: 'white',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceInputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  priceSeparator: {
    fontSize: 18,
    color: '#666',
    marginHorizontal: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
