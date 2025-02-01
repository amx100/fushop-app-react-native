import { Session } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

type AuthData = {
  session: Session | null;
  isLoading: boolean;
  user: any;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthData>({
  session: null,
  isLoading: true,
  user: null,
  signOut: async () => {},
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<{
    avatar_url: string;
    created_at: string | null;
    email: string;
    expo_notification_token: string | null;
    id: string;
    stripe_customer_id: string | null;
    type: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const signOut = async () => {
    try {
      // Get current session before signing out
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        // If no session, just clear the state
        setSession(null);
        setUser(null);
        return;
      }

      // Attempt to sign out
      await supabase.auth.signOut();
      
      // Clear state regardless of signout success
      setSession(null);
      setUser(null);
      
    } catch (error) {
      console.error('Error in signOut:', error);
      Alert.alert('Error', 'Failed to sign out completely. Please restart the app.');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user?.id) {
            await fetchUserData(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, 'Session:', currentSession?.user?.id);
        
        if (mounted) {
          setSession(currentSession);
          
          if (event === 'SIGNED_OUT' || !currentSession) {
            setUser(null);
          } else if (currentSession?.user?.id) {
            await fetchUserData(currentSession.user.id);
          }
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
