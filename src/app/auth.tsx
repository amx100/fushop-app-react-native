import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { authSchema, registrationSchema } from '../lib/auth';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loginForm = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registrationForm = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  const handleLogin = async (data: any) => {
    try {
      setIsLoading(true);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      Alert.alert('Uspeh', 'Prijavljeni ste!');
      router.replace('/(shop)');
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (data: any) => {
    try {
      setIsLoading(true);
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Create user profile in users table
      if (authData.user) {
        // Check if user profile already exists to avoid duplicate key errors
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (!existingUser) {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: data.email,
              name: data.firstName,
              last_name: data.lastName,
              type: 'customer',
            });

          if (profileError) {
            // If it's a duplicate key error, the user might already exist
            if (profileError.code === '23505') {
              Alert.alert('Greška', 'Nalog sa ovim email-om već postoji. Pokušajte da se prijavite.');
              return;
            }
            // For other profile errors, still show success for auth but warn about profile
            Alert.alert('Upozorenje', 'Nalog je kreiran, ali postoji problem sa vašim profilom. Molimo vas da kontaktirate podršku.');
          }
        }
      }

      Alert.alert('Uspeh', 'Nalog je kreiran! Molimo vas da proverite svoj email da biste verifikovali nalog.');
      router.replace('/(shop)');
    } catch (error: any) {
      // Handle specific Supabase auth errors
      if (error?.message?.includes('already registered')) {
        Alert.alert('Greška', 'Nalog sa ovim email-om već postoji. Pokušajte da se prijavite.');
      } else {
        Alert.alert('Greška', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    loginForm.reset();
    registrationForm.reset();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ff9a56', '#ff6b35']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Dobrodošli' : 'Kreirajte nalog'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Prijavite se da biste nastavili' : 'Kreirajte nalog da biste započeli'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {isLogin ? (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Controller
                      control={loginForm.control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Unesite email"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                      )}
                    />
                  </View>
                  {loginForm.formState.errors.email && (
                    <Text style={styles.errorText}>{loginForm.formState.errors.email.message}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Controller
                      control={loginForm.control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your password"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry
                          autoComplete="password"
                        />
                      )}
                    />
                  </View>
                  {loginForm.formState.errors.password && (
                    <Text style={styles.errorText}>{loginForm.formState.errors.password.message}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={loginForm.handleSubmit(handleLogin)}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#ff6b35', '#ff4757']}
                    style={styles.submitButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.submitButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>First Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                      <Controller
                        control={registrationForm.control}
                        name="firstName"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="First name"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="words"
                            autoComplete="given-name"
                          />
                        )}
                      />
                    </View>
                    {registrationForm.formState.errors.firstName && (
                      <Text style={styles.errorText}>{registrationForm.formState.errors.firstName.message}</Text>
                    )}
                  </View>

                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                      <Controller
                        control={registrationForm.control}
                        name="lastName"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Last name"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize="words"
                            autoComplete="family-name"
                          />
                        )}
                      />
                    </View>
                    {registrationForm.formState.errors.lastName && (
                      <Text style={styles.errorText}>{registrationForm.formState.errors.lastName.message}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Controller
                      control={registrationForm.control}
                      name="email"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your email"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                        />
                      )}
                    />
                  </View>
                  {registrationForm.formState.errors.email && (
                    <Text style={styles.errorText}>{registrationForm.formState.errors.email.message}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Controller
                      control={registrationForm.control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your password"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry
                          autoComplete="new-password"
                        />
                      )}
                    />
                  </View>
                  {registrationForm.formState.errors.password && (
                    <Text style={styles.errorText}>{registrationForm.formState.errors.password.message}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Potvrdite lozinku</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Controller
                      control={registrationForm.control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Potvrdite lozinku"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry
                          autoComplete="new-password"
                        />
                      )}
                    />
                  </View>
                  {registrationForm.formState.errors.confirmPassword && (
                    <Text style={styles.errorText}>{registrationForm.formState.errors.confirmPassword.message}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={registrationForm.handleSubmit(handleRegistration)}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#ff6b35', '#ff4757']}
                    style={styles.submitButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.submitButtonText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.switchButton} onPress={toggleMode}>
              <Text style={styles.switchButtonText}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  form: {
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  switchButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '500',
  },
});
