import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { Typography, createThemedStyles } from '../theme/styled';

const NotificationsScreen = ({ navigation, route }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  // Check if we need to highlight a specific notification
  const highlightId = route.params?.highlightId;

  // Fetch notifications from the database
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('Fetching notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log(`Fetched ${data.length} notifications`);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load notifications',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // If there's a highlighted notification, scroll to it and mark it as read
  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const notification = notifications.find(n => n.id === highlightId);
      if (notification && !notification.read) {
        markAsRead(highlightId);
      }
    }
  }, [highlightId, notifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id) => {
    try {
      console.log(`Marking notification ${id} as read`);
      
      // Update the database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
      // No need to show a toast for this minor error
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('Marking all notifications as read');
      
      // Get all unread notification IDs
      const unreadIds = notifications
        .filter(notification => !notification.read)
        .map(notification => notification.id);
      
      if (unreadIds.length === 0) return; // Nothing to update
      
      // Update the database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to mark notifications as read',
      });
    }
  };

  const deleteNotification = async (id) => {
    try {
      console.log(`Deleting notification ${id}`);
      
      // Delete from the database
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.filter(notification => notification.id !== id));
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Notification deleted',
      });
    } catch (error) {
      console.error('Error deleting notification:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete notification',
      });
    }
  };

  const handleNotificationAction = (notification) => {
    // Mark as read
    markAsRead(notification.id);
    
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
        // For notifications without a specific action, do nothing (already marked as read)
        break;
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
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      case 'info':
      default:
        return theme.colors.info;
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, 
        { backgroundColor: item.read ? theme.colors.background : theme.colors.backgroundLight },
        highlightId === item.id ? styles.highlightedNotification : null
      ]}
      onPress={() => handleNotificationAction(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getColorForType(item.type) }]}>
        <Ionicons name={getIconForType(item.type)} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Typography.Body style={[styles.notificationTitle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
            {item.title}
          </Typography.Body>
          <Typography.Caption style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
            {formatTime(item.created_at)}
          </Typography.Caption>
        </View>
        <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
          {item.message}
        </Typography.BodySmall>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
      >
        <Ionicons name="close" size={18} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
      </TouchableOpacity>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Notifications</Typography.H2>
        </View>
        
        {notifications.some(notification => !notification.read) && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Typography.BodySmall style={{ color: theme.colors.primary }}>Mark all as read</Typography.BodySmall>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationsList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.background}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={60} color={isDarkMode ? '#E0E0E0' : theme.colors.textSecondary} />
          <Typography.Body style={[styles.emptyText, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>
            No notifications yet
          </Typography.Body>
          <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary, textAlign: 'center' }}>
            We'll notify you when there's something new
          </Typography.BodySmall>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  markAllButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  notificationsList: {
    padding: theme.spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  highlightedNotification: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  notificationTitle: {
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}));

export default NotificationsScreen;
