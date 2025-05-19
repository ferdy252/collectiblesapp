import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createThemedStyles } from '../theme/styled';
// Import error handling utilities
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');
// Calculate grid item size based on screen width (3 columns with margins)
const numColumns = width > 768 ? 4 : 3; // 4 columns on tablets, 3 on phones
const ITEM_MARGIN = 10; // Margin around each item
const ITEM_PADDING = 1; // Padding inside the item container
const ITEM_BORDER_WIDTH = 1; // Border width of the item container

const itemSize = Math.floor((width - (numColumns + 1) * ITEM_MARGIN) / numColumns);
// Calculate the actual display size for the image within the item container
const imageDisplaySize = Math.floor(itemSize - 2 * (ITEM_PADDING + ITEM_BORDER_WIDTH));

// Simple Shimmer placeholder component (no animation for now)
const Shimmer = ({ width, height, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: theme.colors.divider }, style]} />
  );
};

const ProfileScreen = ({ navigation }) => {
  // Auth context for user data
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const isFocused = useIsFocused();
  
  // State variables
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedItems, setLikedItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Add error state variables
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch user data when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  // Function to fetch all user data
  const fetchUserData = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      
      // Only show loading indicator on first load or manual refresh, not on every focus
      if (!userProfile) {
        setLoading(true);
      }
      console.log('Fetching user profile data...');
      
      // Fetch user profile from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (userData && userData.user) {
        console.log('User data fetched:', userData.user.email);
        
        // Set user profile data
        setUserProfile({
          id: userData.user.id,
          username: userData.user.user_metadata?.full_name || 'User',
          email: userData.user.email,
          avatar: userData.user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
          bio: userData.user.user_metadata?.bio || 'No bio yet',
        });
        
        const userId = userData.user.id;
        
        // Fetch all data in parallel instead of sequentially
        await Promise.all([
          fetchTotalItems(userId),
          fetchUserPosts(userId),
          fetchLikedItems(userId),
          fetchFollowerCount(userId),
          fetchFollowingCount(userId)
        ]);
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchUserData',
        ERROR_CATEGORIES.AUTH,
        'Unable to load profile data. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch total items count
  const fetchTotalItems = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      console.log(`Total items count: ${count}`);
      setTotalItems(count || 0);
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchTotalItems',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load item count.'
      );
      // We don't set global error state here as this is just one part of the profile
      // Just set a default value
      setTotalItems(0);
    }
  };

  // Fetch user's shared posts
  const fetchUserPosts = async (userId) => {
    try {
      // First get the shared items
      const { data: items, error } = await supabase
        .from('items')
        .select('id, name, category, created_at')
        .eq('user_id', userId)
        .eq('is_shared', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Fetched ${items.length} shared items`);
      
      if (items && items.length > 0) {
        // Now fetch the photos for each item
        const itemsWithPhotos = await Promise.all(
          items.map(async (item) => {
            // Get photos from item_photos table
            const { data: photoData, error: photoError } = await supabase
              .from('item_photos')
              .select('image_id, images(url)')
              .eq('item_id', item.id)
              .order('display_order', { ascending: true })
              .limit(1); // Just get the first photo for the grid
            
            if (photoError) {
              console.error(`Error fetching photos for item ${item.id}:`, photoError);
              return { ...item, photoUrl: null };
            }
            
            // Extract the photo URL if available
            const photoUrl = photoData && photoData.length > 0 && photoData[0].images ? 
              photoData[0].images.url : null;
              
            console.log(`Item ${item.id} photo URL: ${photoUrl}`);
            
            return { ...item, photoUrl };
          })
        );
        
        setPosts(itemsWithPhotos);
      } else {
        setPosts([]);
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchUserPosts',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load shared items.'
      );
      // We don't set global error state here as this is just one part of the profile
      // Just set an empty array
      setPosts([]);
    }
  };

  // Fetch user's liked items
  const fetchLikedItems = async (userId) => {
    try {
      // First get the item_ids from likes table
      const { data: likedItemIds, error: likesError } = await supabase
        .from('likes')
        .select('item_id')
        .eq('user_id', userId);
      
      if (likesError) throw likesError;
      
      if (likedItemIds && likedItemIds.length > 0) {
        // Extract just the IDs into an array
        const itemIds = likedItemIds.map(like => like.item_id);
        
        // Then fetch the actual items
        const { data: items, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .in('id', itemIds)
          .order('created_at', { ascending: false });
        
        if (itemsError) throw itemsError;
        
        console.log(`Fetched ${items.length} liked items`);
        setLikedItems(items || []);
      } else {
        setLikedItems([]);
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchLikedItems',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load liked items.'
      );
      // We don't set global error state here as this is just one part of the profile
      // Just set an empty array
      setLikedItems([]);
    }
  };

  // Fetch follower count
  const fetchFollowerCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      console.log(`Follower count: ${count}`);
      setFollowerCount(count || 0);
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchFollowerCount',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load follower count.'
      );
      // We don't set global error state here as this is just one part of the profile
      // Just set a default value
      setFollowerCount(0);
    }
  };

  // Fetch following count
  const fetchFollowingCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      
      if (error) throw error;
      
      console.log(`Following count: ${count}`);
      setFollowingCount(count || 0);
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'ProfileScreen.fetchFollowingCount',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load following count.'
      );
      // We don't set global error state here as this is just one part of the profile
      // Just set a default value
      setFollowingCount(0);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  // Handler for settings icon
  const handleSettingsTap = () => {
    console.log('Settings tapped');
    navigation.navigate('Settings');
  };

  // Handler for post tap
  const handlePostTap = (itemId) => {
    console.log(`Post ${itemId} tapped`);
    navigation.navigate('ItemDetail', { itemId });
  };

  // Handle viewing another user's profile
  const handleViewUserProfile = (userId) => {
    if (userId === user.id) {
      // If it's the current user, just refresh the current profile
      fetchUserData();
    } else {
      // Navigate to the ViewProfile screen with the userId
      navigation.navigate('ViewProfile', { userId });
    }
  };

  // Render each post item
  const renderPostItem = ({ item }) => {
    // Handle skeleton items
    if (item.isSkeleton) {
      return (
        <View style={[styles.postItem, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
          <Shimmer width={itemSize} height={itemSize} style={{ borderRadius: 4 }} />
        </View>
      );
    }
    
    // Get the photo URL from our updated data structure
    const photoUri = item.photoUrl || 'https://via.placeholder.com/300/cccccc/ffffff?text=No+Image';
    
    // Debug the photo URI to ensure it's valid
    console.log(`Rendering item ${item.id} with photo URI: ${photoUri}`);
    
    return (
      <TouchableOpacity
        style={[styles.postItem, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderColor: isDarkMode ? '#222222' : theme.colors.divider }]}
        onPress={() => handlePostTap(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={[styles.emptyStateContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <Ionicons name="images-outline" size={50} color={isDarkMode ? '#BBBBBB' : theme.colors.divider} />
      <Text style={[styles.emptyStateText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
        {activeTab === 'posts' ? 'No shared items yet' : 'No liked items yet'}
      </Text>
    </View>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar 
          barStyle="light-content"
          backgroundColor="#000000"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (hasError && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar 
          barStyle="light-content"
          backgroundColor="#000000"
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
          </View>
          <ErrorDisplay 
            message={errorMessage}
            onRetry={fetchUserData}
            style={styles.errorContainer}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Generate skeleton items for loading state
  const generateSkeletonItems = () => {
    return Array(9).fill().map((_, index) => ({
      id: `skeleton-${index}`,
      isSkeleton: true
    }));
  };

  // Render profile skeleton
  const renderProfileSkeleton = () => (
    <View style={[styles.profileSection, { backgroundColor: '#000000', borderBottomColor: '#222222' }]}>
      <View style={styles.avatarContainer}>
        <Shimmer 
          width={80} 
          height={80} 
          style={{ borderRadius: 40, backgroundColor: '#222222' }} 
        />
      </View>
      
      <View style={styles.profileInfo}>
        <Shimmer 
          width={150} 
          height={20} 
          style={{ marginBottom: 8, borderRadius: 4, backgroundColor: '#222222' }} 
        />
        <Shimmer 
          width={200} 
          height={16} 
          style={{ marginBottom: 12, borderRadius: 4, backgroundColor: '#222222' }} 
        />
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Shimmer width={30} height={20} style={{ marginBottom: 4, borderRadius: 4, backgroundColor: '#222222' }} />
          <Shimmer width={60} height={14} style={{ borderRadius: 4, backgroundColor: '#222222' }} />
        </View>
        
        <View style={styles.statItem}>
          <Shimmer width={30} height={20} style={{ marginBottom: 4, borderRadius: 4, backgroundColor: '#222222' }} />
          <Shimmer width={60} height={14} style={{ borderRadius: 4, backgroundColor: '#222222' }} />
        </View>
        
        <View style={styles.statItem}>
          <Shimmer width={30} height={20} style={{ marginBottom: 4, borderRadius: 4, backgroundColor: '#222222' }} />
          <Shimmer width={60} height={14} style={{ borderRadius: 4, backgroundColor: '#222222' }} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#000000"
      />
      
      {/* Header with settings icon */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Profile</Text>
        <TouchableOpacity onPress={handleSettingsTap}>
          <Ionicons name="settings-outline" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Profile section */}
      {loading ? (
        renderProfileSkeleton()
      ) : (
        <View style={[styles.profileSection, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderBottomColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
          <Image 
            source={{ uri: userProfile?.avatar }} 
            style={[styles.avatar, { backgroundColor: isDarkMode ? '#222222' : theme.colors.divider }]} 
          />
          <Text style={[styles.username, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{userProfile?.username}</Text>
          <Text style={[styles.bio, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>{userProfile?.bio}</Text>
          
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{totalItems}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>Items</Text>
            </View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => navigation.navigate('FindUsers')}
            >
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{followerCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }]}>Following</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Tabs section */}
      <View style={[styles.tabsContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderBottomColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            { backgroundColor: isDarkMode ? '#000000' : theme.colors.background },
            activeTab === 'posts' && { borderBottomWidth: 2, borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons 
            name={activeTab === 'posts' ? 'grid' : 'grid-outline'} 
            size={22} 
            color={activeTab === 'posts' ? theme.colors.primary : isDarkMode ? '#BBBBBB' : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'posts' ? theme.colors.primary : isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }
          ]}>Posts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            { backgroundColor: isDarkMode ? '#000000' : theme.colors.background },
            activeTab === 'liked' && { borderBottomWidth: 2, borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('liked')}
        >
          <Ionicons 
            name={activeTab === 'liked' ? 'heart' : 'heart-outline'} 
            size={22} 
            color={activeTab === 'liked' ? theme.colors.primary : isDarkMode ? '#BBBBBB' : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'liked' ? theme.colors.primary : isDarkMode ? '#BBBBBB' : theme.colors.textSecondary }
          ]}>Liked</Text>
        </TouchableOpacity>
      </View>
      
      {/* Posts/Liked Items grid */}
      <FlatList
        data={loading ? generateSkeletonItems() : 
              activeTab === 'posts' ? posts : likedItems}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id ? item.id.toString() : `skeleton-${Math.random()}`}
        numColumns={numColumns}
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : null}
        style={[styles.flatList, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={isDarkMode ? '#FFFFFF' : theme.colors.primary}
            progressBackgroundColor={isDarkMode ? '#000000' : theme.colors.background}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: theme.colors.divider,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.text,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    marginLeft: 6,
  },
  postItem: {
    width: itemSize,
    height: itemSize,
    padding: ITEM_PADDING,
    backgroundColor: theme.colors.background,
    borderWidth: ITEM_BORDER_WIDTH,
    borderColor: theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: imageDisplaySize,
    height: imageDisplaySize,
    overflow: 'hidden',
    borderRadius: 4,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  flatList: {
    backgroundColor: theme.colors.background,
  },
}));

export default ProfileScreen;
