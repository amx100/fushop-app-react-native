import React from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, Animated, Dimensions, KeyboardAvoidingView, Platform, Easing } from 'react-native';
import { CategoryFormData } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type CategoryModalProps = {
  visible: boolean;
  formData: CategoryFormData;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (data: Partial<CategoryFormData>) => void;
  onPickImage: () => void;
};

const { width, height } = Dimensions.get('window');

export function CategoryModal({
  visible,
  formData,
  isEditing,
  onClose,
  onSubmit,
  onChange,
  onPickImage,
}: CategoryModalProps) {
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Ionicons 
                  name={isEditing ? "pencil" : "add-circle"} 
                  size={24} 
                  color="#ff6b35" 
                />
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Izmeni Kategoriju' : 'Kreiraj Novu Kategoriju'}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Naziv Kategorije</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Unesite naziv kategorije"
                  placeholderTextColor="#9ca3af"
                  value={formData.name}
                  onChangeText={(text) => onChange({ name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Slug Kategorije</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Unesite slug kategorije (npr., electronics)"
                  placeholderTextColor="#9ca3af"
                  value={formData.slug}
                  onChangeText={(text) => onChange({ slug: text })}
                />
              </View>

              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Slika Kategorije</Text>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={onPickImage}
                >
                  <Ionicons name="image-outline" size={24} color="#ff6b35" />
                  <Text style={styles.imageButtonText}>Izaberi Sliku</Text>
                </TouchableOpacity>
                {formData.imageurl && (
                  <Text style={styles.imagePreviewText}>Slika izabrana ✓</Text>
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Odustani</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={onSubmit}
              >
                <Ionicons 
                  name={isEditing ? "checkmark" : "add"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Izmeni' : 'Kreiraj'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    minHeight: height * 0.6,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  imageSection: {
    marginBottom: 24,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f0',
    borderWidth: 2,
    borderColor: '#ff6b35',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff6b35',
  },
  imagePreviewText: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 