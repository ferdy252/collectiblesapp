import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { logLikeItem } from '../lib/analytics';
import { sendPushNotification } from '../lib/notifications';
import { createThemedStyles } from '../theme/styled';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');
// Adjust number of columns based on screen width
const numColumns = width > 768 ? 4 : 3; // 4 columns on tablets, 3 on phones
const itemSize = (width - (numColumns + 1) * 8) / numColumns; // Account for margins

// Simple Shimmer placeholder component (no animation for now)
const Shimmer = ({ width, height, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: theme.colors.divider }, style]} />
  );
};

function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState({});
  const [likingInProgress, setLikingInProgress] = useState({});
  
  // Animation values for like button
  const likeAnimations = useRef({});
  
  // Fetch shared items when component mounts
  useEffect(() => {
    fetchSharedItems();
  }, []);
  
  // Initialize like animations for new posts
  useEffect(() => {
    // Create animation values for each post
    posts.forEach(post => {
      if (!likeAnimations.current[post.id]) {
        likeAnimations.current[post.id] = new Animated.Value(1);
      }
    });
  }, [posts]);
  
  // Function to fetch shared items from Supabase
  const fetchSharedItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching shared items from Supabase...');
      
      // Fetch items that are shared
      const { data: sharedItems, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          category,
          brand,
          created_at,
          user_id,
          collection_id
        `)
        .eq('is_shared', true)
        .order('created_at', { ascending: false });
      
      if (itemsError) {
        throw itemsError;
      }
      
      console.log(`Fetched ${sharedItems.length} shared items`);
      
      // Fetch photos for each item
      const itemsWithPhotos = await Promise.all(sharedItems.map(async (item) => {
        // Get photos from item_photos and images tables
        const { data: photoData, error: photoError } = await supabase
          .from('item_photos')
          .select(`
            image_id,
            images:image_id(url)
          `)
          .eq('item_id', item.id);
        
        if (photoError) {
          console.error(`Error fetching photos for item ${item.id}:`, photoError);
          return { ...item, photos: [] };
        }
        
        // Extract photo URLs from the joined data
        const photos = photoData.map(photo => photo.images?.url || null).filter(Boolean);
        
        return {
          ...item,
          photos: photos
        };
      }));
      
      // Fetch like counts, comment counts, and user info for each item
      const postsWithDetails = await Promise.all(itemsWithPhotos.map(async (item) => {
        // Get like count
        const { count: likeCount, error: likeCountError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('item_id', item.id);
        
        if (likeCountError) {
          console.error(`Error fetching like count for item ${item.id}:`, likeCountError);
          return { ...item, likeCount: 0, commentCount: 0 };
        }
        
        // Get comment count
        const { count: commentCount, error: commentCountError } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('item_id', item.id);
        
        if (commentCountError) {
          console.error(`Error fetching comment count for item ${item.id}:`, commentCountError);
          return { ...item, likeCount: likeCount || 0, commentCount: 0 };
        }
        
        // Get user profile info
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', item.user_id)
          .single();
        
        // If profile not found, try to get basic info from auth.users
        let username = 'Unknown User';
        let avatarUrl = 'https://via.placeholder.com/150';
        
        if (userProfileError) {
          console.log(`Profile not found for user ${item.user_id}, fetching from auth`);
          
          // Try to get user info from auth.users
          const { data: userData, error: userError } = await supabase.auth
            .admin.getUserById(item.user_id);
          
          if (!userError && userData) {
            username = userData.user.user_metadata?.full_name || userData.user.email.split('@')[0];
            avatarUrl = userData.user.user_metadata?.avatar_url || 'https://via.placeholder.com/150';
          }
        } else if (userProfile) {
          username = userProfile.username || 'User';
          avatarUrl = userProfile.avatar_url || 'https://via.placeholder.com/150';
        }
        
        // Check if current user has liked this post
        const { data: userLike, error: userLikeError } = await supabase
          .from('likes')
          .select('id')
          .eq('item_id', item.id)
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (userLikeError) {
          console.error(`Error checking if user liked item ${item.id}:`, userLikeError);
        }
        
        // Update liked posts state
        setLikedPosts(prev => ({
          ...prev,
          [item.id]: !!userLike
        }));
        
        return {
          ...item,
          likeCount: likeCount || 0,
          commentCount: commentCount || 0,
          isLiked: !!userLike,
          username,
          avatarUrl
        };
      }));
      
      setPosts(postsWithDetails);
    } catch (error) {
      console.error('Error fetching shared items:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load social feed. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchSharedItems();
  };
  
  // Function to handle post tap
  const handlePostTap = (post) => {
    console.log(`Post ${post.id} tapped`);
    navigation.navigate('ItemDetail', { itemId: post.id });
  };
  
  // Function to handle view user profile
  const handleViewUserProfile = (userId) => {
    console.log(`User ${userId} profile tapped`);
    navigation.navigate('ViewProfile', { userId });
  };
  
  // Function to animate the like button
  const animateLike = (postId) => {
    // Create animation if it doesn't exist
    if (!likeAnimations.current[postId]) {
      likeAnimations.current[postId] = new Animated.Value(1);
    }
    
    // Reset to starting value
    likeAnimations.current[postId].setValue(1);
    
    // Smooth pop animation with spring for natural feel
    Animated.sequence([
      // Scale up with spring for bouncy effect
      Animated.spring(likeAnimations.current[postId], {
        toValue: 1.2, // Increase by 20%
        friction: 3, // Lower friction for more bounce
        tension: 40, // Adjust tension for speed
        useNativeDriver: true,
      }),
      // Scale back down with timing for smooth finish
      Animated.timing(likeAnimations.current[postId], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Function to handle like/unlike
  const handleLike = async (postId) => {
    // Prevent multiple taps while processing
    if (likingInProgress[postId]) return;
    
    try {
      setLikingInProgress(prev => ({ ...prev, [postId]: true }));
      
      const isCurrentlyLiked = likedPosts[postId];
      console.log(`${isCurrentlyLiked ? 'Unliking' : 'Liking'} post ${postId}`);
      
      // Optimistically update UI
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !isCurrentlyLiked
      }));
      
      // Animate heart if liking
      if (!isCurrentlyLiked) {
        animateLike(postId);
      }
      
      // Find the post in our state
      const post = posts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }
      
      if (isCurrentlyLiked) {
        // Unlike: Delete the like from the database
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('item_id', postId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Update the post's like count in our state
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likeCount: Math.max(0, p.likeCount - 1) };
          }
          return p;
        }));
        
        console.log(`Successfully unliked post ${postId}`);
      } else {
        // Like: Insert the like into the database
        const { error } = await supabase
          .from('likes')
          .insert({
            item_id: postId,
            user_id: user.id,
          });
        
        if (error) throw error;
        
        // Update the post's like count in our state
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likeCount: p.likeCount + 1 };
          }
          return p;
        }));
        
        console.log(`Successfully liked post ${postId}`);
        
        // Track like event in analytics
        logLikeItem(postId, post.name);
        
        // Send notification to post owner if it's not the current user
        if (post.user_id && post.user_id !== user.id) {
          const username = user.email.split('@')[0]; // Simple username extraction
          sendPushNotification(
            post.user_id,
            'New Like',
            `${username} liked your item: ${post.name}`,
            { type: 'like', itemId: postId }
          );
        }
      }
    } catch (error) {
      console.error('Error handling like:', error.message);
      
      // Revert optimistic update on error
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !likedPosts[postId]
      }));
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update like. Please try again.',
      });
    } finally {
      setLikingInProgress(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  // Function to render a post in the grid
  const renderPost = ({ item }) => {
    // Handle skeleton items
    if (item.isSkeleton) {
      return (
        <View style={[styles.postItem, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
          <Shimmer width={itemSize} height={itemSize} style={styles.postImage} />
          <View style={styles.postOverlay}>
            <View style={styles.postStats}>
              <View style={styles.likeButton}>
                <Shimmer width={16} height={16} style={{ borderRadius: 8 }} />
                <Shimmer width={20} height={14} style={{ marginLeft: 4, borderRadius: 4 }} />
              </View>
              <View style={styles.commentButton}>
                <Shimmer width={14} height={14} style={{ borderRadius: 7 }} />
                <Shimmer width={20} height={14} style={{ marginLeft: 4, borderRadius: 4 }} />
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    // Get the first photo URL or use a placeholder
    const photoUrl = item.photos && item.photos.length > 0
      ? item.photos[0]
      : 'https://via.placeholder.com/150/CCCCCC/888888?text=No+Image';
    
    // Get animation scale for like button
    const scaleAnimation = likeAnimations.current[item.id] || new Animated.Value(1);
    
    return (
      <View style={[styles.postItem, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
        {/* User info header */}
        <TouchableOpacity 
          style={styles.userInfoContainer}
          onPress={() => handleViewUserProfile(item.user_id)}
        >
          <Image 
            source={{ uri: item.avatarUrl }} 
            style={styles.userAvatar}
          />
          <Text style={[styles.username, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
            {item.username}
          </Text>
        </TouchableOpacity>
        
        {/* Post image */}
        <TouchableOpacity 
          onPress={() => handlePostTap(item)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: photoUrl }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        
        <View style={styles.postOverlay}>
          <View style={styles.postStats}>
            <TouchableOpacity 
              style={styles.likeButton}
              onPress={() => handleLike(item.id)}
              disabled={likingInProgress[item.id]}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
                <Ionicons 
                  name={likedPosts[item.id] ? "heart" : "heart-outline"} 
                  size={16} 
                  color={likedPosts[item.id] ? "#ed4956" : "#FFFFFF"} 
                />
              </Animated.View>
              <Text style={[styles.statText, { color: '#FFFFFF' }]}>{item.likeCount}</Text>
            </TouchableOpacity>
            
            <View style={styles.commentButton}>
              <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
              <Text style={[styles.statText, { color: '#FFFFFF' }]}>{item.commentCount}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Generate skeleton items for loading state
  const generateSkeletonItems = () => {
    return Array(12).fill().map((_, index) => ({
      id: `skeleton-${index}`,
      isSkeleton: true
    }));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#000000' : theme.colors.background} />
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background, borderBottomColor: isDarkMode ? '#222222' : theme.colors.divider }]}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Social Feed</Text>
      </View>
      
      <FlatList
        data={loading ? generateSkeletonItems() : posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={[styles.feedContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}
        style={{ backgroundColor: isDarkMode ? '#000000' : theme.colors.background }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={isDarkMode ? '#000000' : theme.colors.background}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={[styles.emptyContainer, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
              <Ionicons name="images-outline" size={50} color={isDarkMode ? '#E0E0E0' : theme.colors.divider} />
              <Text style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>No shared items yet</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: RFPercentage(2.5), // Responsive font size
    fontWeight: '600',
    color: theme.colors.text,
  },
  feedContainer: {
    padding: 8,
    paddingBottom: 20,
    backgroundColor: theme.colors.background,
  },
  postItem: {
    width: itemSize,
    height: itemSize,
    margin: 4,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 6,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#fff',
    fontSize: RFPercentage(1.6), // Responsive font size
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontSize: RFPercentage(2), // Responsive font size
    color: theme.colors.text,
    marginTop: 10,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  username: {
    fontSize: RFPercentage(1.8), // Responsive font size
    fontWeight: '500',
  },
}));

export default FeedScreen;
