import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
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

const FindUsersScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState({});
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  // Search for users when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  // Function to search for users
  const searchUsers = async () => {
    try {
      setLoading(true);
      console.log(`Searching for users with query: ${searchQuery}`);
      
      // Search for users in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio')
        .ilike('username', `%${searchQuery}%`)
        .limit(20);
      
      if (error) throw error;
      
      console.log(`Found ${data.length} users`);
      
      // Filter out current user
      const filteredUsers = data.filter(u => u.id !== user.id);
      setUsers(filteredUsers);
      
      // Check follow status for each user
      await checkFollowStatus(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to search for users',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is following each user in the list
  const checkFollowStatus = async (userList) => {
    try {
      const statusMap = {};
      
      for (const targetUser of userList) {
        const { data, error } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('user_id', targetUser.id)
          .maybeSingle();
        
        if (error) throw error;
        
        statusMap[targetUser.id] = !!data;
      }
      
      setFollowStatus(statusMap);
    } catch (error) {
      console.error('Error checking follow status:', error.message);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async (targetUserId) => {
    try {
      const isFollowing = followStatus[targetUserId];
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('user_id', targetUserId);
        
        if (error) throw error;
        
        // Update local state
        setFollowStatus(prev => ({
          ...prev,
          [targetUserId]: false
        }));
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Unfollowed user',
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            user_id: targetUserId,
          });
        
        if (error) throw error;
        
        // Update local state
        setFollowStatus(prev => ({
          ...prev,
          [targetUserId]: true
        }));
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Now following user',
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

  // Handle viewing a user's profile
  const handleViewProfile = (userId) => {
    navigation.navigate('ViewProfile', { userId });
  };

  // Render a user item
  const renderUserItem = ({ item }) => (
    <View style={[styles.userItem, { backgroundColor: isDarkMode ? '#111111' : '#FFFFFF' }]}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => handleViewProfile(item.id)}
      >
        <Image 
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }} 
          style={styles.avatar}
        />
        <View style={styles.userDetails}>
          <Text style={[styles.username, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
            {item.username || 'User'}
          </Text>
          <Text 
            style={[styles.bio, { color: isDarkMode ? '#AAAAAA' : theme.colors.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.bio || 'No bio yet'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.followButton, 
          { backgroundColor: followStatus[item.id] ? isDarkMode ? '#333333' : '#E0E0E0' : theme.colors.primary }
        ]}
        onPress={() => handleFollowToggle(item.id)}
      >
        <Text 
          style={[
            styles.followButtonText, 
            { color: followStatus[item.id] ? isDarkMode ? '#FFFFFF' : '#333333' : '#FFFFFF' }
          ]}
        >
          {followStatus[item.id] ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Find Users</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Search input */}
      <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#111111' : '#F5F5F5' }]}>
        <Ionicons name="search" size={20} color={isDarkMode ? '#AAAAAA' : '#666666'} />
        <TextInput
          style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}
          placeholder="Search for users..."
          placeholderTextColor={isDarkMode ? '#777777' : '#999999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={isDarkMode ? '#AAAAAA' : '#666666'} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <>
                  <Ionicons name="people-outline" size={48} color={isDarkMode ? '#444444' : '#CCCCCC'} />
                  <Text style={[styles.emptyText, { color: isDarkMode ? '#AAAAAA' : theme.colors.textSecondary }]}>
                    No users found
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="search-outline" size={48} color={isDarkMode ? '#444444' : '#CCCCCC'} />
                  <Text style={[styles.emptyText, { color: isDarkMode ? '#AAAAAA' : theme.colors.textSecondary }]}>
                    Search for users to follow
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
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

export default FindUsersScreen;
