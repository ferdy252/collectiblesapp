import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './screens/HomeScreen';
import CollectionsScreen from './screens/CollectionsScreen';
import { AddItemScreen } from './screens/AddItem';
import ItemDetailScreen from './screens/ItemDetailScreen';
import FeedScreen from './screens/FeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import SearchScreen from './screens/SearchScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import BarcodeScannerScreen from './screens/BarcodeScannerScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ImagePickerScreen from './screens/AddItem/ImagePickerScreen';
import FeedbackHistoryScreen from './screens/FeedbackHistoryScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AuthScreen from './screens/AuthScreen';
import CollectionItemsScreen from './screens/CollectionItemsScreen';
import AllItemsScreen from './screens/AllItemsScreen';
import EditItemScreen from './screens/EditItemScreen';
import SelectExistingItemScreen from './screens/SelectExistingItemScreen';
import EditAccountScreen from './screens/EditAccountScreen';
import ViewProfileScreen from './screens/ViewProfileScreen';
import FindUsersScreen from './screens/FindUsersScreen';
import PremiumFeaturesScreen from './screens/PremiumFeaturesScreen';
import { initAnalytics, setUserProperties } from './lib/analytics';
import * as Notifications from 'expo-notifications';
import env from './config/environment';
import Constants from 'expo-constants';
import { initSecureNetworking } from './utils/secureNetworking';
import { setupCertificatePinning } from './utils/certificatePinning';
import { initSecurePayments } from './utils/securePayments';
// Import the dependency checker
import { checkAndNotifyUpdates } from './utils/dependencyChecker';
// Import ErrorBoundary component
import ErrorBoundary from './components/ErrorBoundary';

// Import theme
import theme from './theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Define transition animations for stack navigators
const screenOptions = ({ theme }) => ({
  headerShown: false,
  cardStyle: { backgroundColor: theme.colors.background },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
    });
    
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 0.9, 1],
      outputRange: [0, 0.25, 0.7, 1],
    });
    
    return {
      cardStyle: {
        transform: [{ translateX }],
        opacity,
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
          extrapolate: 'clamp',
        }),
      },
    };
  },
});

// Create the stack navigator for Home tab
function HomeStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={screenOptions({ theme })}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="EditItem" component={EditItemScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
    </Stack.Navigator>
  );
}

// Create the stack navigator for Collections tab
function CollectionsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={screenOptions({ theme })}>
      <Stack.Screen name="CollectionsMain" component={CollectionsScreen} />
      <Stack.Screen name="AllItems" component={AllItemsScreen} />
      <Stack.Screen name="CollectionItems" component={CollectionItemsScreen} />
      <Stack.Screen name="SelectExistingItem" component={SelectExistingItemScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="EditItem" component={EditItemScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
    </Stack.Navigator>
  );
}

// Create the stack navigator for Feed tab
function FeedStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={screenOptions({ theme })}>
      <Stack.Screen name="FeedMain" component={FeedScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="EditItem" component={EditItemScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
    </Stack.Navigator>
  );
}

// Create the stack navigator for Add tab
function AddStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={screenOptions({ theme })}>
      <Stack.Screen name="AddMain" component={AddItemScreen} />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <Stack.Screen name="ImagePicker" component={ImagePickerScreen} />
    </Stack.Navigator>
  );
}

// Create the stack navigator for Profile tab
function ProfileStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={screenOptions({ theme })}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} />
      <Stack.Screen name="EditAccount" component={EditAccountScreen} />
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
      <Stack.Screen name="FindUsers" component={FindUsersScreen} />
      <Stack.Screen name="PremiumFeatures" component={PremiumFeaturesScreen} />
      <Stack.Screen name="FeedbackHistory" component={FeedbackHistoryScreen} />
    </Stack.Navigator>
  );
}

// Loading component
function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
    </View>
  );
}

// Main Tab Navigator (Protected Routes)
function MainAppTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'My Items') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Add') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Feed') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          paddingVertical: theme.spacing.xs,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
          backgroundColor: theme.colors.background,
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="My Items" component={CollectionsStack} />
      <Tab.Screen 
        name="Add" 
        component={AddStack} 
        options={{
          tabBarLabel: 'Add Item',
        }}
      />
      <Tab.Screen name="Feed" component={FeedStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

// Component to decide which navigator to show
const AppNavigator = () => {
  const { user, loading, initialized } = useAuth();
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    const setupApp = async () => {
      // Initialize analytics and notifications
      await initAnalytics();
      
      // Setup notifications handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      // Set up notification response handler
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        if (data.type === 'comment' && data.itemId) {
          // We'll handle navigation in the appropriate component
        }
      });
      
      return () => {
        // Clean up notification listener
        subscription.remove();
      };
      
      // Initialize secure networking
      initSecureNetworking();
      
      // Set up certificate pinning for critical endpoints
      setupCertificatePinning();
      
      // Initialize secure payments
      initSecurePayments();
      
      // Check for security updates
      checkAndNotifyUpdates();
      
      // Set up push notifications
      if (Platform.OS === 'ios') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }
      }
      
      if (user) {
        // Set user properties for analytics
        setUserProperties({
          userId: user.id,
          email: user.email,
        });
      }
    };
    
    setupApp();
  }, [user]);
  
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if onboarding has been completed before
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const value = await AsyncStorage.getItem('onboardingCompleted');
        if (value === 'true') {
          setShowOnboarding(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    checkOnboardingStatus();
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (loading || checkingOnboarding) {
    return <LoadingScreen />;
  }

  // Show onboarding if it hasn't been completed yet
  if (showOnboarding) {
    return <WelcomeScreen onComplete={handleOnboardingComplete} />;
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

  // Show main app if logged in
  return <MainAppTabs />;
}

// Main App component
const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppWithTheme />
      </ThemeProvider>
    </AuthProvider>
  );
}

// App with theme applied
const AppWithTheme = () => {
  const { theme, isDarkMode } = useTheme();
  
  // Define the navigation theme based on the app theme
  const navigationTheme = {
    dark: isDarkMode,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.notification,
    },
  };

  return (
    <ErrorBoundary>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
      <Toast />
    </ErrorBoundary>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});
