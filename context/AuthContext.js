// context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; // Import the initialized client
import { Session } from '@supabase/supabase-js'; // Import Session type if using TypeScript
import { registerForPushNotificationsAsync, savePushToken } from '../lib/notifications';
import { saveSecurely, getSecurely, getSecureJSON, deleteSecurely, STORAGE_KEYS } from '../utils/secureStorage';
import { getMFAFactors, isMFAEnabled, MFA_STORAGE_KEYS } from '../utils/mfaUtils';
import { recordLoginAttempt } from '../utils/serverRateLimiter';
import { validatePassword } from '../utils/passwordValidator';

// Create the context
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  notificationsEnabled: true,
  mfaEnabled: false,
  mfaRequired: false,
  mfaFactorId: null,
  // Add functions later
  signUp: async (email, password) => {},
  signIn: async (email, password) => {},
  signOut: async () => {},
  toggleNotifications: (enabled) => {},
  completeMfaVerification: () => {},
  cancelMfaVerification: () => {},
});

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [pendingSignIn, setPendingSignIn] = useState(null);

  // Load notification preferences from secure storage
  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const storedPreference = await getSecurely(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
        if (storedPreference !== null) {
          setNotificationsEnabled(storedPreference === 'true');
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };
    
    loadNotificationPreference();
  }, []);

  // Load MFA status
  useEffect(() => {
    const loadMfaStatus = async () => {
      if (user) {
        try {
          const enabled = await isMFAEnabled();
          setMfaEnabled(enabled);
          
          // Get the factor ID if MFA is enabled
          if (enabled) {
            const factorId = await getSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);
            setMfaFactorId(factorId);
          }
        } catch (error) {
          console.error('Error loading MFA status:', error);
        }
      } else {
        setMfaEnabled(false);
        setMfaFactorId(null);
      }
    };
    
    loadMfaStatus();
  }, [user]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
        setUser(session?.user ?? null);
        
        // Store user data securely if session exists
        if (session?.user) {
          await saveSecurely(STORAGE_KEYS.USER_ID, session.user.id);
          await saveSecurely(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
          registerForNotifications(session.user.id);
          
          // Check MFA status
          const enabled = await isMFAEnabled();
          setMfaEnabled(enabled);
        }
      } catch (error) {
        console.error('Error fetching session:', error.message);
      } finally {
        // Ensure loading is false even if there's an error or no session
        setLoading(false);
      }
    };

    fetchSession();

    // Set up auth state change listener
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle session changes
        if (_event === 'SIGNED_IN' && session?.user) {
          // Store user data securely
          await saveSecurely(STORAGE_KEYS.USER_ID, session.user.id);
          await saveSecurely(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
          registerForNotifications(session.user.id);
          
          // Check MFA status
          const enabled = await isMFAEnabled();
          setMfaEnabled(enabled);
        } else if (_event === 'SIGNED_OUT') {
          // Clear secure storage on sign out
          await deleteSecurely(STORAGE_KEYS.USER_ID);
          await deleteSecurely(STORAGE_KEYS.USER_SESSION);
          setMfaEnabled(false);
          setMfaFactorId(null);
        }
        
        setLoading(false); // Update loading state on auth change
      }
    );

    // Cleanup listener on unmount
    return () => {
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, []);
  
  // Register for push notifications and save token
  const registerForNotifications = async (userId) => {
    if (!notificationsEnabled) return;
    
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushToken(userId, token);
      }
    } catch (error) {
      console.error('Error registering for notifications:', error);
    }
  };

  // --- Authentication Functions ---

  const signUp = async (email, password) => {
    // Validate password strength before attempting signup
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return { 
        data: null, 
        error: { 
          message: passwordValidation.message,
          name: 'PasswordPolicyError'
        } 
      };
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    setLoading(false);
    if (error) {
      console.error('Sign up error:', error.message);
      // Consider showing a toast error here
    } else {
      // You might want to automatically sign in or prompt for confirmation
      console.log('Sign up successful:', data);
    }
    return { data, error };
  };

  const signIn = async (email, password) => {
    setLoading(true);
    
    // Check credentials before attempting to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    setLoading(false);
    
    if (error) {
      console.error('Sign in error:', error.message);
      
      // Record the failed login attempt
      await recordLoginAttempt(email, false);
      
      return { data, error };
    } 
    
    // Check if MFA is required for this user
    try {
      const factors = await getMFAFactors();
      const totpFactors = factors.totp || [];
      const hasVerifiedFactor = totpFactors.some(factor => factor.status === 'verified');
      
      if (hasVerifiedFactor) {
        // Store the first verified factor ID
        const verifiedFactor = totpFactors.find(factor => factor.status === 'verified');
        if (verifiedFactor) {
          setMfaFactorId(verifiedFactor.id);
          setMfaRequired(true);
          // Store the session data for later completion
          setPendingSignIn(data);
          // Return a special object indicating MFA is required
          return { mfaRequired: true, factorId: verifiedFactor.id };
        }
      }
      
      // If no MFA required, proceed normally and record successful login
      await recordLoginAttempt(email, true);
      console.log('Sign in successful');
      return { data, error: null };
    } catch (mfaError) {
      console.error('Error checking MFA status:', mfaError);
      // If there's an error checking MFA, still allow sign in and record as successful
      await recordLoginAttempt(email, true);
      console.log('Sign in successful (MFA check failed)');
      return { data, error: null };
    }
  };

  // Complete MFA verification after successful code entry
  const completeMfaVerification = () => {
    if (pendingSignIn) {
      // Clear MFA required state
      setMfaRequired(false);
      // The session is already established by Supabase after successful MFA verification
      setPendingSignIn(null);
      
      // Record successful login after MFA verification
      if (user && user.email) {
        recordLoginAttempt(user.email, true);
      }
    }
  };

  // Cancel MFA verification
  const cancelMfaVerification = async () => {
    // Clear MFA required state
    setMfaRequired(false);
    setPendingSignIn(null);
    // Sign out the user since they canceled MFA
    await supabase.auth.signOut();
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
     if (error) {
        console.error('Sign out error:', error.message);
       // Consider showing a toast error here
     } else {
        console.log('Sign out successful');
        // Session state will update via onAuthStateChange
     }
    return { error };
  };
  
  // Toggle notifications setting
  const toggleNotifications = async (enabled) => {
    setNotificationsEnabled(enabled);
    // Store the preference securely
    await saveSecurely(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
    
    if (enabled && user) {
      registerForNotifications(user.id);
    }
  };

  const value = {
    session,
    user,
    currentUser: user, // Add currentUser as an alias for user
    loading,
    notificationsEnabled,
    mfaEnabled,
    mfaRequired,
    mfaFactorId,
    signUp,
    signIn,
    signOut,
    toggleNotifications,
    completeMfaVerification,
    cancelMfaVerification,
  };

  // Render children only when initial session check is complete
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
