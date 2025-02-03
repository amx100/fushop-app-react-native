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

  const onSubmit = async (data: any) => {
    try {
      if (isLogin) {
        // Handle login
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        if (authData.session) {
          // Successful login - redirect to shop
          router.replace('/(shop)');
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
          [
            {
              text: "OK",
              onPress: () => {
                setIsLogin(true); // Switch to login mode
              }
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "An error occurred during authentication",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={["#CE590A", "#F4C66F"]}
        style={styles.background}
      >
        {/* Blur Morphism Container */}
        <BlurView 
          intensity={40}  // Reduced intensity for more visibility
          style={styles.blurContainer}
          tint="dark"  // Added dark tint for more depth
        >
          <View style={styles.authContainer}>
            <Text style={styles.title}>
              {isLogin ? 'Dobrodošli' : 'Kreirajte nalog'}
            </Text>

            {/* Email Input */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Email Address"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Password Input */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.input}
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Action Buttons */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleSubmit(onSubmit)}
            >
              <Text style={styles.buttonText}>
                {isLogin ? 'Prijavite se' : 'Kreirajte nalog'}
              </Text>
            </TouchableOpacity>

            {/* Toggle Between Login/Signup */}
            <TouchableOpacity 
              onPress={() => setIsLogin(!isLogin)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {isLogin 
                  ? "Nemate nalog? Kreirajte nalog" 
                  : "Već imate nalog? Prijavite se"}
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
    backgroundColor: 'rgba(255,255,255,0.05)', 
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  authContainer: {
    padding: 25,
    backgroundColor: 'rgba(255,255,255,0.05)', 
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 25,
    opacity: 0.9,
  },
  inputContainer: {
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
  },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)', 
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.9,
  },
  toggleButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});