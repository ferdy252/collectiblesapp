import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  ImageBackground,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase'; // Import supabase client
import { useAuth } from '../context/AuthContext'; // Import auth context
import { useTheme } from '../context/ThemeContext'; // Import theme context
import Toast from 'react-native-toast-message';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { LinearGradient } from 'expo-linear-gradient';
// Removed barcode scanner import - using ImagePicker instead

// Import styled components
import { Typography, Button, Card, Layout, createThemedStyles } from '../theme/styled';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');

// Simple Shimmer placeholder component (no animation for now)
const Shimmer = ({ width, height, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: theme.colors.divider }, style]} />
  );
};

function HomeScreen({ navigation }) {
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth(); // Get the authenticated user
  const { theme, isDarkMode } = useTheme(); // Get current theme from context
  const scrollY = new Animated.Value(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, right: 0 });
  
  // State for collection stats
  const [stats, setStats] = useState({
    totalItems: 0,
    mostValuable: 'None',
  });

  // Function to fetch recent items from Supabase
  const fetchRecentItems = async () => {
    try {
      console.log('Fetching recent items from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchRecentItems');
        setRecentItems([]); // Clear items if no user
        setLoading(false); // Ensure loading is false if we skip
        return;
      }

      // Query the 3 most recent items from the items table for the current user
      const { data, error } = await supabase
        .from('items')
        .select('*') // Select all columns
        .eq('user_id', user.id) // Filter by user_id
        .order('created_at', { ascending: false }) // Order by created_at in descending order
        .limit(3); // Limit to 3 items
      
      if (error) {
        console.error('Error fetching recent items:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load recent items',
        });
        return;
      }
      
      console.log('Recent items fetched successfully:', data);
      setRecentItems(data || []);
    } catch (error) {
      console.error('Exception fetching recent items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchNotifications');
        setNotifications([]); // Clear notifications if no user
        setUnreadCount(0);
        return;
      }

      // Query notifications from the notifications table for the current user
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id) // Filter by user_id
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load notifications',
        });
        return;
      }
      
      // If no notifications found, create a welcome notification for new users
      if ((!data || data.length === 0) && user) { // Check user here again to be safe
        const defaultNotifications = [
          {
            id: 'welcome-1',
            title: 'Welcome!',
            message: 'Welcome to CollectibleTracker! Start by adding your first item.',
            type: 'success',
            read: false,
            created_at: new Date().toISOString(),
            action: 'add',
            actionData: {},
            // user_id: user.id // Not strictly needed for local default, but good for consistency if it were saved
          }
        ];
        setNotifications(defaultNotifications);
        setUnreadCount(1);
      } else {
        console.log('Notifications fetched successfully:', data);
        setNotifications(data || []); // Ensure data is not null
        setUnreadCount(data ? data.filter(notification => !notification.read).length : 0);
      }
    } catch (error) {
      console.error('Exception fetching notifications:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    }
  };

  // Fetch collection stats
  const fetchCollectionStats = async () => {
    try {
      console.log('Fetching collection stats from Supabase...');
      
      if (!user || !user.id) {
        console.log('User not available, skipping fetchCollectionStats');
        setStats({ totalItems: 0, mostValuable: 'None' }); // Clear stats if no user
        return;
      }

      // Query the total number of items from the items table for the current user
      const { count: totalItemsCount, error: totalItemsError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true }) // Using head:true to only get count
        .eq('user_id', user.id); // Filter by user_id
      
      if (totalItemsError) {
        console.error('Error fetching total items:', totalItemsError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load collection stats',
        });
        return;
      }
      
      // Query the most valuable item from the items table for the current user
      const { data: mostValuableItemData, error: mostValuableItemError } = await supabase
        .from('items')
        .select('name')
        .eq('user_id', user.id) // Filter by user_id
        .order('value', { ascending: false })
        .limit(1);
      
      if (mostValuableItemError) {
        console.error('Error fetching most valuable item:', mostValuableItemError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load collection stats',
        });
        return;
      }
      
      console.log('Collection stats fetched successfully:', totalItemsCount, mostValuableItemData);
      setStats({
        totalItems: totalItemsCount || 0,
        mostValuable: mostValuableItemData && mostValuableItemData.length > 0 ? mostValuableItemData[0].name : 'None',
      });
    } catch (error) {
      console.error('Exception fetching collection stats:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred',
      });
    }
  };

  // Fetch items when component mounts or user changes
  useEffect(() => {
    if (user) {
      setLoading(true); // Set loading when user is present and we're about to fetch
      fetchRecentItems();
      fetchNotifications();
      fetchCollectionStats();
    } else {
      // Clear data when user logs out or is not present
      setRecentItems([]);
      setNotifications([]);
      setUnreadCount(0);
      setStats({ totalItems: 0, mostValuable: 'None' });
      setLoading(false); // Not loading if not authenticated
    }
  }, [user]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecentItems();
    await fetchCollectionStats();
  };

  const handleSearchTap = () => {
    console.log('Home search icon tapped, navigating to Search');
    navigation.navigate('Search'); // Navigate to Search screen
  };

  const handleItemTap = (item) => {
    // Navigate to ItemDetail screen with the item data
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  const handleViewAllTap = () => {
    navigation.navigate('Collections'); // Navigate to Collections tab
  };

  // Function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Function to get image URL or placeholder
  const getImageUrl = (item) => {
    if (item.photos && item.photos.length > 0) {
      return item.photos[0]; // Use the first photo
    }
    return `https://via.placeholder.com/100?text=${encodeURIComponent(item.name)}`;
  };

  // Render skeleton loaders for recent items
  const renderRecentItemsSkeleton = () => {
    return (
      <View style={styles.recentItem}>
        <Shimmer 
          width={styles.itemImage.width} 
          height={styles.itemImage.height} 
          style={styles.itemImage} 
        />
        <View style={styles.itemDetails}>
          <Shimmer width={120} height={18} style={{ marginBottom: 6, borderRadius: 4 }} />
          <Shimmer width={80} height={14} style={{ marginBottom: 6, borderRadius: 4 }} />
          <Shimmer width={100} height={14} style={{ borderRadius: 4 }} />
        </View>
      </View>
    );
  };

  // Render skeleton for stats card
  const renderStatsCardSkeleton = () => (
    <Card.Primary style={styles.statsCard}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.background]}
        style={styles.cardGradient}
      >
        <View style={styles.statsHeader}>
          <Shimmer width={150} height={20} style={{ marginBottom: 15, borderRadius: 4 }} />
          <Shimmer width={40} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Shimmer width={40} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
            <Shimmer width={80} height={16} style={{ borderRadius: 4 }} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Shimmer width={120} height={24} style={{ marginBottom: 6, borderRadius: 4 }} />
            <Shimmer width={80} height={16} style={{ borderRadius: 4 }} />
          </View>
        </View>
      </LinearGradient>
    </Card.Primary>
  );

  // Calculate header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const handleExportData = () => {
    console.log('Export data tapped');
    // Navigate to Settings screen through Profile stack and trigger export
    navigation.navigate('Profile', { 
      screen: 'Settings', 
      params: { initialAction: 'export' }
    });
  };

  const handleScanBarcode = async () => {
    console.log('Scan barcode tapped');
    try {
      // Check if we have permission to use the camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        // Navigate to barcode scanner screen with lookup mode
        navigation.navigate('BarcodeScannerScreen', { mode: 'lookup' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Camera Permission',
          text2: 'We need camera permission to scan barcodes',
        });
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      // Fallback to manual add if camera permission fails
      navigation.navigate('AddMain');
    }
  };

  const handleStatistics = () => {
    console.log('Statistics tapped');
    // Navigate to statistics screen or show statistics modal
    navigation.navigate('Statistics');
  };

  const handleNotificationPress = () => {
    // Measure the position of the notification button to position the popup
    if (notificationRef.current) {
      notificationRef.current.measure((x, y, width, height, pageX, pageY) => {
        setNotificationPosition({
          top: pageY + height + 5,
          right: width + 10,
        });
        setShowNotifications(!showNotifications);
      });
    }
  };

  const markAsRead = async (id) => {
    try {
      // Update the notification in the database
      if (id && id.startsWith && id.startsWith('welcome-')) {
        // For default welcome notifications that aren't in the database yet
        const updatedNotifications = notifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
      } else {
        // For notifications stored in the database
        // Validate UUID format before sending to the database
        if (!id || typeof id !== 'string') {
          console.error('Error marking notification as read: Invalid ID format', id);
          return;
        }

        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
        
        if (error) {
          console.error('Error marking notification as read:', error);
          return;
        }
        
        // Update local state
        const updatedNotifications = notifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(notification => !notification.read).length);
      }
    } catch (error) {
      console.error('Exception marking notification as read:', error.message);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    }
    if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    }
    if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    }
    return 'Just now';
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getColorForType = (type) => {
    switch (type) {
      case 'success':
        return theme.colors.success || '#4CAF50';
      case 'warning':
        return theme.colors.warning || '#FF9800';
      case 'error':
        return theme.colors.error || '#F44336';
      case 'info':
      default:
        return theme.colors.info || '#2196F3';
    }
  };

  const handleNotificationAction = (notification) => {
    // Mark notification as read
    markAsRead(notification.id);
    
    // Close the notifications popup
    setShowNotifications(false);
    
    // Handle different actions based on notification type
    switch (notification.action) {
      case 'feature':
        // For feature announcements, we could show a modal or navigate to a specific screen
        if (notification.actionData.feature === 'barcode') {
          // Navigate to barcode scanner
          navigation.navigate('BarcodeScanner');
        }
        break;
        
      case 'item':
        // Navigate to the item detail
        if (notification.actionData.itemId) {
          navigation.navigate('ItemDetail', { itemId: notification.actionData.itemId });
        }
        break;
        
      case 'collection':
        // Navigate to a specific collection
        if (notification.actionData.collectionId) {
          navigation.navigate('Collections', { screen: 'CollectionItems', params: { collectionId: notification.actionData.collectionId } });
        }
        break;
        
      case 'post':
        // Navigate to a specific post in the feed
        if (notification.actionData.postId) {
          navigation.navigate('Feed', { screen: 'FeedMain', params: { highlightPostId: notification.actionData.postId } });
        }
        break;
        
      case 'settings':
        // Navigate to settings, possibly to a specific section
        navigation.navigate('Profile', { 
          screen: 'Settings', 
          params: notification.actionData.section ? { section: notification.actionData.section } : undefined 
        });
        break;
        
      case 'add':
        // Navigate to add item screen
        navigation.navigate('Add');
        break;
        
      default:
        // For notifications without a specific action, navigate to the notifications screen
        navigation.navigate('Notifications', { highlightId: notification.id });
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      
      {/* Modern Header with Gradient */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity, backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.background]}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Typography.H2 style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Hello, {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Collector'}!</Typography.H2>
              <Typography.Body style={[styles.subtitle, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Track your collectibles and discover new ones</Typography.Body>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.searchButton, { backgroundColor: theme.colors.background }]}
                onPress={handleSearchTap}
              >
                <Ionicons name="search" size={22} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                ref={notificationRef}
                style={[styles.notificationButton, { backgroundColor: theme.colors.background }]}
                onPress={handleNotificationPress}
              >
                <Ionicons name="notifications-outline" size={22} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
                {unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.colors.like }]}>
                    {unreadCount > 9 ? (
                      <Text style={styles.badgeText}>9+</Text>
                    ) : unreadCount > 0 ? (
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Notifications Popup */}
      {showNotifications && (
        <View 
          style={[
            styles.notificationsPopup, 
            { 
              top: notificationPosition.top,
              right: 20,
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            }
          ]}
        >
          <View style={styles.notificationsHeader}>
            <Typography.Body style={[styles.notificationsTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
              Notifications
            </Typography.Body>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <Ionicons name="close" size={20} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.notificationsList}>
            {notifications.length > 0 ? (
              <>
                {notifications.slice(0, 3).map((notification) => (
                  <TouchableOpacity 
                    key={notification.id}
                    style={[styles.notificationItem, { backgroundColor: notification.read ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                    onPress={() => handleNotificationAction(notification)}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: getColorForType(notification.type) }]}>
                      <Ionicons name={getIconForType(notification.type)} size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationItemHeader}>
                        <Typography.BodySmall style={[styles.notificationItemTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
                          {notification.title}
                        </Typography.BodySmall>
                        <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
                          {formatTime(notification.created_at)}
                        </Typography.Caption>
                      </View>
                      <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
                        {notification.message}
                      </Typography.Caption>
                    </View>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
                
                {notifications.length > 3 && (
                  <TouchableOpacity 
                    style={styles.seeMoreButton}
                    onPress={() => {
                      setShowNotifications(false);
                      navigation.navigate('Notifications');
                    }}
                  >
                    <Typography.BodySmall style={{ color: theme.colors.primary }}>
                      See all {notifications.length} notifications
                    </Typography.BodySmall>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off" size={40} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
                <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                  No notifications yet
                </Typography.BodySmall>
              </View>
            )}
          </View>
        </View>
      )}

      <Animated.ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.colors.background }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.background}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Stats Card - Moved to top for better visibility */}
        <View style={styles.section}>
          {loading ? (
            renderStatsCardSkeleton()
          ) : (
            <Card.Primary style={[styles.statsCard, { backgroundColor: theme.colors.background }]}>
              <LinearGradient
                colors={[theme.colors.background, theme.colors.background]}
                style={styles.cardGradient}
              >
                <View style={styles.statsHeader}>
                  <Typography.H3 style={[styles.statsTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Collection Overview</Typography.H3>
                  <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Typography.H2 style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.primary }]}>{stats.totalItems}</Typography.H2>
                    <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>Total Items</Typography.BodySmall>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Typography.Body style={[styles.statHighlight, { color: isDarkMode ? '#FFFFFF' : theme.colors.accent }]}>{stats.mostValuable}</Typography.Body>
                    <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>Most Valuable</Typography.BodySmall>
                  </View>
                </View>
              </LinearGradient>
            </Card.Primary>
          )}
        </View>

        {/* Recent Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} style={styles.sectionIcon} />
              <Typography.H3 style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Recent Items</Typography.H3>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleViewAllTap}
            >
              <Typography.BodySmall style={[styles.viewAllButtonText, { color: isDarkMode ? '#FFFFFF' : theme.colors.primary }]}>View All</Typography.BodySmall>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            renderRecentItemsSkeleton()
          ) : recentItems.length > 0 ? (
            <View style={styles.recentItemsContainer}>
              {recentItems.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.recentItem, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleItemTap(item)}
                  activeOpacity={0.7}
                >
                  {item.photos && item.photos.length > 0 ? (
                    <Image 
                      source={{ uri: item.photos[0] }} 
                      style={styles.itemImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                      <Ionicons name="image-outline" size={30} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.itemDetails}>
                    <Typography.Body style={{ fontWeight: 'bold', color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>{item.name}</Typography.Body>
                    <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>{item.brand || 'No brand'}</Typography.BodySmall>
                    <View style={styles.itemMeta}>
                      <View style={[styles.categoryTag, { backgroundColor: theme.colors.background }]}>
                        <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>{item.category}</Typography.Caption>
                      </View>
                      <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary, marginLeft: theme.spacing.sm }}>
                        {formatDate(item.created_at)}
                      </Typography.Caption>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FFFFFF' : theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Card.Primary style={[styles.emptyStateCard, { backgroundColor: theme.colors.background }]}>
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={40} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
                <Typography.Body style={{ textAlign: 'center', marginTop: theme.spacing.md, color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>
                  No items added yet. Start building your collection!
                </Typography.Body>
                <Button.Primary 
                  title="Add Your First Item" 
                  onPress={() => navigation.navigate('Add')} 
                  style={{ marginTop: theme.spacing.lg }}
                />
              </View>
            </Card.Primary>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Typography.H3 style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Quick Actions</Typography.H3>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleScanBarcode()}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="barcode" size={24} color="#FFFFFF" />
              </View>
              <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Scan Item</Typography.BodySmall>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Profile', { screen: 'Settings' })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="settings" size={24} color="#FFFFFF" />
              </View>
              <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Settings</Typography.BodySmall>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleExportData()}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.tertiary }]}>
                <Ionicons name="download" size={24} color="#FFFFFF" />
              </View>
              <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Export</Typography.BodySmall>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleStatistics()}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.accent }]}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              </View>
              <Typography.BodySmall style={[styles.quickActionText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Statistics</Typography.BodySmall>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    width: '100%',
    zIndex: 10,
    backgroundColor: theme.colors.background,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerGradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  searchButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.like,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationsPopup: {
    position: 'absolute',
    zIndex: 1000,
    width: 300,
    maxHeight: 400,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  notificationsTitle: {
    fontWeight: 'bold',
  },
  notificationsList: {
    maxHeight: 350,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    position: 'relative',
  },
  notificationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationItemTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  seeMoreButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  emptyNotifications: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: theme.spacing.xs,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  viewAllButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  viewAllButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  },
  statsCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.isDarkMode ? 0.4 : 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: theme.spacing.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statsTitle: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statHighlight: {
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  recentItemsContainer: {
    marginBottom: theme.spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.isDarkMode ? 0.25 : 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  itemDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  categoryTag: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: theme.isDarkMode ? 0.3 : 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    alignItems: 'center',
    width: (width - theme.spacing.lg * 2 - theme.spacing.md * 3) / 4,
    marginBottom: theme.spacing.md,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: theme.isDarkMode ? 0.4 : 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  quickActionText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
}));

export default HomeScreen;
