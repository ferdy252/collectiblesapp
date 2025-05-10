import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { Typography, createThemedStyles } from '../theme/styled';

// Simple Shimmer placeholder component (no animation for now)
const Shimmer = ({ width, height, style }) => {
  return (
    <View style={[{ width, height, backgroundColor: '#E0E0E0', borderRadius: 4 }, style]} />
  );
};

const ViewProfileScreen = ({ navigation, route }) => {
  const { userId } = route.params; // Get the user ID from route params
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  // Fetch user data when component mounts
  useEffect(() => {
    fetchUserData();
  }, [userId]);

  // Function to fetch all user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log(`Fetching profile data for user: ${userId}`);
      
      // Fetch user profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      if (profileData) {
        console.log('Profile data fetched:', profileData);
        
        // Set user profile data
        setUserProfile({
          id: profileData.id,
          username: profileData.full_name || 'User',
          avatar: profileData.avatar_url || 'https://via.placeholder.com/150',
          bio: profileData.bio || 'No bio yet',
        });
        
        // Fetch total items count
        await fetchTotalItems(userId);
        
        // Fetch posts (shared items)
        await fetchUserPosts(userId);
        
        // Fetch follower and following counts
        await fetchFollowerCount(userId);
        await fetchFollowingCount(userId);
        
        // Check if current user is following this user
        if (user) {
          await checkIfFollowing(user.id, userId);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load profile data',
      });
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
      
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching total items:', error.message);
    }
  };

  // Fetch user's shared posts
  const fetchUserPosts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_shared', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Fetched ${data.length} shared items`);
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching shared items:', error.message);
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
      console.error('Error fetching follower count:', error.message);
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
      console.error('Error fetching following count:', error.message);
    }
  };

  // Check if current user is following this user
  const checkIfFollowing = async (currentUserId, targetUserId) => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', currentUserId)
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (error) throw error;
      
      setIsFollowing(!!data);
      console.log(`Is following: ${!!data}`);
    } catch (error) {
      console.error('Error checking follow status:', error.message);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!user) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'You must be logged in to follow users',
      });
      return;
    }
    
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('user_id', userId);
        
        if (error) throw error;
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Unfollowed ${userProfile?.username}`,
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            user_id: userId,
          });
        
        if (error) throw error;
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Now following ${userProfile?.username}`,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update follow status',
      });
    }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  // Render a skeleton loader for the profile section
  const renderProfileSkeleton = () => (
    <View style={[styles.profileSection, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <Shimmer width={80} height={80} style={styles.avatar} />
      <Shimmer width={150} height={20} style={{ marginTop: 8 }} />
      <Shimmer width={200} height={16} style={{ marginTop: 8 }} />
      <View style={styles.statsRow}>
        <Shimmer width={50} height={40} />
        <Shimmer width={50} height={40} />
        <Shimmer width={50} height={40} />
      </View>
    </View>
  );

  // Render a post item
  const renderPostItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.postItem}
      onPress={() => navigation.navigate('ViewItem', { itemId: item.id })}
    >
      <Image 
        source={{ uri: item.photos && item.photos[0] ? item.photos[0] : 'https://via.placeholder.com/150' }}
        style={styles.postImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  // Show loading indicator while fetching data
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
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
          <Text style={[styles.bio, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>{userProfile?.bio}</Text>
          
          {/* Follow button (only show if viewing someone else's profile) */}
          {user && user.id !== userId && (
            <TouchableOpacity 
              style={[styles.followButton, { backgroundColor: isFollowing ? isDarkMode ? '#333333' : '#E0E0E0' : theme.colors.primary }]}
              onPress={handleFollowToggle}
            >
              <Text style={[styles.followButtonText, { color: isFollowing ? isDarkMode ? '#FFFFFF' : '#333333' : '#FFFFFF' }]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{totalItems}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{followerCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>Following</Text>
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
            color={activeTab === 'posts' ? theme.colors.primary : (isDarkMode ? '#E0E0E0' : theme.colors.textSecondary)} 
          />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'posts' ? theme.colors.primary : (isDarkMode ? '#E0E0E0' : theme.colors.textSecondary) }
          ]}>Posts</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content section */}
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={isDarkMode ? '#FFFFFF' : theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={isDarkMode ? '#444444' : '#CCCCCC'} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#AAAAAA' : theme.colors.textSecondary }]}>
              No posts yet
            </Text>
          </View>
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
  },
  backButton: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginHorizontal: 20,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  contentContainer: {
    paddingTop: 2,
  },
  postItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
}));

export default ViewProfileScreen;
