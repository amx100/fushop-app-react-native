import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import * as zod from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Authentication Schema
const authSchema = zod.object({
  email: zod.string().email('Invalid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});

export default function MorphismAuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSignIn = async (data: any) => {
    try {
      if (isLogin) {
        // Handle login
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        if (authData.session) {
          // Check user type
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('type')
            .eq('id', authData.session.user.id)
            .single();

          if (userError) throw userError;

          // Redirect based on user type
          if (userData?.type === 'ADMIN') {
            router.replace('/admin');
          } else {
            router.replace('/(shop)');
          }
        }
      } else {
        // Handle sign up
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        Alert.alert(
          "Success!",
          "Account created successfully! Please check your email for verification and sign in.",
          [{ text: "OK", onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        isLogin ? 'Login Failed' : 'Sign Up Failed',
        error.message
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#6a11cb', '#2575fc']}
        style={styles.background}
      >
        <BlurView 
          intensity={20}  
          style={styles.blurContainer}
        >
          <View style={styles.authContainer}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to continue' : 'Create an account'}
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.input}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.input}
                    onChangeText={onChange}
                    value={value}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSubmit(handleSignIn)}
            >
              <LinearGradient 
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} 
                style={styles.buttonBackground}
              >
                <Text style={styles.buttonText}>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchContainer}
            >
              <Text style={styles.switchText}>
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    width: width * 0.9,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  authContainer: {
    padding: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
    alignSelf: 'flex-start',
  },
  button: {
    width: '100%',
    marginTop: 10,
  },
  buttonBackground: {
    padding: 15,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.9,
  },
  switchContainer: {
    marginTop: 15,
  },
  switchText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});