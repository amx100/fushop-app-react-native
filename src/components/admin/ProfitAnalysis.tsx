import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ProductCost {
  productId: number;
  cost: number;
}

interface ProfitStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

interface ProductProfit {
  product: Product;
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
}

interface ProfitAnalysisProps {
  products: Product[];
  isLoading: boolean;
}

const STORAGE_KEY = 'product_costs';

export default function ProfitAnalysis({ products, isLoading }: ProfitAnalysisProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [productCosts, setProductCosts] = useState<Record<number, number>>({});
  const [bulkCost, setBulkCost] = useState('');
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved costs on component mount
  useEffect(() => {
    loadSavedCosts();
  }, []);

  const loadSavedCosts = async () => {
    try {
      const savedCosts = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedCosts) {
        const costs = JSON.parse(savedCosts);
        setProductCosts(costs);
      }
    } catch (error) {
      console.error('Error loading saved costs:', error);
    }
  };

  const saveCosts = async (costs: Record<number, number>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
    } catch (error) {
      console.error('Error saving costs:', error);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const updateProductCost = (productId: number, cost: number) => {
    const newCosts = { ...productCosts, [productId]: cost };
    setProductCosts(newCosts);
    saveCosts(newCosts);
  };

  const applyBulkCost = () => {
    if (!bulkCost || isNaN(Number(bulkCost))) {
      Alert.alert('Greška', 'Unesite validnu cenu');
      return;
    }

    const cost = Number(bulkCost);
    const newCosts = { ...productCosts };
    
    selectedProducts.forEach(productId => {
      newCosts[productId] = cost;
    });

    setProductCosts(newCosts);
    saveCosts(newCosts);
    setBulkCost('');
    Alert.alert('Uspešno', 'Nabavne cene su ažurirane');
  };

  const clearAllCosts = () => {
    Alert.alert(
      'Obriši sve cene',
      'Da li ste sigurni da želite da obrišete sve nabavne cene?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            setProductCosts({});
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      ]
    );
  };

  // Calculate profit statistics
  const profitStats = useMemo((): ProfitStats => {
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
    
    let totalRevenue = 0;
    let totalCost = 0;

    selectedProductsData.forEach(product => {
      totalRevenue += product.price;
      totalCost += productCosts[product.id] || 0;
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin
    };
  }, [selectedProducts, products, productCosts]);

  // Calculate individual product profits
  const productProfits = useMemo((): ProductProfit[] => {
    return selectedProducts
      .map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;

        const cost = productCosts[productId] || 0;
        const revenue = product.price;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          product,
          cost,
          revenue,
          profit,
          margin
        };
      })
      .filter((item): item is ProductProfit => item !== null);
  }, [selectedProducts, products, productCosts]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      selectedProducts.length === 0 || selectedProducts.includes(product.id)
    );
  }, [products, selectedProducts]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Učitavanje proizvoda...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analiza profita</Text>
        <Text style={styles.subtitle}>Odaberite proizvode i unesite nabavne cene</Text>
      </View>

      {/* Profit Statistics - Moved to top */}
      {selectedProducts.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Statistike profita</Text>
          
          {/* Summary Stats - Improved design */}
          <View style={styles.summaryStats}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#2ECC71', '#27AE60']} style={styles.statGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-up" size={28} color="white" />
                </View>
                <Text style={styles.statNumber}>{profitStats.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.statCurrency}>RSD</Text>
                <Text style={styles.statLabel}>Ukupan prihod</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#E74C3C', '#C0392B']} style={styles.statGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-down" size={28} color="white" />
                </View>
                <Text style={styles.statNumber}>{profitStats.totalCost.toLocaleString()}</Text>
                <Text style={styles.statCurrency}>RSD</Text>
                <Text style={styles.statLabel}>Ukupan trošak</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#3498DB', '#2980B9']} style={styles.statGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="calculator" size={28} color="white" />
                </View>
                <Text style={styles.statNumber}>{profitStats.totalProfit.toLocaleString()}</Text>
                <Text style={styles.statCurrency}>RSD</Text>
                <Text style={styles.statLabel}>Ukupan profit</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#8E44AD', '#9B59B6']} style={styles.statGradient}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="analytics" size={28} color="white" />
                </View>
                <Text style={styles.statNumber}>{profitStats.profitMargin.toFixed(1)}</Text>
                <Text style={styles.statCurrency}>%</Text>
                <Text style={styles.statLabel}>Profitna marža</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Selection Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.selectionControls}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={selectAllProducts}
          >
            <Ionicons 
              name={selectedProducts.length === products.length ? "checkbox" : "square-outline"} 
              size={20} 
              color="#667eea" 
            />
            <Text style={styles.selectAllText}>
              {selectedProducts.length === products.length ? 'Odznači sve' : 'Označi sve'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.selectionCount}>
            Odabrano: {selectedProducts.length} od {products.length}
          </Text>
        </View>

        {selectedProducts.length > 0 && (
          <View style={styles.bulkControls}>
            <TextInput
              style={styles.bulkInput}
              placeholder="Unesite nabavnu cenu za sve odabrane"
              value={bulkCost}
              onChangeText={setBulkCost}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={applyBulkCost}
            >
              <Text style={styles.bulkButtonText}>Primeni</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Selected Products with Statistics */}
      {selectedProducts.length > 0 && (
        <View style={styles.selectedProductsContainer}>
          <Text style={styles.selectedProductsTitle}>Odabrani proizvodi sa statistikama</Text>
          {productProfits.map(({ product, cost, revenue, profit, margin }) => (
            <View key={product.id} style={styles.selectedProductCard}>
              <View style={styles.selectedProductHeader}>
                <TouchableOpacity
                  style={styles.productCheckbox}
                  onPress={() => toggleProductSelection(product.id)}
                >
                  <Ionicons 
                    name="checkbox" 
                    size={20} 
                    color="#667eea" 
                  />
                </TouchableOpacity>
                
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductTitle}>{product.title}</Text>
                  <Text style={styles.selectedProductPrice}>Prodajna: {revenue.toLocaleString()} RSD</Text>
                </View>

                <View style={styles.selectedProductStats}>
                  <Text style={[styles.selectedProductMargin, { 
                    color: margin >= 0 ? '#27AE60' : '#E74C3C' 
                  }]}>
                    {margin.toFixed(1)}%
                  </Text>
                  <Text style={[styles.selectedProductProfit, { 
                    color: profit >= 0 ? '#27AE60' : '#E74C3C' 
                  }]}>
                    {profit.toLocaleString()} RSD
                  </Text>
                </View>
              </View>

              <View style={styles.selectedProductDetails}>
                <View style={styles.costInputContainer}>
                  <Text style={styles.costLabel}>Nabavna cena:</Text>
                  <TextInput
                    style={styles.costInput}
                    value={cost.toString()}
                    onChangeText={(text) => {
                      const newCost = text === '' ? 0 : Number(text);
                      updateProductCost(product.id, newCost);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.costCurrency}>RSD</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Unselected Products */}
      {products.filter(p => !selectedProducts.includes(p.id)).length > 0 && (
        <View style={styles.unselectedProductsContainer}>
          <Text style={styles.unselectedProductsTitle}>Ostali proizvodi</Text>
          {products
            .filter(p => !selectedProducts.includes(p.id))
            .map(product => (
              <View key={product.id} style={styles.unselectedProductCard}>
                <TouchableOpacity
                  style={styles.productCheckbox}
                  onPress={() => toggleProductSelection(product.id)}
                >
                  <Ionicons 
                    name="square-outline" 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                <View style={styles.unselectedProductInfo}>
                  <Text style={styles.unselectedProductTitle}>{product.title}</Text>
                  <Text style={styles.unselectedProductPrice}>Prodajna cena: {product.price.toLocaleString()} RSD</Text>
                </View>
              </View>
            ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearAllCosts}
        >
          <Ionicons name="trash-outline" size={20} color="#E74C3C" />
          <Text style={styles.clearButtonText}>Obriši sve cene</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  controlsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea',
  },
  selectionCount: {
    fontSize: 14,
    color: '#6c757d',
  },
  bulkControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  bulkButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bulkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  productsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCheckbox: {
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#6c757d',
  },
  costInputContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#495057',
    marginRight: 8,
  },
  costInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    marginRight: 8,
  },
  costCurrency: {
    fontSize: 14,
    color: '#6c757d',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statCurrency: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  individualStats: {
    marginTop: 8,
  },
  individualStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  productStatCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productStatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  productStatMargin: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  productStatDetails: {
    gap: 4,
  },
  productStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productStatLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  productStatValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  clearButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#E74C3C',
  },
  // New styles for improved UI
  selectedProductsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  selectedProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  selectedProductCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  selectedProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedProductTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  selectedProductPrice: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectedProductStats: {
    alignItems: 'flex-end',
  },
  selectedProductMargin: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  selectedProductProfit: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedProductDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  unselectedProductsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  unselectedProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  unselectedProductCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  unselectedProductInfo: {
    flex: 1,
    marginLeft: 12,
  },
  unselectedProductTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  unselectedProductPrice: {
    fontSize: 12,
    color: '#6c757d',
  },
});
