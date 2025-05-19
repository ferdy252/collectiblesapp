import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { purchaseItem, purchaseSubscription } from '../utils/securePayments';
import Toast from 'react-native-toast-message';
import { createThemedStyles } from '../theme/styled';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

const PremiumFeaturesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Premium plans
  const premiumPlans = [
    {
      id: 'premium_monthly',
      name: 'Premium Monthly',
      price: 4.99,
      interval: 'month',
      features: [
        'Unlimited collections',
        'Advanced statistics',
        'Price tracking',
        'No ads',
        'Priority support',
      ],
      popular: false,
    },
    {
      id: 'premium_yearly',
      name: 'Premium Yearly',
      price: 39.99,
      interval: 'year',
      features: [
        'Unlimited collections',
        'Advanced statistics',
        'Price tracking',
        'No ads',
        'Priority support',
        'Market value insights',
      ],
      popular: true,
      discount: '33% off',
    },
  ];

  // One-time purchases
  const oneTimePurchases = [
    {
      id: 'extra_collections',
      name: 'Extra Collections Pack',
      price: 2.99,
      description: 'Add 5 more collections to your account',
      icon: 'folder-open-outline',
    },
    {
      id: 'advanced_stats',
      name: 'Advanced Statistics',
      price: 3.99,
      description: 'Unlock detailed analytics and insights',
      icon: 'stats-chart-outline',
    },
  ];

  // Handle subscription purchase
  const handleSubscription = async () => {
    if (!selectedPlan) {
      Alert.alert('Please select a plan');
      return;
    }

    // Reset error state
    setHasError(false);
    setErrorMessage('');
    setLoading(true);

    try {
      const plan = premiumPlans.find(p => p.id === selectedPlan);
      
      const result = await purchaseSubscription(
        plan.id,
        plan.price,
        plan.interval
      );

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Subscription Activated',
          text2: `You're now subscribed to ${plan.name}!`,
        });
        
        // In a real app, you would update the user's subscription status
        // and navigate them back or to a confirmation screen
      } else if (result.cancelled) {
        Toast.show({
          type: 'info',
          text1: 'Purchase Cancelled',
          text2: 'You cancelled the subscription purchase',
        });
      } else {
        // Use our new error handling utility for failed purchases
        handleError(
          new Error(result.message || 'Subscription failed'),
          'PremiumFeaturesScreen.handleSubscription',
          ERROR_CATEGORIES.UNKNOWN,
          'Your subscription could not be processed. Please try again later.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage('Your subscription could not be processed. Please try again later.');
      }
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'PremiumFeaturesScreen.handleSubscription',
        ERROR_CATEGORIES.UNKNOWN,
        'Something went wrong with your subscription. Our team has been notified.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Something went wrong with your subscription. Our team has been notified.');
    } finally {
      setLoading(false);
    }
  };

  // Handle one-time purchase
  const handlePurchase = async (item) => {
    // Reset error state
    setHasError(false);
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await purchaseItem(item.id, item.price);

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Purchase Successful',
          text2: `You've unlocked ${item.name}!`,
        });
        
        // In a real app, you would update the user's purchases
        // and unlock the feature they purchased
      } else if (result.cancelled) {
        Toast.show({
          type: 'info',
          text1: 'Purchase Cancelled',
          text2: 'You cancelled the purchase',
        });
      } else {
        // Use our new error handling utility for failed purchases
        handleError(
          new Error(result.message || 'Purchase failed'),
          'PremiumFeaturesScreen.handlePurchase',
          ERROR_CATEGORIES.UNKNOWN,
          'Your purchase could not be completed. Please try again later.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage('Your purchase could not be completed. Please try again later.');
      }
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'PremiumFeaturesScreen.handlePurchase',
        ERROR_CATEGORIES.UNKNOWN,
        'Something went wrong with your purchase. Our team has been notified.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Something went wrong with your purchase. Our team has been notified.');
    } finally {
      setLoading(false);
    }
  };

  // Render a subscription plan card
  const renderPlanCard = (plan) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        { backgroundColor: isDarkMode ? '#111111' : '#FFFFFF' },
        selectedPlan === plan.id && { borderColor: theme.colors.primary, borderWidth: 2 },
        plan.popular && styles.popularPlan,
      ]}
      onPress={() => setSelectedPlan(plan.id)}
      disabled={loading}
    >
      {plan.popular && (
        <View style={[styles.popularTag, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.popularTagText}>BEST VALUE</Text>
        </View>
      )}
      
      <Text style={[styles.planName, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
        {plan.name}
      </Text>
      
      <View style={styles.priceContainer}>
        <Text style={[styles.currency, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>$</Text>
        <Text style={[styles.price, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
          {plan.price}
        </Text>
        <Text style={[styles.interval, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>
          /{plan.interval}
        </Text>
      </View>
      
      {plan.discount && (
        <View style={[styles.discountTag, { backgroundColor: isDarkMode ? '#222222' : '#F0F0F0' }]}>
          <Text style={[styles.discountText, { color: theme.colors.primary }]}>{plan.discount}</Text>
        </View>
      )}
      
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
            <Text style={[styles.featureText, { color: isDarkMode ? '#E0E0E0' : theme.colors.text }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  // Render a one-time purchase item
  const renderPurchaseItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.purchaseItem, { backgroundColor: isDarkMode ? '#111111' : '#FFFFFF' }]}
      onPress={() => handlePurchase(item)}
      disabled={loading}
    >
      <View style={[styles.purchaseIconContainer, { backgroundColor: isDarkMode ? '#222222' : '#F0F0F0' }]}>
        <Ionicons name={item.icon} size={24} color={theme.colors.primary} />
      </View>
      
      <View style={styles.purchaseInfo}>
        <Text style={[styles.purchaseName, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.purchaseDescription, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>
          {item.description}
        </Text>
      </View>
      
      <View style={styles.purchasePriceContainer}>
        <Text style={[styles.purchasePrice, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
          ${item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Premium Features</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={styles.heroSection}>
          {/* Removed image that doesn't exist */}
          <Text style={[styles.heroTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
            Upgrade Your Collection Experience
          </Text>
          <Text style={[styles.heroSubtitle, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>
            Get access to premium features and take your collecting to the next level
          </Text>
        </View>
        
        {/* Subscription plans */}
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
          Choose Your Plan
        </Text>
        
        <View style={styles.plansContainer}>
          {premiumPlans.map(renderPlanCard)}
        </View>
        
        {/* Error Display */}
        {hasError && (
          <ErrorDisplay 
            message={errorMessage}
            onRetry={() => setHasError(false)}
            style={styles.errorContainer}
          />
        )}
        
        {/* Subscribe button */}
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: theme.colors.primary },
            (!selectedPlan || loading) && { opacity: 0.7 },
          ]}
          onPress={handleSubscription}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan ? 'Subscribe Now' : 'Select a Plan'}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* One-time purchases */}
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginTop: 30 }]}>
          One-Time Purchases
        </Text>
        
        <View style={styles.purchasesContainer}>
          {oneTimePurchases.map(renderPurchaseItem)}
        </View>
        
        {/* Security note */}
        <View style={[styles.securityNote, { backgroundColor: isDarkMode ? '#111111' : '#F5F5F5' }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.securityText, { color: isDarkMode ? '#AAAAAA' : '#666666' }]}>
            All transactions are secure and protected with biometric authentication
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  popularPlan: {
    transform: [{ scale: 1.02 }],
  },
  popularTag: {
    position: 'absolute',
    top: -10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  currency: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  interval: {
    fontSize: 14,
    marginBottom: 3,
    marginLeft: 2,
  },
  discountTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  subscribeButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  purchasesContainer: {
    marginBottom: 20,
  },
  purchaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  purchaseIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  purchaseDescription: {
    fontSize: 14,
  },
  purchasePriceContainer: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#EEEEEE',
  },
  purchasePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  securityText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.errorBackground,
    marginBottom: 20,
  },
}));

export default PremiumFeaturesScreen;
