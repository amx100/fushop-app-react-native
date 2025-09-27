import React, { useCallback } from 'react';
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
import { useForm, Controller, useController, UseControllerProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { authSchema, registrationSchema } from '../../lib/auth';
import { useAuth } from '../../providers/auth-provider';

// Memoized controlled input component to reduce re-renders and keep stable behaviour
type ControlledInputProps = {
  control: any;
  name: string;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  icon?: React.ReactNode;
  autoComplete?: string;
  textContentType?: any;
};

const ControlledInput = React.memo(function ControlledInput({
  control,
  name,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  icon,
  autoComplete,
  textContentType,
}: ControlledInputProps) {
  // useController gives a stable subscription to only this field (reduces re-renders)
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        {icon}
        <TextInput
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          placeholder={placeholder}
          style={styles.input}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete as any}
          textContentType={textContentType}
          // ensure caret stays (avoid uncontrolled issues)
        />
      </View>
      {error?.message && <Text style={styles.errorText}>{String(error.message)}</Text>}
    </View>
  );
}, (prev, next) => {
  // cheap props compare: if name or control changed re-render, otherwise skip
  return prev.name === next.name && prev.control === next.control;
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { session, user } = useAuth();

  // keep form values when inputs unmount (shouldUnregister: false)
  const loginForm = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
    shouldUnregister: false,
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
    mode: 'onBlur',
    shouldUnregister: false,
  });

  // redirect if already logged in
  React.useEffect(() => {
    if (session && user) {
      const isAdmin = (user as any)?.type === 'admin';
      if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/(shop)');
      }
    } else if (!session && !user) {
      // Reset forms when user logs out
      loginForm.reset({
        email: '',
        password: '',
      });
      registrationForm.reset({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      });
      setIsLogin(true); // Reset to login mode
    }
  }, [session, user, router, loginForm, registrationForm]);

  const handleLogin = useCallback(
    async (data: any) => {
      try {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        Alert.alert('Uspeh', 'Prijavljeni ste!');
        // navigation will be handled by auth state change effect
      } catch (err: any) {
        Alert.alert('Greška', err?.message ?? 'Nepoznata greška');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleRegistration = useCallback(
    async (data: any) => {
      try {
        setIsLoading(true);
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;

        if (authData?.user) {
          // Check if user profile already exists to avoid duplicate key errors
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', authData.user.id)
            .single();

          if (!existingUser) {
            const { error: profileError } = await supabase.from('users').insert({
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
              return;
            }
            // User profile created successfully
          } else {
            // User profile already exists, skipping creation
          }
        }

        Alert.alert('Uspeh', 'Nalog je kreiran! Molimo vas da proverite svoj email da biste verifikovali nalog.');
      } catch (err: any) {
        // Handle specific Supabase auth errors
        if (err?.message?.includes('already registered')) {
          Alert.alert('Greška', 'Nalog sa ovim email-om već postoji. Pokušajte da se prijavite.');
        } else {
          Alert.alert('Greška', err?.message ?? 'Nepoznata greška');
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const toggleMode = useCallback(() => {
    setIsLogin((s) => !s);
    // reset only when switching modes (keeps typing intact until switch)
    loginForm.reset({
      email: '',
      password: '',
    });
    registrationForm.reset({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    });
  }, [loginForm, registrationForm]);

  // loading screen while auth is present (keeps previous behaviour)
  if (session && user) {
    const isAdmin = (user as any)?.type === 'admin';
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#ff9a56', '#ff6b35']} style={styles.gradient}>
          <View style={styles.content}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.subtitle}>
              {isAdmin ? 'Redirecting to admin panel...' : 'Redirecting to home...'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#ff9a56', '#ff6b35']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{isLogin ? 'Dobrodošli' : 'Kreirajte nalog'}</Text>
            <Text style={styles.subtitle}>{isLogin ? 'Prijavite se da biste nastavili' : 'Kreirajte nalog da biste započeli'}</Text>
          </View>

          <View style={styles.formContainer}>
            {isLogin ? (
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <ControlledInput
                  control={loginForm.control}
                  name="email"
                  placeholder="Unesite email"
                  icon={<Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />

                <Text style={styles.label}>Lozinka</Text>
                <ControlledInput
                  control={loginForm.control}
                  name="password"
                  placeholder="Unesite lozinku"
                  icon={<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />}
                  secureTextEntry
                  autoComplete="password"
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={loginForm.handleSubmit(handleLogin)}
                  disabled={isLoading}
                >
                  <LinearGradient colors={['#ff6b35', '#ff4757']} style={styles.submitButtonGradient}>
                    {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Prijavite se</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={[styles.halfWidth]}>
                    <Text style={styles.label}>Ime</Text>
                    <ControlledInput
                      control={registrationForm.control}
                      name="firstName"
                      placeholder="Unesite svoje ime"
                      icon={<Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />}
                      autoCapitalize="words"
                      autoComplete="name-given"
                    />
                  </View>

                  <View style={[styles.halfWidth]}>
                    <Text style={styles.label}>Prezime</Text>
                    <ControlledInput
                      control={registrationForm.control}
                      name="lastName"
                      placeholder="Unesite svoje prezime"
                      icon={<Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />}
                      autoCapitalize="words"
                      autoComplete="name-family"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Email</Text>
                <ControlledInput
                  control={registrationForm.control}
                  name="email"
                  placeholder="Unesite email"
                  icon={<Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />

                  <Text style={styles.label}>Lozinka</Text>
                <ControlledInput
                  control={registrationForm.control}
                  name="password"
                  placeholder="Unesite lozinku"
                  icon={<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />}
                  secureTextEntry
                  autoComplete="password-new"
                />

                <Text style={styles.label}>Potvrdite lozinku</Text>
                <ControlledInput
                  control={registrationForm.control}
                  name="confirmPassword"
                  placeholder="Potvrdite lozinku"
                  icon={<Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />}
                  secureTextEntry
                  autoComplete="password-new"
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={registrationForm.handleSubmit(handleRegistration)}
                  disabled={isLoading}
                >
                  <LinearGradient colors={['#ff6b35', '#ff4757']} style={styles.submitButtonGradient}>
                    {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Sign Up</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.switchButton} onPress={toggleMode}>
              <Text style={styles.switchButtonText}>
                {isLogin ? "Nemate nalog? Kreirajte nalog" : "Već imate nalog? Prijavite se"}
              </Text>
            </TouchableOpacity>

            {session && (
              <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/(shop)/edit-profile')}>
                <Ionicons name="settings-outline" size={20} color="#ff6b35" />
                <Text style={styles.settingsButtonText}>Account Settings</Text>
              </TouchableOpacity>
            )}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowOffset: { width: 0, height: 2 },
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
    marginTop: 6,
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
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  settingsButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
